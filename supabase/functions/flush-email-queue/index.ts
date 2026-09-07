import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmailHtml } from "../_shared/emailHtml.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: rows, error } = await adminClient
    .from("email_queue")
    .select("*")
    .in("status", ["pending", "sending"])
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let failed = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const row of rows ?? []) {
    try {
      let brandingId: string | null = row.branding_id;
      if (!brandingId && row.metadata?.contract_id) {
        const { data: c } = await adminClient
          .from("employment_contracts")
          .select("branding_id, user_id")
          .eq("id", row.metadata.contract_id)
          .single();
        if (c?.user_id) {
          const { data: p } = await adminClient
            .from("profiles").select("branding_id").eq("id", c.user_id).single();
          brandingId = p?.branding_id ?? c.branding_id ?? null;
        } else {
          brandingId = c?.branding_id ?? null;
        }
      }
      if (!brandingId) throw new Error("Kein Branding");

      const { data: branding } = await adminClient
        .from("brandings")
        .select("company_name, brand_color, street, zip_code, city, resend_api_key, resend_from_email, resend_from_name, managing_director, phone, register_court, trade_register, vat_id, email_logo_enabled, email_logo_url")
        .eq("id", brandingId)
        .single();

      const resendApiKey = branding?.resend_api_key;
      if (!resendApiKey) throw new Error("Keine Resend-Konfiguration");

      const companyName = branding?.company_name || "Unternehmen";
      const brandColor = branding?.brand_color || "#3B82F6";
      const fromEmail = branding?.resend_from_email || "noreply@example.com";
      const fromName = branding?.resend_from_name || companyName;
      const footerAddress = [branding?.street, `${branding?.zip_code || ""} ${branding?.city || ""}`.trim()]
        .filter(Boolean).join(", ");

      const suppressLogo =
        row.event_type === "bewerbung_angenommen" ||
        row.event_type === "bewerbung_angenommen_extern_meta" ||
        row.event_type === "bewerbung_angenommen_extern";

      const html = buildEmailHtml({
        companyName,
        brandColor,
        bodyTitle: row.body_title,
        bodyLines: Array.isArray(row.body_lines) ? row.body_lines : [],
        buttonText: row.button_text || undefined,
        buttonUrl: row.button_url || undefined,
        footerLines: Array.isArray(row.footer_lines) ? row.footer_lines : undefined,
        footerAddress,
        footerDetails: {
          managingDirector: branding?.managing_director || undefined,
          phone: branding?.phone || undefined,
          registerCourt: branding?.register_court || undefined,
          tradeRegister: branding?.trade_register || undefined,
          vatId: branding?.vat_id || undefined,
        },
        emailLogoEnabled: suppressLogo ? false : (branding?.email_logo_enabled || false),
        emailLogoUrl: suppressLogo ? undefined : (branding?.email_logo_url || undefined),
      });

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [row.recipient_email],
          subject: row.subject,
          html,
        }),
      });
      const resendResult = await resendRes.json();
      if (!resendRes.ok) throw new Error(resendResult?.message || JSON.stringify(resendResult));

      await adminClient.from("email_queue")
        .update({ status: "sent", sent_at: new Date().toISOString(), last_error: null })
        .eq("id", row.id);

      await adminClient.from("email_logs").insert({
        event_type: row.event_type,
        recipient_email: row.recipient_email,
        recipient_name: row.recipient_name,
        subject: row.subject,
        branding_id: brandingId,
        status: "sent",
        metadata: row.metadata || {},
      });

      sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failed++;
      errors.push({ id: row.id, error: msg });
      await adminClient.from("email_queue")
        .update({ status: "failed", last_error: msg })
        .eq("id", row.id);
      await adminClient.from("email_logs").insert({
        event_type: row.event_type,
        recipient_email: row.recipient_email,
        recipient_name: row.recipient_name,
        subject: row.subject,
        branding_id: row.branding_id,
        status: "failed",
        error_message: msg,
        metadata: row.metadata || {},
      });
    }
  }

  return new Response(JSON.stringify({ processed: (rows ?? []).length, sent, failed, errors }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
