import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Eye, Users, MoreVertical, Pencil, Trash2, Star, Clock, PackageOpen, Video, Paperclip, Copy, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useState } from "react";
import { motion } from "framer-motion";
import AssignmentDialog from "@/components/admin/AssignmentDialog";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";

const typeLabel: Record<string, string> = {
  bankdrop: "Bankdrop",
  exchanger: "Exchanger",
  platzhalter: "Platzhalter",
  andere: "Andere",
};

export default function AdminAuftraege() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { activeBrandingId, ready } = useBrandingFilter();
  const [assignOrder, setAssignOrder] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("alle");


  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", activeBrandingId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("branding_id", activeBrandingId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: assignmentCounts } = useQuery({
    queryKey: ["order_assignments", "counts_by_order", activeBrandingId, orders?.length ?? 0],
    enabled: ready && !!orders,
    queryFn: async () => {
      const counts: Record<string, number> = {};
      const orderIds = (orders ?? []).map((o: any) => o.id);
      if (!orderIds.length) return counts;
      const pageSize = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("order_assignments")
          .select("order_id")
          .in("order_id", orderIds)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const batch = data ?? [];
        batch.forEach((a) => { counts[a.order_id] = (counts[a.order_id] || 0) + 1; });
        if (batch.length < pageSize) break;
        from += pageSize;
      }
      return counts;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Auftrag gelöscht" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Aufträge</h2>
          <p className="text-muted-foreground mt-1">Alle Aufträge verwalten und Mitarbeiter zuweisen.</p>
        </div>
        <Button onClick={() => navigate("/admin/auftraege/neu")}>
          <Plus className="h-4 w-4 mr-2" /> Auftrag hinzufügen
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Aufträge suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {(() => {
        const typeCounts: Record<string, number> = { alle: (orders ?? []).length };
        (orders ?? []).forEach((o: any) => {
          const t = o.order_type || "andere";
          typeCounts[t] = (typeCounts[t] || 0) + 1;
        });
        const tabs: { value: string; label: string }[] = [
          { value: "alle", label: "Alle" },
          { value: "bankdrop", label: "Bankdrop" },
          { value: "exchanger", label: "Exchanger" },
          { value: "platzhalter", label: "Platzhalter" },
          { value: "andere", label: "Andere" },
        ];
        return (
          <Tabs value={typeFilter} onValueChange={setTypeFilter}>
            <TabsList className="flex flex-wrap h-auto">
              {tabs.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="gap-2">
                  {t.label}
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                    {typeCounts[t.value] || 0}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        );
      })()}

      {(() => {
        const q = search.trim().toLowerCase();
        const byType = typeFilter === "alle"
          ? (orders ?? [])
          : (orders ?? []).filter((o: any) => (o.order_type || "andere") === typeFilter);
        const filteredOrders = !q ? byType : byType.filter((o: any) => {
          const typeStr = (typeLabel[o.order_type] || o.order_type || "").toLowerCase();
          return (
            (o.title || "").toLowerCase().includes(q) ||
            (o.description || "").toLowerCase().includes(q) ||
            typeStr.includes(q)
          );
        });
        return isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Laden...</div>
      ) : !orders?.length ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-xl text-muted-foreground gap-3">
          <PackageOpen className="h-10 w-10" />
          <p className="text-sm">Keine Aufträge vorhanden</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/auftraege/neu")}>
            <Plus className="h-4 w-4 mr-1" /> Ersten Auftrag erstellen
          </Button>
        </div>
      ) : !filteredOrders.length ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-xl text-muted-foreground gap-3">
          <Search className="h-10 w-10" />
          <p className="text-sm">
            {q ? `Keine Aufträge für „${search}" gefunden` : "Keine Aufträge in dieser Kategorie"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredOrders.map((o: any, i: number) => {
            const count = assignmentCounts?.[o.id] || 0;

            return (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
                className="premium-card p-5 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-base truncate">{o.title}</h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0 text-xs">
                        {o.reward}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {typeLabel[o.order_type] || o.order_type}
                      </Badge>
                      {o.is_starter_job && (
                        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 text-xs">
                          <Star className="h-3 w-3 mr-1 fill-amber-500 text-amber-500" />
                          Starter-Job
                        </Badge>
                      )}
                      {o.is_videochat && (
                        <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300 text-xs">
                          <Video className="h-3 w-3 mr-1" />
                          Video-Chat
                        </Badge>
                      )}
                      {Array.isArray(o.required_attachments) && (o.required_attachments as any[]).length > 0 && (
                        <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-300 text-xs">
                          <Paperclip className="h-3 w-3 mr-1" />
                          Anhänge erforderlich
                        </Badge>
                      )}
                      {count > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> {count}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/admin/auftraege/${o.id}/bearbeiten`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ansehen</TooltipContent>
                    </Tooltip>

                    <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => setAssignOrder(o)}>
                      <Users className="h-4 w-4" /> Zuweisen
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/admin/auftraege/${o.id}/bearbeiten`)}>
                          <Pencil className="h-4 w-4 mr-2" /> Bearbeiten
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/admin/auftraege/neu?copy=${o.id}`)}>
                          <Copy className="h-4 w-4 mr-2" /> Kopieren
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteMutation.mutate(o.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Body */}
                {o.description && (
                  <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-3 mb-3">
                    {o.description}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs text-muted-foreground">
                  {o.estimated_hours ? (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {o.estimated_hours}h geschätzt
                    </span>
                  ) : <span />}
                  <span>Erstellt: {format(new Date(o.created_at), "dd.MM.yyyy")}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      );
      })()}


      {assignOrder && (
        <AssignmentDialog
          open={!!assignOrder}
          onOpenChange={(v) => { if (!v) setAssignOrder(null); }}
          mode="order"
          sourceId={assignOrder.id}
          sourceLabel={assignOrder.title}
          brandingId={activeBrandingId ?? undefined}
        />
      )}
    </div>
  );
}
