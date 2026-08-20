import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notifyOrdersAssigned } from "@/lib/assignmentNotification";
import { sendSms } from "@/lib/sendSms";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Play, Phone } from "lucide-react";
import { toast } from "sonner";
import { usePhonePicker, type PrepRow } from "@/components/admin/FirstWorkdayPrepDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prep: PrepRow;
  employeeName: string;
}

export default function FirstWorkdayStartDialog({ open, onOpenChange, prep, employeeName }: Props) {
  const queryClient = useQueryClient();
  const [starting, setStarting] = useState(false);
  const { resolveDisplayNumber } = usePhonePicker(prep.branding_id ?? null);

  const { data: order } = useQuery({
    queryKey: ["prep-order", prep.order_id],
    enabled: open && !!prep.order_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, title, order_number, reward, provider, branding_id")
        .eq("id", prep.order_id!)
        .maybeSingle();
      return data;
    },
  });

  const handleStart = async () => {
    if (!prep.order_id || !prep.contract_id || !order) return;
    setStarting(true);
    try {
      const { data: contract } = await supabase
        .from("employment_contracts")
        .select("id, email, first_name, last_name, phone, user_id, branding_id")
        .eq("id", prep.contract_id)
        .maybeSingle();
      if (!contract) throw new Error("Mitarbeiter nicht gefunden.");

      // 1. Zuweisung (nur wenn noch nicht vorhanden)
      const { data: existingAssignment } = await supabase
        .from("order_assignments")
        .select("id")
        .eq("order_id", prep.order_id)
        .eq("contract_id", prep.contract_id)
        .maybeSingle();

      let assignmentId = existingAssignment?.id ?? null;

      if (!assignmentId) {
        const { data: inserted, error: insErr } = await supabase
          .from("order_assignments")
          .insert({ order_id: prep.order_id, contract_id: prep.contract_id })
          .select("id")
          .single();
        if (insErr) throw insErr;
        assignmentId = inserted.id;

        try {
          await notifyOrdersAssigned(contract as any, [order as any]);
        } catch (e) {
          console.error("Zuweisungs-Benachrichtigung fehlgeschlagen:", e);
        }
      }

      // 2. Ident-Session anlegen
      const filteredData = (prep.test_data ?? []).filter((d) => (d.value ?? "").trim() !== "");
      const { error: sessErr } = await supabase
        .from("ident_sessions" as any)
        .insert({
          order_id: prep.order_id,
          contract_id: prep.contract_id,
          assignment_id: assignmentId,
          branding_id: prep.branding_id ?? (order as any).branding_id ?? null,
          phone_api_url: prep.phone_api_url,
          test_data: filteredData,
          info_notes: prep.info_notes,
          status: filteredData.length > 0 ? "data_sent" : "waiting",
        } as any);
      if (sessErr) throw sessErr;

      // 3. Ident-Daten-SMS
      if (filteredData.length > 0 && contract.phone) {
        try {
          const name = `${contract.first_name || ""} ${contract.last_name || ""}`.trim() || "Mitarbeiter";
          const { data: tpl } = await supabase
            .from("sms_templates" as any)
            .select("message")
            .eq("event_type", "ident_daten_gesendet")
            .maybeSingle();
          if (tpl) {
            const msg = (tpl as any).message
              .replace("{name}", name)
              .replace("{auftrag}", order.title ?? "Auftrag");
            const brandingId = prep.branding_id ?? contract.branding_id ?? null;
            let senderName: string | undefined;
            let identDisabled = false;
            if (brandingId) {
              const { data: br } = await supabase
                .from("brandings")
                .select("sms_sender_name, sms_ident_disabled")
                .eq("id", brandingId)
                .maybeSingle();
              senderName = (br as any)?.sms_sender_name || undefined;
              identDisabled = !!(br as any)?.sms_ident_disabled;
            }
            if (!identDisabled) {
              await sendSms({
                to: contract.phone,
                text: msg,
                event_type: "ident_daten_gesendet",
                recipient_name: name,
                from: senderName,
                branding_id: brandingId,
              });
            }
          }
        } catch (e) {
          console.error("Ident-SMS fehlgeschlagen:", e);
        }
      }

      // 4. Vorbereitung markieren
      await supabase
        .from("first_workday_preparations" as any)
        .update({ status: "started", started_at: new Date().toISOString() } as any)
        .eq("id", prep.id);

      queryClient.invalidateQueries({ queryKey: ["first-workday-preparations"] });
      queryClient.invalidateQueries({ queryKey: ["ident-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["order_assignments"] });
      toast.success("Gestartet – Auftrag und Ident-Daten wurden zugewiesen.");
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Fehler beim Starten: " + (e?.message ?? "Unbekannt"));
    }
    setStarting(false);
  };

  const number = resolveDisplayNumber(prep.phone_api_url);
  const alreadyStarted = prep.status === "started";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Starten – {employeeName}</DialogTitle>
          <DialogDescription>
            Nach der Bestätigung wird der Auftrag zugewiesen, die Ident-Daten hinterlegt und die üblichen Nachrichten versendet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Auftrag: </span>
            <span className="font-medium">
              {order ? `${order.order_number ? `#${order.order_number} – ` : ""}${order.title}` : "…"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Nummer:</span>
            {prep.phone_api_url ? (
              <Badge variant="secondary" className="gap-1.5">
                <Phone className="h-3 w-3" /> {number ?? prep.phone_api_url}
              </Badge>
            ) : (
              <span className="text-muted-foreground">– keine –</span>
            )}
          </div>

          <Separator />

          <div className="space-y-1">
            <span className="text-muted-foreground">Ident-Daten:</span>
            {(prep.test_data ?? []).filter((d) => (d.value ?? "").trim() !== "").length === 0 ? (
              <p className="text-muted-foreground">Keine Daten hinterlegt.</p>
            ) : (
              <ul className="space-y-1">
                {(prep.test_data ?? [])
                  .filter((d) => (d.value ?? "").trim() !== "")
                  .map((d, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="w-28 shrink-0 text-muted-foreground">{d.label}</span>
                      <span className="font-medium break-all">{d.value}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {prep.info_notes?.trim() && (
            <>
              <Separator />
              <div>
                <span className="text-muted-foreground">Info:</span>
                <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs">{prep.info_notes}</p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={handleStart} disabled={starting || alreadyStarted || !prep.order_id}>
            {starting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
            {alreadyStarted ? "Bereits gestartet" : "Jetzt starten"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
