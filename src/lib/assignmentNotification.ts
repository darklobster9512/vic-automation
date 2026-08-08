import { supabase } from "@/integrations/supabase/client";
import { sendEmail } from "@/lib/sendEmail";
import { sendSms } from "@/lib/sendSms";
import { buildBrandingUrl } from "@/lib/buildBrandingUrl";
import { resolveContractBrandingBatch } from "@/lib/resolveContractBranding";

export interface NotifyContract {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  user_id?: string | null;
  branding_id?: string | null;
}

export interface NotifyOrder {
  id: string;
  title: string;
  order_number?: string | null;
  reward?: string | null;
}

/**
 * Sends exactly ONE email and ONE SMS per employee for a batch of newly
 * assigned orders — never one message per order.
 */
export async function notifyOrdersAssigned(
  contract: NotifyContract,
  orders: NotifyOrder[]
): Promise<void> {
  if (!orders.length) return;

  const brandingMap = await resolveContractBrandingBatch([contract]);
  const brandingId = brandingMap[contract.id] ?? null;
  const name = `${contract.first_name || ""} ${contract.last_name || ""}`.trim();
  const multiple = orders.length > 1;

  // ---------- E-Mail ----------
  if (contract.email) {
    const portalUrl = await buildBrandingUrl(brandingId, "/mitarbeiter/auftraege");
    const bodyLines = [
      `Sehr geehrte/r ${name || "Mitarbeiter/in"},`,
      multiple
        ? `Ihnen wurden ${orders.length} neue Aufträge zugewiesen:`
        : "Ihnen wurde ein neuer Auftrag zugewiesen:",
      ...orders.map(
        (o) => `Auftrag: ${o.order_number ? `#${o.order_number} – ` : ""}${o.title}`
      ),
      multiple
        ? "Bitte loggen Sie sich in Ihrem Mitarbeiterportal ein, um die Aufträge einzusehen und zu bearbeiten."
        : "Bitte loggen Sie sich in Ihrem Mitarbeiterportal ein, um den Auftrag einzusehen und zu bearbeiten.",
    ];

    await sendEmail({
      to: contract.email,
      recipient_name: name || undefined,
      subject: multiple ? `${orders.length} neue Aufträge verfügbar` : "Neuer Auftrag verfügbar",
      body_title: multiple
        ? "Ihnen wurden neue Aufträge zugewiesen"
        : "Ihnen wurde ein neuer Auftrag zugewiesen",
      body_lines: bodyLines,
      button_text: multiple ? "Aufträge ansehen" : "Auftrag ansehen",
      button_url: portalUrl,
      branding_id: brandingId,
      event_type: multiple ? "auftraege_zugewiesen_sammel" : "auftrag_zugewiesen",
      metadata: { contract_id: contract.id, order_ids: orders.map((o) => o.id) },
    });
  }

  // ---------- SMS ----------
  if (contract.phone) {
    const eventType = multiple ? "auftraege_zugewiesen_sammel" : "auftrag_zugewiesen";
    const { data: tpl } = await supabase
      .from("sms_templates" as any)
      .select("message")
      .eq("event_type", eventType)
      .maybeSingle();

    let smsText: string;
    if ((tpl as any)?.message) {
      smsText = (tpl as any).message
        .replace("{name}", name)
        .replace("{anzahl}", String(orders.length))
        .replace("{auftrag}", orders[0]?.title || "");
    } else {
      smsText = multiple
        ? `Hallo ${name}, es sind ${orders.length} neue Auftraege fuer Sie verfuegbar. Jetzt im Mitarbeiterportal ansehen.`
        : `Hallo ${name}, Ihnen wurde ein neuer Auftrag zugewiesen: ${orders[0]?.title || ""}`;
    }

    let smsSender: string | undefined;
    if (brandingId) {
      const { data: branding } = await supabase
        .from("brandings")
        .select("sms_sender_name")
        .eq("id", brandingId)
        .maybeSingle();
      smsSender = (branding as any)?.sms_sender_name || undefined;
    }

    await sendSms({
      to: contract.phone,
      text: smsText,
      event_type: eventType,
      recipient_name: name,
      from: smsSender,
      branding_id: brandingId,
    });
  }
}
