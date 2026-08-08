import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { notifyOrdersAssigned } from "@/lib/assignmentNotification";
import { AlertTriangle, Dices } from "lucide-react";

export interface DistEmployee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  user_id: string | null;
  branding_id: string | null;
  availableOrderIds: string[];
}

export interface DistOrder {
  id: string;
  title: string;
  order_number: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: DistEmployee[];
  ordersById: Record<string, DistOrder>;
  perDay: number;
  tabLabel: string;
}

function pickRandom(ids: string[], count: number): string[] {
  const pool = [...ids];
  const out: string[] = [];
  while (pool.length > 0 && out.length < count) {
    const i = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

export default function DistributionDialog({
  open, onOpenChange, employees, ordersById, perDay, tabLabel,
}: Props) {
  const queryClient = useQueryClient();
  const [seed, setSeed] = useState(0);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const proposals = useMemo(() => {
    void seed;
    return employees.map((e) => ({
      employee: e,
      orderIds: pickRandom(e.availableOrderIds, perDay),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, perDay, seed, open]);

  const active = proposals.filter((p) => !excluded.has(p.employee.id) && p.orderIds.length > 0);
  const totalOrders = active.reduce((s, p) => s + p.orderIds.length, 0);

  const assignMutation = useMutation({
    mutationFn: async () => {
      for (const p of active) {
        const rows = p.orderIds.map((orderId) => ({
          order_id: orderId,
          contract_id: p.employee.id,
        }));
        const { error } = await supabase.from("order_assignments").insert(rows);
        if (error) throw error;

        try {
          await notifyOrdersAssigned(
            {
              id: p.employee.id,
              first_name: p.employee.name.split(" ")[0],
              last_name: p.employee.name.split(" ").slice(1).join(" "),
              email: p.employee.email,
              phone: p.employee.phone,
              user_id: p.employee.user_id,
              branding_id: p.employee.branding_id,
            },
            p.orderIds.map((id) => ordersById[id]).filter(Boolean)
          );
        } catch (err) {
          console.error("Benachrichtigung fehlgeschlagen:", err);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auftragsverteilung"] });
      queryClient.invalidateQueries({ queryKey: ["order_assignments"] });
      toast({ title: "Aufträge zugewiesen", description: `${totalOrders} Zuweisungen erstellt.` });
      onOpenChange(false);
    },
    onError: (e: Error) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary to-primary/60" />
        <div className="px-6 pt-5">
          <DialogHeader>
            <DialogTitle>Aufträge zuweisen – {tabLabel}</DialogTitle>
            <DialogDescription>
              {perDay} Platzhalteraufträge pro Mitarbeiter · {active.length} Mitarbeiter · {totalOrders} Zuweisungen
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-3">
          <ScrollArea className="max-h-[55vh] pr-3">
            <div className="space-y-2">
              {proposals.map(({ employee, orderIds }) => {
                const missing = perDay - orderIds.length;
                const isExcluded = excluded.has(employee.id);
                return (
                  <div
                    key={employee.id}
                    className={`rounded-lg border p-3 ${isExcluded ? "opacity-50" : ""} ${
                      orderIds.length === 0 ? "border-destructive/50 bg-destructive/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={!isExcluded && orderIds.length > 0}
                        disabled={orderIds.length === 0}
                        onCheckedChange={() =>
                          setExcluded((prev) => {
                            const next = new Set(prev);
                            if (next.has(employee.id)) next.delete(employee.id);
                            else next.add(employee.id);
                            return next;
                          })
                        }
                      />
                      <span className="font-medium text-sm flex-1">{employee.name}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {orderIds.length}/{perDay}
                      </Badge>
                    </div>

                    {orderIds.length > 0 ? (
                      <ul className="mt-2 ml-7 space-y-1">
                        {orderIds.map((id) => (
                          <li key={id} className="text-xs text-muted-foreground">
                            {ordersById[id]?.order_number ? `#${ordersById[id].order_number} – ` : ""}
                            {ordersById[id]?.title}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 ml-7 text-xs text-destructive flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Keine freien Platzhalteraufträge mehr – bitte neue anlegen.
                      </p>
                    )}

                    {orderIds.length > 0 && missing > 0 && (
                      <p className="mt-1.5 ml-7 text-xs text-amber-600 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Nur {orderIds.length} von {perDay} möglich – Platzhalteraufträge werden knapp.
                      </p>
                    )}
                  </div>
                );
              })}
              {proposals.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Keine Mitarbeiter in diesem Tab.
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="px-6 pb-5 gap-2">
          <Button variant="outline" onClick={() => setSeed((s) => s + 1)}>
            <Dices className="h-4 w-4 mr-2" />
            Neu würfeln
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button
            onClick={() => assignMutation.mutate()}
            disabled={assignMutation.isPending || totalOrders === 0}
          >
            {assignMutation.isPending ? "Wird zugewiesen..." : `${totalOrders} Aufträge zuweisen`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
