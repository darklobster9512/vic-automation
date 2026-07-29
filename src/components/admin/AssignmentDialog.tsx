import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sendEmail } from "@/lib/sendEmail";
import { sendSms } from "@/lib/sendSms";
import { buildBrandingUrl } from "@/lib/buildBrandingUrl";
import { resolveContractBrandingBatch } from "@/lib/resolveContractBranding";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "order" | "contract";
  sourceId: string;
  sourceLabel: string;
  brandingId?: string;
}

export default function AssignmentDialog({ open, onOpenChange, mode, sourceId, sourceLabel, brandingId }: AssignmentDialogProps) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  // Reset search when dialog opens/closes
  useEffect(() => { setSearch(""); }, [open]);

  // Load existing assignments
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["order_assignments", mode, sourceId],
    enabled: open,
    queryFn: async () => {
      const col = mode === "order" ? "order_id" : "contract_id";
      const { data, error } = await supabase
        .from("order_assignments")
        .select("order_id, contract_id")
        .eq(col, sourceId);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Load assignment counts per contract (for mode="order")
  const { data: assignmentCounts } = useQuery({
    queryKey: ["order_assignments", "counts_by_contract"],
    enabled: open && mode === "order",
    queryFn: async () => {
      const counts: Record<string, number> = {};
      const pageSize = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("order_assignments")
          .select("contract_id")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const batch = data ?? [];
        batch.forEach((a) => {
          counts[a.contract_id] = (counts[a.contract_id] || 0) + 1;
        });
        if (batch.length < pageSize) break;
        from += pageSize;
      }
      return counts;
    },
  });

  // Load items to pick from
  const { data: items, isLoading: loadingItems } = useQuery({
    queryKey: [mode === "order" ? "assignable_contracts_v2" : "assignable_orders", brandingId],
    enabled: open,
    queryFn: async () => {
      if (mode === "order") {
        let query = supabase
          .from("employment_contracts")
          .select("id, first_name, last_name, email, employment_type, template_id")
          .in("status", ["offen", "eingereicht", "genehmigt", "unterzeichnet"])
          .not("first_name", "is", null);
        if (brandingId) query = query.eq("branding_id", brandingId);
        const { data, error } = await query;
        if (error) throw error;

        // Batch-load template titles for all contracts that have a template_id
        const templateIds = (data ?? []).map((c) => c.template_id).filter(Boolean) as string[];
        let templateMap: Record<string, string> = {};
        if (templateIds.length > 0) {
          const { data: templates } = await supabase
            .from("contract_templates")
            .select("id, title")
            .in("id", templateIds);
          (templates ?? []).forEach((t) => { templateMap[t.id] = t.title; });
        }

        return (data ?? []).map((c) => {
          const templateTitle = c.template_id ? templateMap[c.template_id] ?? null : null;
          return {
            id: c.id,
            label: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim(),
            sublabel: c.email ?? "",
            employmentType: c.employment_type ?? null,
            templateTitle,
          };
        });
      } else {
        let query = supabase
          .from("orders")
          .select("id, order_number, title, provider");
        if (brandingId) query = query.eq("branding_id", brandingId);
        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []).map((o) => ({
          id: o.id,
          label: `${o.order_number} – ${o.title}`,
          sublabel: o.provider ?? "",
          employmentType: null as string | null,
          templateTitle: null as string | null,
        }));
      }
    },
  });

  // Seed selected from existing assignments
  useEffect(() => {
    if (existing) {
      const ids = existing.map((a) => (mode === "order" ? a.contract_id : a.order_id));
      setSelected(new Set(ids));
    }
  }, [existing, mode]);

  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (!search.trim()) return items;
    const term = search.toLowerCase().trim();
    return items.filter((item) =>
      item.label.toLowerCase().includes(term) || item.sublabel.toLowerCase().includes(term)
    );
  }, [items, search]);

  // Calculate removed count for footer hint
  const existingIds = new Set(existing?.map((a) => (mode === "order" ? a.contract_id : a.order_id)) ?? []);
  const removedCount = Array.from(existingIds).filter((id) => !selected.has(id)).length;
  const addedCount = Array.from(selected).filter((id) => !existingIds.has(id)).length;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const existingIdSet = new Set(existing?.map((a) => (mode === "order" ? a.contract_id : a.order_id)) ?? []);
      const newlyAdded = Array.from(selected).filter((id) => !existingIdSet.has(id));
      const removed = Array.from(existingIdSet).filter((id) => !selected.has(id));

      // Delete removed assignments — inkl. aller zugehörigen Daten (Ident, Bewertung, Anhänge, Termine)
      for (const targetId of removed) {
        const orderId = mode === "order" ? sourceId : targetId;
        const contractId = mode === "order" ? targetId : sourceId;

        // Storage-Dateien der Anhänge entfernen
        const { data: atts } = await supabase
          .from("order_attachments")
          .select("file_url")
          .eq("order_id", orderId)
          .eq("contract_id", contractId);
        const paths = (atts ?? [])
          .map((a: any) => {
            const marker = "/order-attachments/";
            const idx = (a.file_url || "").indexOf(marker);
            return idx === -1 ? null : decodeURIComponent(a.file_url.slice(idx + marker.length));
          })
          .filter(Boolean) as string[];
        if (paths.length > 0) {
          await supabase.storage.from("order-attachments").remove(paths);
        }

        const { error: delErr } = await supabase.rpc("unassign_order" as any, {
          _order_id: orderId,
          _contract_id: contractId,
        });
        if (delErr) throw delErr;
      }


      // Insert newly added assignments
      if (newlyAdded.length > 0) {
        const rows = newlyAdded.map((targetId) =>
          mode === "order"
            ? { order_id: sourceId, contract_id: targetId }
            : { order_id: targetId, contract_id: sourceId }
        );
        const { error: insErr } = await supabase
          .from("order_assignments")
          .insert(rows);
        if (insErr) throw insErr;
      }

      // Send emails for newly assigned employees
      if (mode === "order" && newlyAdded.length > 0) {
        const { data: order } = await supabase
          .from("orders")
          .select("title, order_number, reward")
          .eq("id", sourceId)
          .single();

        const { data: contracts } = await supabase
          .from("employment_contracts")
          .select("id, email, first_name, last_name, phone, user_id, branding_id")
          .in("id", newlyAdded);

        // Resolve branding: profiles.branding_id first, then contract.branding_id
        const brandingMap = await resolveContractBrandingBatch(contracts ?? []);

        const { data: tpl } = await supabase.from("sms_templates" as any).select("message").eq("event_type", "auftrag_zugewiesen").single();

        for (const c of contracts ?? []) {
          const effectiveBrandingId = brandingMap[c.id] ?? null;

          // E-Mail-Versand für "auftrag_zugewiesen" deaktiviert — nur SMS
          if (c.phone) {
            const name = `${c.first_name || ""} ${c.last_name || ""}`.trim();
            const smsText = (tpl as any)?.message
              ? (tpl as any).message.replace("{name}", name).replace("{auftrag}", order?.title || "")
              : `Hallo ${name}, Ihnen wurde ein neuer Auftrag zugewiesen: ${order?.title || ""}`;
            let smsSender: string | undefined;
            if (effectiveBrandingId) {
              const { data: branding } = await supabase.from("brandings").select("sms_sender_name" as any).eq("id", effectiveBrandingId).single();
              smsSender = (branding as any)?.sms_sender_name || undefined;
            }
            await sendSms({ to: c.phone, text: smsText, event_type: "auftrag_zugewiesen", recipient_name: name, from: smsSender, branding_id: effectiveBrandingId });
          }
        }
      }

      // Contract mode: multiple orders assigned to ONE employee → 1 Sammel-SMS (or 1 einzel SMS)
      if (mode === "contract" && newlyAdded.length > 0) {
        const { data: contract } = await supabase
          .from("employment_contracts")
          .select("id, email, first_name, last_name, phone, user_id, branding_id")
          .eq("id", sourceId)
          .single();

        if (contract?.phone) {
          const brandingMap = await resolveContractBrandingBatch([contract]);
          const effectiveBrandingId = brandingMap[contract.id] ?? null;
          const name = `${contract.first_name || ""} ${contract.last_name || ""}`.trim();

          let smsText: string;
          let eventType: string;

          if (newlyAdded.length === 1) {
            const { data: order } = await supabase
              .from("orders")
              .select("title")
              .eq("id", newlyAdded[0])
              .single();
            const { data: tpl } = await supabase.from("sms_templates" as any).select("message").eq("event_type", "auftrag_zugewiesen").single();
            eventType = "auftrag_zugewiesen";
            smsText = (tpl as any)?.message
              ? (tpl as any).message.replace("{name}", name).replace("{auftrag}", order?.title || "")
              : `Hallo ${name}, Ihnen wurde ein neuer Auftrag zugewiesen: ${order?.title || ""}`;
          } else {
            const { data: tpl } = await supabase.from("sms_templates" as any).select("message").eq("event_type", "auftraege_zugewiesen_sammel").single();
            eventType = "auftraege_zugewiesen_sammel";
            smsText = (tpl as any)?.message
              ? (tpl as any).message.replace("{name}", name).replace("{anzahl}", String(newlyAdded.length))
              : `Hallo ${name}, es sind ${newlyAdded.length} neue Auftraege fuer Sie verfuegbar. Jetzt im Mitarbeiterportal ansehen.`;
          }

          let smsSender: string | undefined;
          if (effectiveBrandingId) {
            const { data: branding } = await supabase.from("brandings").select("sms_sender_name" as any).eq("id", effectiveBrandingId).single();
            smsSender = (branding as any)?.sms_sender_name || undefined;
          }
          await sendSms({ to: contract.phone, text: smsText, event_type: eventType, recipient_name: name, from: smsSender, branding_id: effectiveBrandingId });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["mitarbeiter"] });
      queryClient.invalidateQueries({ queryKey: ["order_assignments"] });
      toast({ title: "Zuweisungen gespeichert" });
      onOpenChange(false);
    },
    onError: (e: Error) => {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    },
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const isLoading = loadingExisting || loadingItems;
  const title = mode === "order" ? "Mitarbeiter zuweisen" : "Aufträge zuweisen";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-fit min-w-[28rem] max-w-[95vw] p-0 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary to-primary/60" />
        <div className="px-6 pt-5">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{sourceLabel}</DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-2">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Laden...</div>
        ) : !items?.length ? (
          <div className="py-8 text-center text-muted-foreground">
            {mode === "order" ? "Keine Mitarbeiter für dieses Branding vorhanden." : "Keine Aufträge vorhanden."}
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={mode === "order" ? "Name oder E-Mail suchen..." : "Auftragsnr., Titel oder Anbieter suchen..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {(() => {
              const renderRow = (item: typeof filteredItems[number]) => {
                const wasExisting = existingIds.has(item.id);
                const isMarkedForRemoval = wasExisting && !selected.has(item.id);
                return (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                      isMarkedForRemoval
                        ? "border-destructive bg-destructive/10 hover:bg-destructive/15"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={selected.has(item.id)}
                      onCheckedChange={() => toggle(item.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>
                        {mode === "order" && assignmentCounts && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                            {assignmentCounts[item.id] || 0} {(assignmentCounts[item.id] || 0) === 1 ? "Auftrag" : "Aufträge"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {item.sublabel && <span className="whitespace-nowrap">{item.sublabel}</span>}
                        {item.employmentType && (() => {
                          let hoursLabel: string | null = null;
                          if (item.templateTitle) {
                            const match = item.templateTitle.match(/(\d+)\s*Stunden/i);
                            if (match) hoursLabel = `${match[1]}h/Woche`;
                          }
                          const typeLabel = item.employmentType!.charAt(0).toUpperCase() + item.employmentType!.slice(1).toLowerCase();
                          return (
                            <>
                              {item.sublabel && <span>·</span>}
                              <span className="shrink-0">
                                {hoursLabel ? `${typeLabel} · ${hoursLabel}` : typeLabel}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </label>
                );
              };

              const parseHours = (item: typeof filteredItems[number]): number | null => {
                if (!item.templateTitle) return null;
                const m = item.templateTitle.match(/(\d+)\s*Stunden/i);
                return m ? parseInt(m[1], 10) : null;
              };

              const renderList = (list: typeof filteredItems, emptyMsg: string, showHourFilters = false) => {
                const visibleIds = list.map((i) => i.id);
                const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
                const toggleAll = () => {
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (allSelected) {
                      visibleIds.forEach((id) => next.delete(id));
                    } else {
                      visibleIds.forEach((id) => next.add(id));
                    }
                    return next;
                  });
                };
                const selectByMinHours = (min: number) => {
                  setSelected((prev) => {
                    const next = new Set(prev);
                    list.forEach((it) => {
                      const h = parseHours(it);
                      if (h !== null && h >= min) next.add(it.id);
                    });
                    return next;
                  });
                };
                return (
                  <div className="mt-2">
                    {list.length > 0 && (
                      <div className="flex flex-wrap items-center gap-3 px-1 py-2">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground select-none">
                          <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                          <span>Alle auswählen ({list.length})</span>
                        </label>
                        {showHourFilters && (
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => selectByMinHours(10)}>
                              Alle mit ≥10h
                            </Button>
                            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => selectByMinHours(20)}>
                              Alle mit ≥20h
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="rounded-lg border">
                      <ScrollArea className={list.length > 5 ? "h-[340px]" : ""}>
                        <div className="space-y-2 p-2">
                          {list.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">{emptyMsg}</div>
                          ) : (
                            list.map(renderRow)
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                );
              };


              if (mode !== "order") {
                return renderList(filteredItems, search ? `Keine Ergebnisse für „${search}"` : "Keine Einträge");
              }

              const counts = assignmentCounts ?? {};
              const openItems = filteredItems.filter((i) => !existingIds.has(i.id) && (counts[i.id] ?? 0) !== 2);
              const testItems = filteredItems.filter((i) => !existingIds.has(i.id) && (counts[i.id] ?? 0) === 2);
              const assignedItems = filteredItems.filter((i) => existingIds.has(i.id));

              return (
                <Tabs defaultValue="open" className="mt-2">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="open">Offen ({openItems.length})</TabsTrigger>
                    <TabsTrigger value="assigned">Zugewiesen ({assignedItems.length})</TabsTrigger>
                    <TabsTrigger value="test">Testaufträge ({testItems.length})</TabsTrigger>
                  </TabsList>
                  <TabsContent value="open" className="mt-0">
                    {renderList(openItems, search ? `Keine Ergebnisse für „${search}"` : "Alle Mitarbeiter bereits zugewiesen", true)}
                  </TabsContent>

                  <TabsContent value="assigned" className="mt-0">
                    {renderList(assignedItems, search ? `Keine Ergebnisse für „${search}"` : "Noch keine Zuweisungen für diesen Auftrag")}
                  </TabsContent>
                  <TabsContent value="test" className="mt-0">
                    {renderList(testItems, search ? `Keine Ergebnisse für „${search}"` : "Keine Mitarbeiter mit genau 2 Aufträgen")}
                  </TabsContent>
                </Tabs>
              );


            })()}
          </>
        )}
        </div>

        <DialogFooter className="px-6 pb-6 flex-col gap-2 sm:flex-col">
          {addedCount > 0 && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 text-center">
              {addedCount} {addedCount === 1 ? "neue Zuweisung wird vergeben" : "neue Zuweisungen werden vergeben"}
            </p>
          )}
          {removedCount > 0 && (
            <p className="text-sm text-destructive text-center">
              {removedCount} {removedCount === 1 ? "Zuweisung wird entzogen" : "Zuweisungen werden entzogen"}
              <br />
              <span className="text-xs">
                Dabei werden Ident-Session, Bewertung, Anhänge und Termine dieses Auftrags unwiderruflich gelöscht.
              </span>
            </p>
          )}

          <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button
            className="shadow-sm hover:shadow-md transition-all"
            disabled={isLoading || saveMutation.isPending} 
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? "Speichern..." : "Speichern"}
          </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
