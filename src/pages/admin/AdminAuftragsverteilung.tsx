import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, PackageOpen, Send } from "lucide-react";
import DistributionDialog, { DistEmployee, DistOrder } from "@/components/admin/DistributionDialog";

const DEFAULT_TARGETS: Record<number, number> = { 5: 2, 10: 3, 20: 3, 25: 4 };
const FALLBACK_TARGET = 4;

function parseHours(title: string): number | null {
  const m = title.match(/(\d+)\s*Stunden/i);
  return m ? parseInt(m[1], 10) : null;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function fetchAll<T>(build: (from: number, to: number) => any): Promise<T[]> {
  const pageSize = 1000;
  let from = 0;
  const out: T[] = [];
  while (true) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw error;
    const batch = (data ?? []) as T[];
    out.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

export default function AdminAuftragsverteilung() {
  const { activeBrandingId } = useBrandingFilter();
  const queryClient = useQueryClient();
  const [dialogHours, setDialogHours] = useState<number | null>(null);
  const [targetEdits, setTargetEdits] = useState<Record<number, string>>({});

  const today = todayISO();
  const isWeekend = [0, 6].includes(new Date().getDay());

  const { data, isLoading } = useQuery({
    queryKey: ["auftragsverteilung", activeBrandingId, today],
    enabled: !!activeBrandingId,
    queryFn: async () => {
      const brandingId = activeBrandingId!;

      // Vertragsvorlagen (Stunden)
      const { data: templates, error: tErr } = await supabase
        .from("contract_templates")
        .select("id, title")
        .eq("branding_id", brandingId);
      if (tErr) throw tErr;
      const templateHours: Record<string, number> = {};
      (templates ?? []).forEach((t) => {
        const h = parseHours(t.title);
        if (h) templateHours[t.id] = h;
      });

      // Verträge
      const contracts = await fetchAll<any>((from, to) =>
        supabase
          .from("employment_contracts")
          .select("id, first_name, last_name, email, phone, user_id, branding_id, template_id, desired_start_date, is_suspended, application_id")
          .eq("branding_id", brandingId)
          .eq("is_suspended", false)
          .not("template_id", "is", null)
          .not("desired_start_date", "is", null)
          .lte("desired_start_date", today)
          .range(from, to)
      );

      // 1. Arbeitstag erfolgreich
      const fwa = await fetchAll<any>((from, to) =>
        supabase
          .from("first_workday_appointments")
          .select("contract_id, application_id, status")
          .eq("status", "erfolgreich")
          .range(from, to)
      );
      const okContracts = new Set(fwa.map((a) => a.contract_id).filter(Boolean));
      const okApplications = new Set(fwa.map((a) => a.application_id).filter(Boolean));

      const eligible = contracts.filter(
        (c) => okContracts.has(c.id) || (c.application_id && okApplications.has(c.application_id))
      );

      // Platzhalteraufträge
      const placeholders = await fetchAll<any>((from, to) =>
        supabase
          .from("orders")
          .select("id, title, order_number")
          .eq("branding_id", brandingId)
          .eq("is_placeholder", true)
          .range(from, to)
      );
      const ordersById: Record<string, DistOrder> = {};
      placeholders.forEach((o) => { ordersById[o.id] = o; });

      // Zuweisungen
      const contractIds = eligible.map((c) => c.id);
      const assignments: any[] = [];
      for (let i = 0; i < contractIds.length; i += 100) {
        const chunk = contractIds.slice(i, i + 100);
        if (!chunk.length) continue;
        const rows = await fetchAll<any>((from, to) =>
          supabase
            .from("order_assignments")
            .select("order_id, contract_id, assigned_at")
            .in("contract_id", chunk)
            .range(from, to)
        );
        assignments.push(...rows);
      }
      const assignedByContract: Record<string, Set<string>> = {};
      const todayCountByContract: Record<string, number> = {};
      assignments.forEach((a) => {
        (assignedByContract[a.contract_id] ??= new Set()).add(a.order_id);
        if ((a.assigned_at ?? "").slice(0, 10) === today) {
          todayCountByContract[a.contract_id] = (todayCountByContract[a.contract_id] || 0) + 1;
        }
      });

      // Sollwerte
      const { data: targetRows } = await supabase
        .from("distribution_targets" as any)
        .select("hours, orders_per_day")
        .eq("branding_id", brandingId);
      const targets: Record<number, number> = {};
      (targetRows as any[] | null)?.forEach((r) => { targets[r.hours] = r.orders_per_day; });

      const employees = eligible.map((c) => {
        const hours = templateHours[c.template_id] ?? null;
        const assigned = assignedByContract[c.id] ?? new Set<string>();
        return {
          id: c.id,
          name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Ohne Namen",
          email: c.email ?? null,
          phone: c.phone ?? null,
          user_id: c.user_id ?? null,
          branding_id: c.branding_id ?? null,
          hours,
          startDate: c.desired_start_date as string,
          totalAssigned: assigned.size,
          todayAssigned: todayCountByContract[c.id] ?? 0,
          availableOrderIds: placeholders.filter((o) => !assigned.has(o.id)).map((o) => o.id),
        };
      }).filter((e) => e.hours !== null);

      const hoursList = Array.from(new Set(employees.map((e) => e.hours as number))).sort((a, b) => a - b);

      return { employees, hoursList, ordersById, targets, placeholderCount: placeholders.length };
    },
  });

  const saveTarget = useMutation({
    mutationFn: async ({ hours, value }: { hours: number; value: number }) => {
      const { error } = await supabase
        .from("distribution_targets" as any)
        .upsert(
          { branding_id: activeBrandingId, hours, orders_per_day: value } as any,
          { onConflict: "branding_id,hours" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auftragsverteilung"] });
      toast({ title: "Sollwert gespeichert" });
    },
    onError: (e: Error) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });

  const targetFor = (hours: number) =>
    data?.targets[hours] ?? DEFAULT_TARGETS[hours] ?? FALLBACK_TARGET;

  const status = useMemo(() => {
    if (!data) return null;
    const open = data.employees.filter((e) => e.todayAssigned < targetFor(e.hours as number));
    return { total: data.employees.length, open };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (!activeBrandingId) {
    return <p className="text-muted-foreground">Bitte zuerst ein Branding auswählen.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Auftragsverteilung</h1>
        <p className="text-muted-foreground text-sm">
          Tägliche Verteilung von Platzhalteraufträgen – Montag bis Freitag.
        </p>
      </div>

      {isWeekend && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3 text-amber-800 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Heute ist Wochenende – normalerweise kein Betrieb.
          </CardContent>
        </Card>
      )}

      {status && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {status.open.length === 0 && status.total > 0 ? (
            <Card className="border-emerald-300 bg-emerald-50">
              <CardContent className="p-4 flex items-center gap-3 text-emerald-800 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Heute wurden alle Mitarbeiter versorgt ({status.total} von {status.total}).
              </CardContent>
            </Card>
          ) : (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="p-4 text-amber-900 text-sm space-y-2">
                <div className="flex items-center gap-3 font-medium">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {status.open.length} von {status.total} Mitarbeitern haben heute noch offene Zuweisungen.
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {status.open.slice(0, 30).map((e) => (
                    <Badge key={e.id} variant="outline" className="bg-white/60 text-[11px]">
                      {e.name} · {e.todayAssigned}/{targetFor(e.hours as number)} ({e.hours}h)
                    </Badge>
                  ))}
                  {status.open.length > 30 && (
                    <Badge variant="outline" className="bg-white/60 text-[11px]">
                      +{status.open.length - 30} weitere
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {data && data.placeholderCount < 20 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3 text-destructive text-sm">
            <PackageOpen className="h-4 w-4 shrink-0" />
            Nur noch {data.placeholderCount} Platzhalteraufträge in diesem Branding – bitte neue anlegen.
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Laden...</p>
      ) : !data?.hoursList.length ? (
        <p className="text-muted-foreground">Keine passenden Mitarbeiter gefunden.</p>
      ) : (
        <Tabs defaultValue={String(data.hoursList[0])}>
          <TabsList>
            {data.hoursList.map((h) => (
              <TabsTrigger key={h} value={String(h)}>
                {h} Std.
                <Badge variant="secondary" className="ml-2 text-[10px]">
                  {data.employees.filter((e) => e.hours === h).length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {data.hoursList.map((h) => {
            const list = data.employees.filter((e) => e.hours === h);
            const perDay = targetFor(h);
            return (
              <TabsContent key={h} value={String(h)} className="space-y-4">
                <Card>
                  <CardContent className="p-4 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Aufträge pro Werktag:</span>
                      <Input
                        type="number"
                        min={0}
                        className="h-8 w-20"
                        value={targetEdits[h] ?? String(perDay)}
                        onChange={(e) => setTargetEdits((p) => ({ ...p, [h]: e.target.value }))}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={(targetEdits[h] ?? String(perDay)) === String(perDay)}
                        onClick={() =>
                          saveTarget.mutate({ hours: h, value: parseInt(targetEdits[h] ?? String(perDay), 10) || 0 })
                        }
                      >
                        Speichern
                      </Button>
                    </div>
                    <div className="flex-1" />
                    <Button onClick={() => setDialogHours(h)} disabled={list.length === 0}>
                      <Send className="h-4 w-4 mr-2" />
                      Aufträge zuweisen
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-0 divide-y">
                    {list.length === 0 && (
                      <p className="p-6 text-center text-sm text-muted-foreground">
                        Keine Mitarbeiter in dieser Gruppe.
                      </p>
                    )}
                    {list.map((e) => {
                      const done = e.todayAssigned >= perDay;
                      return (
                        <div key={e.id} className="flex flex-wrap items-center gap-3 p-4">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm">{e.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Start: {e.startDate?.split("-").reverse().join(".")} · {e.totalAssigned} Aufträge gesamt ·{" "}
                              {e.availableOrderIds.length} Platzhalter frei
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-[11px]">
                            heute {e.todayAssigned}/{perDay}
                          </Badge>
                          {e.availableOrderIds.length === 0 ? (
                            <Badge variant="destructive" className="text-[11px]">Keine Aufträge mehr</Badge>
                          ) : done ? (
                            <Badge className="bg-emerald-600 text-white text-[11px]">Erledigt</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[11px]">Offen</Badge>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {dialogHours === h && (
                  <DistributionDialog
                    open
                    onOpenChange={(o) => !o && setDialogHours(null)}
                    employees={list
                      .filter((e) => e.todayAssigned < perDay)
                      .map<DistEmployee>((e) => ({
                        id: e.id,
                        name: e.name,
                        email: e.email,
                        phone: e.phone,
                        user_id: e.user_id,
                        branding_id: e.branding_id,
                        availableOrderIds: e.availableOrderIds,
                      }))}
                    ordersById={data.ordersById}
                    perDay={perDay}
                    tabLabel={`${h} Std.`}
                  />
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
