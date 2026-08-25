import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { tryAutoComplete } from "./AdminAnhaengeDetail";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const groupStatus = (statuses: string[]) => {
  if (statuses.every((s) => s === "genehmigt"))
    return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">Genehmigt</Badge>;
  if (statuses.some((s) => s === "abgelehnt"))
    return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">Abgelehnt</Badge>;
  return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">Eingereicht</Badge>;
};

export default function AdminAnhaenge() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeBrandingId, ready } = useBrandingFilter();
  const [search, setSearch] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [rejectTarget, setRejectTarget] = useState<string[] | null>(null);

  const { data: groups, isLoading, error } = useQuery({
    queryKey: ["admin-order-attachments-grouped", activeBrandingId],
    enabled: ready,
    queryFn: async () => {
      const { data: contracts } = await supabase
        .from("employment_contracts")
        .select("id, first_name, last_name")
        .eq("branding_id", activeBrandingId!);
      const contractIds = (contracts ?? []).map((c) => c.id);
      if (!contractIds.length) return [];

      // IDs chunken, damit die Request-URL nicht zu lang wird (400 Bad Request)
      const chunks: string[][] = [];
      for (let i = 0; i < contractIds.length; i += 100) chunks.push(contractIds.slice(i, i + 100));

      const results = await Promise.all(
        chunks.map(async (ids) => {
          const { data, error } = await supabase
            .from("order_attachments" as any)
            .select("*, orders(title, required_attachments, order_type)")
            .in("contract_id", ids)
            .neq("status", "entwurf")
            .order("created_at", { ascending: false });
          if (error) throw error;
          return (data ?? []) as any[];
        })
      );
      const data = results.flat();

      const contractMap = Object.fromEntries(
        (contracts ?? []).map((c) => [c.id, `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim()])
      );

      const map = new Map<string, any>();

      for (const a of (data ?? []) as any[]) {
        const key = `${a.contract_id}__${a.order_id}`;
        if (!map.has(key)) {
          const reqAtt = a.orders?.required_attachments;
          const requiredCount = Array.isArray(reqAtt) ? reqAtt.length : 0;
          map.set(key, {
            contract_id: a.contract_id,
            order_id: a.order_id,
            employee_name: contractMap[a.contract_id] || "Unbekannt",
            order_title: a.orders?.title ?? "–",
            order_type: a.orders?.order_type ?? "",
            required_count: requiredCount,
            uploaded_count: 0,
            statuses: [] as string[],
            pending_ids: [] as string[],
            latest_created_at: a.created_at,
          });
        }
        const g = map.get(key)!;
        g.uploaded_count += 1;
        g.statuses.push(a.status);
        if (a.status === "eingereicht") g.pending_ids.push(a.id);
        if (a.created_at > g.latest_created_at) g.latest_created_at = a.created_at;
      }

      return Array.from(map.values());
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async ({ ids, orderId, contractId }: { ids: string[]; orderId: string; contractId: string }) => {
      for (const id of ids) {
        const { error } = await supabase
          .from("order_attachments" as any)
          .update({ status: "genehmigt", reviewed_at: new Date().toISOString() } as any)
          .eq("id", id);
        if (error) throw error;
      }
      return tryAutoComplete(orderId, contractId);
    },
    onSuccess: (completed) => {
      queryClient.invalidateQueries({ queryKey: ["admin-order-attachments-grouped"] });
      queryClient.invalidateQueries({ queryKey: ["admin-attachment-detail"] });
      if (completed) {
        queryClient.invalidateQueries({ queryKey: ["admin-bewertungen"] });
        toast({ title: "Alle Anhänge genehmigt — Auftrag abgeschlossen und Prämie gutgeschrieben!" });
      } else {
        toast({ title: "Alle Anhänge genehmigt" });
      }
    },
    onError: (e: Error) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        const { error } = await supabase
          .from("order_attachments" as any)
          .update({ status: "abgelehnt", reviewed_at: new Date().toISOString() } as any)
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order-attachments-grouped"] });
      queryClient.invalidateQueries({ queryKey: ["admin-attachment-detail"] });
      toast({ title: "Alle Anhänge abgelehnt" });
    },
    onError: (e: Error) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });

  const isMutating = bulkApproveMutation.isPending || bulkRejectMutation.isPending;

  const searchLower = search.trim().toLowerCase();
  const filtered = (groups ?? [])
    .filter((g: any) => !searchLower || g.employee_name.toLowerCase().includes(searchLower))
    .filter((g: any) => {
      if (orderTypeFilter === "all") return true;
      if (orderTypeFilter === "andere") return !["bankdrop", "exchanger", "platzhalter"].includes(g.order_type);
      return g.order_type === orderTypeFilter;
    });

  const pending = filtered.filter((g: any) => g.statuses.some((s: string) => s === "eingereicht") && !g.statuses.some((s: string) => s === "abgelehnt"));
  const approved = filtered.filter((g: any) => g.statuses.every((s: string) => s === "genehmigt"));
  const rejected = filtered.filter((g: any) => g.statuses.some((s: string) => s === "abgelehnt"));

  const renderTable = (rows: any[], showActions: boolean) => (
    <div className="premium-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mitarbeiter</TableHead>
            <TableHead>Auftrag</TableHead>
            <TableHead>Hochgeladen</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Eingereicht am</TableHead>
            {showActions && <TableHead>Aktionen</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={showActions ? 6 : 5} className="text-center py-8 text-muted-foreground">Laden...</TableCell>
            </TableRow>
          ) : error ? (
            <TableRow>
              <TableCell colSpan={showActions ? 6 : 5} className="text-center py-8 text-destructive">
                Fehler beim Laden der Anhänge: {(error as Error).message}
              </TableCell>
            </TableRow>
          ) : !rows.length ? (

            <TableRow>
              <TableCell colSpan={showActions ? 6 : 5} className="text-center py-8 text-muted-foreground">Keine Anhänge vorhanden</TableCell>
            </TableRow>
          ) : (
            rows.map((g: any) => (
              <TableRow
                key={`${g.contract_id}__${g.order_id}`}
                className="cursor-pointer"
                onClick={() => navigate(`/admin/anhaenge/${g.contract_id}/${g.order_id}`)}
              >
                <TableCell className="font-medium">{g.employee_name}</TableCell>
                <TableCell>{g.order_title}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {g.uploaded_count}/{g.required_count || g.uploaded_count}
                  </Badge>
                </TableCell>
                <TableCell>{groupStatus(g.statuses)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(g.latest_created_at), "dd.MM.yyyy HH:mm")}
                </TableCell>
                {showActions && (
                  <TableCell>
                    {g.pending_ids.length > 0 ? (
                      <TooltipProvider delayDuration={300}>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                disabled={isMutating}
                                onClick={() => bulkApproveMutation.mutate({ ids: g.pending_ids, orderId: g.order_id, contractId: g.contract_id })}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Alle genehmigen</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/5"
                                disabled={isMutating}
                                onClick={() => setRejectTarget(g.pending_ids)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Alle ablehnen</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Anhänge</h2>
        <p className="text-muted-foreground mt-1">Eingereichte Dokumente prüfen und genehmigen.</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Name suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Alle Typen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            <SelectItem value="bankdrop">Bankdrop</SelectItem>
            <SelectItem value="exchanger">Exchanger</SelectItem>
            <SelectItem value="platzhalter">Platzhalter</SelectItem>
            <SelectItem value="andere">Andere</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="eingereicht">
        <TabsList>
          <TabsTrigger value="eingereicht">Eingereicht ({pending.length})</TabsTrigger>
          <TabsTrigger value="genehmigt">Genehmigt ({approved.length})</TabsTrigger>
          <TabsTrigger value="abgelehnt">Abgelehnt ({rejected.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="eingereicht">{renderTable(pending, true)}</TabsContent>
        <TabsContent value="genehmigt">{renderTable(approved, false)}</TabsContent>
        <TabsContent value="abgelehnt">{renderTable(rejected, false)}</TabsContent>
      </Tabs>

      <AlertDialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) setRejectTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anhänge ablehnen?</AlertDialogTitle>
            <AlertDialogDescription>
              Alle eingereichten Anhänge dieser Gruppe werden abgelehnt. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (rejectTarget) bulkRejectMutation.mutate(rejectTarget);
                setRejectTarget(null);
              }}
            >
              Ablehnen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
