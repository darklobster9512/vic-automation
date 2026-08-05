import { supabase } from "@/integrations/supabase/client";
import { sendEmail } from "@/lib/sendEmail";
import { resolveContractBranding } from "@/lib/resolveContractBranding";
import { buildBrandingUrl } from "@/lib/buildBrandingUrl";

/**
 * Ab diesem Zeitpunkt gilt die neue Logik: die "Gespräch erfolgreich"-Mail wird
 * erst nach Genehmigung beider Starterjob-Bewertungen versendet.
 * Bewertungen, die VOR diesem Zeitpunkt abgegeben wurden (Altbestand), lösen
 * bewusst KEINEN nachträglichen Versand aus.
 */
export const GESPRAECH_MAIL_CUTOFF = new Date("2026-08-01T12:20:00Z");

/**
 * Prüft, ob für einen Vertrag alle (mind. 2) Starterjobs genehmigt sind und
 * versendet dann einmalig die "Bewerbungsgespräch erfolgreich"-E-Mail.
 * Gibt true zurück, wenn eine Mail eingereiht wurde.
 */
export async function maybeSendGespraechErfolgreichEmail(contractId: string): Promise<boolean> {
  try {
    // 1) Starterjob-Zuweisungen des Vertrags laden
    const { data: assignments } = await supabase
      .from("order_assignments")
      .select("order_id, status, orders!inner(id, is_starter_job)")
      .eq("contract_id", contractId)
      .eq("orders.is_starter_job", true);

    const starterAssignments = assignments ?? [];
    if (starterAssignments.length < 2) return false;
    if (!starterAssignments.every((a: any) => a.status === "erfolgreich")) return false;

    const starterOrderIds = starterAssignments.map((a: any) => a.order_id);

    // 2) Cutoff: nur wenn die Starterjob-Bewertungen NEU sind (kein Nachversand)
    const { data: starterReviews } = await supabase
      .from("order_reviews")
      .select("created_at")
      .eq("contract_id", contractId)
      .in("order_id", starterOrderIds)
      .order("created_at", { ascending: false })
      .limit(1);

    const latest = starterReviews?.[0]?.created_at;
    if (!latest || new Date(latest) < GESPRAECH_MAIL_CUTOFF) return false;

    // 3) Empfängerdaten
    const { data: contract } = await supabase
      .from("employment_contracts")
      .select("email, first_name, last_name, phone")
      .eq("id", contractId)
      .maybeSingle();

    const email = contract?.email?.trim().toLowerCase();
    if (!email) return false;

    // 4) Dedupe: wurde diese Mail schon einmal versendet/eingereiht?
    const { count: logCount } = await supabase
      .from("email_logs")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "gespraech_erfolgreich")
      .eq("recipient_email", email);
    if ((logCount ?? 0) > 0) return false;

    const { count: queueCount } = await supabase
      .from("email_queue")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "gespraech_erfolgreich")
      .eq("recipient_email", email);
    if ((queueCount ?? 0) > 0) return false;

    // 5) Versand
    const brandingId = await resolveContractBranding(contractId);
    const vertragsLink = await buildBrandingUrl(brandingId ?? undefined, "");
    const fullName = [contract?.first_name, contract?.last_name].filter(Boolean).join(" ");

    await sendEmail({
      to: email,
      recipient_name: fullName || undefined,
      subject: "Ihr Bewerbungsgespräch war erfolgreich",
      body_title: "Willkommen im Team",
      body_lines: [
        `Sehr geehrte/r ${fullName},`,
        "wir haben Ihre Starteraufträge erfolgreich geprüft und würden Sie sehr gerne bei uns im Team begrüßen.",
        "Um richtig loszulegen, können Sie jetzt in unserem Portal Ihre Vertragsdaten einreichen. Anschließend erhalten Sie die Möglichkeit, einen Termin für Ihren 1. Arbeitstag zu buchen.",
      ],
      button_text: vertragsLink ? "Vertragsdaten einreichen" : undefined,
      button_url: vertragsLink || undefined,
      branding_id: brandingId || null,
      event_type: "gespraech_erfolgreich",
      metadata: { contract_id: contractId, trigger: "starter_jobs_approved" },
    });

    // 6) Zusätzlich SMS mit Portal-Shortlink (Fehler brechen den Mailversand nicht)
    try {
      const phone = contract?.phone?.trim();
      if (phone) {
        const { data: tpl } = await supabase
          .from("sms_templates")
          .select("message")
          .eq("event_type", "gespraech_erfolgreich")
          .maybeSingle();

        const rawTemplate =
          tpl?.message ||
          "Hallo {name}, Ihre Starteraufträge wurden erfolgreich geprüft! Bitte reichen Sie jetzt Ihre Vertragsdaten ein: {link}";

        let smsLink = "";
        if (vertragsLink) {
          try {
            smsLink = await createShortLink(vertragsLink, brandingId ?? null);
          } catch {
            smsLink = vertragsLink;
          }
        }

        const text = rawTemplate
          .replace(/{name}/g, contract?.first_name || fullName || "")
          .replace(/{link}/g, smsLink)
          .trim();

        await sendSms({
          to: phone,
          text,
          event_type: "gespraech_erfolgreich",
          recipient_name: fullName || undefined,
          branding_id: brandingId || null,
        });
      }
    } catch (smsErr) {
      console.error("gespraech_erfolgreich SMS failed:", smsErr);
    }

    return true;
  } catch (err) {
    console.error("maybeSendGespraechErfolgreichEmail error:", err);
    return false;
  }
}
