import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ChevronDown, ChevronRight, Copy, Loader2, Link } from "lucide-react";
import { format } from "date-fns";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";

interface AnosimSms {
  messageSender: string;
  messageDate: string;
  messageText: string;
}

interface AnosimData {
  number: string;
  country: string;
  rentalType: string;
  service: string;
  startDate: string;
  endDate: string;
  state: string;
  sms: AnosimSms[];
}

interface PhoneEntry {
  id: string;
  api_url: string | null;
  provider: "anosim" | "smsbot";
  rental_id: string | null;
  label: string | null;
  created_at: string;
}

interface IdentAssignment {
  id: string;
  employment_contracts: { first_name: string | null; last_name: string | null } | null;
  orders: { title: string } | null;
}

function PhoneRow({ entry, onDelete }: { entry: PhoneEntry; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const identifier = entry.provider === "smsbot" ? `smsbot://${entry.rental_id}` : (entry.api_url ?? "");

  const { data, isLoading, isError } = useQuery<AnosimData>({
    queryKey: ["phone-data", entry.provider, identifier],
    queryFn: async () => {
      if (entry.provider === "smsbot") {
        const { data, error } = await supabase.functions.invoke("smsbot-proxy", {
          body: { rentalId: entry.rental_id },
        });
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.functions.invoke("anosim-proxy", {
        body: { url: entry.api_url },
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  const { data: assignments = [] } = useQuery<IdentAssignment[]>({
    queryKey: ["phone_assignments", identifier],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ident_sessions")
        .select("id, employment_contracts:contract_id(first_name, last_name), orders:order_id(title)")
        .eq("phone_api_url", identifier);
      if (error) throw error;
      return (data as any) ?? [];
    },
  });

  const copyNumber = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data?.number) {
      navigator.clipboard.writeText(data.number);
      toast({ title: "Kopiert", description: data.number });
    }
  };

  const stateBadge = (state: string) => {
    switch (state?.toLowerCase()) {
      case "active":
        return <Badge className="bg-green-600 hover:bg-green-700 text-white">{state}</Badge>;
      case "ended":
        return <Badge variant="destructive">{state}</Badge>;
      default:
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">{state}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={10} className="text-center text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />Laden…
        </TableCell>
      </TableRow>
    );
  }

  if (isError || !data) {
    return (
      <TableRow>
        <TableCell colSpan={9} className="text-destructive">Fehler beim Laden</TableCell>
        <TableCell>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eintrag löschen?</AlertDialogTitle>
                <AlertDialogDescription>Dieser API-Link wird unwiderruflich entfernt.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(entry.id)}>Löschen</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TableCell>
      </TableRow>
    );
  }

  const sortedSms = [...(data.sms || [])]
    .sort((a, b) => new Date(b.messageDate).getTime() - new Date(a.messageDate).getTime())
    .slice(0, 10);

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <>
        <CollapsibleTrigger asChild>
          <TableRow className="cursor-pointer">
            <TableCell className="w-8">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <button onClick={copyNumber} className="flex items-center gap-1 hover:text-primary transition-colors" title="Kopieren">
                  {data.number} <Copy className="h-3 w-3 text-muted-foreground" />
                </button>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  {entry.provider}
                </Badge>
              </div>
            </TableCell>
            <TableCell>{data.country}</TableCell>
            <TableCell>{data.rentalType}</TableCell>
            <TableCell>{data.service}</TableCell>
            <TableCell>
              {assignments.length === 0 ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {assignments.map((a) => {
                    const name = [a.employment_contracts?.first_name, a.employment_contracts?.last_name].filter(Boolean).join(" ");
                    const order = a.orders?.title;
                    const label = [name, order].filter(Boolean).join(" · ") || "–";
                    return (
                      <Badge key={a.id} variant="secondary" className="text-xs whitespace-nowrap">
                        {label}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </TableCell>
            <TableCell>{format(new Date(data.startDate), "dd.MM.yyyy HH:mm")}</TableCell>
            <TableCell>{format(new Date(data.endDate), "dd.MM.yyyy HH:mm")}</TableCell>
            <TableCell>{stateBadge(data.state)}</TableCell>
            <TableCell>
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    const val = entry.provider === "smsbot" ? (entry.rental_id ?? "") : (entry.api_url ?? "");
                    navigator.clipboard.writeText(val);
                    toast({ title: "Kopiert", description: entry.provider === "smsbot" ? "Rental-ID wurde kopiert." : "API-Link wurde kopiert." });
                  }}
                  title={entry.provider === "smsbot" ? "Rental-ID kopieren" : "Original-Link kopieren"}
                >
                  <Link className="h-4 w-4 text-muted-foreground" />
                </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eintrag löschen?</AlertDialogTitle>
                    <AlertDialogDescription>Die Telefonnummer {data.number} wird aus der Liste entfernt.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(entry.id)}>Löschen</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              </div>
            </TableCell>
          </TableRow>
        </CollapsibleTrigger>
        <CollapsibleContent asChild>
          <tr>
            <td colSpan={10} className="bg-muted/30 px-8 py-4">
              {sortedSms.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine SMS empfangen.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Letzte SMS ({sortedSms.length})</p>
                  {sortedSms.map((sms, i) => (
                    <div key={i} className="rounded-md border bg-background p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{sms.messageSender}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(sms.messageDate), "dd.MM.yyyy HH:mm:ss")}
                        </span>
                      </div>
                      <p className="text-foreground">{sms.messageText}</p>
                    </div>
                  ))}
                </div>
              )}
            </td>
          </tr>
        </CollapsibleContent>
      </>
    </Collapsible>
  );
}

export default function AdminTelefonnummern() {
  const [url, setUrl] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeBrandingId, ready } = useBrandingFilter();

  const { data: entries = [], isLoading } = useQuery<PhoneEntry[]>({
    queryKey: ["phone_numbers", activeBrandingId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("phone_numbers" as any)
        .select("*")
        .eq("branding_id", activeBrandingId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (apiUrl: string) => {
      const { error } = await supabase.from("phone_numbers" as any).insert({ api_url: apiUrl, branding_id: activeBrandingId } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone_numbers"] });
      setUrl("");
      toast({ title: "Hinzugefügt", description: "Telefonnummer wurde hinzugefügt." });
    },
    onError: () => toast({ title: "Fehler", description: "Konnte nicht hinzugefügt werden.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("phone_numbers" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone_numbers"] });
      toast({ title: "Gelöscht" });
    },
  });

  const isValidUrl = (u: string) => {
    const l = u.toLowerCase();
    return l.includes("anosim.net/api/v1/orderbookingshare?token=") || l.includes("anosim.net/share/orderbooking?token=");
  };

  const handleAdd = () => {
    if (!isValidUrl(url)) {
      toast({ title: "Ungültiger Link", description: "Der Link muss ein anosim.net Share-Link sein.", variant: "destructive" });
      return;
    }
    const apiUrl = url.trim().replace("/share/orderbooking?", "/api/v1/orderbookingshare?");
    addMutation.mutate(apiUrl);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight text-foreground">Telefonnummern</h2>

      <div className="flex gap-2 max-w-2xl">
        <Input
          placeholder="https://anosim.net/api/v1/orderbookingshare?token=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={addMutation.isPending}>
          <Plus className="h-4 w-4 mr-1" /> Hinzufügen
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Laden…</div>
      ) : entries.length === 0 ? (
        <p className="text-muted-foreground">Noch keine Telefonnummern hinzugefügt.</p>
      ) : (
        <div className="premium-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Nummer</TableHead>
                <TableHead>Land</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Zugewiesen an</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Ende</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <PhoneRow key={entry.id} entry={entry} onDelete={(id) => deleteMutation.mutate(id)} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
