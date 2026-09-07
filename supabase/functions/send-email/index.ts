import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmailHtml } from "../_shared/emailHtml.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailRequest {
  to: string;
  recipient_name?: string;
  subject: string;
  body_title: string;
  body_lines: string[];
  button_text?: string;
  button_url?: string;
  footer_lines?: string[];
  branding_id?: string;
  event_type: string;
  metadata?: Record<string, unknown>;
  bypass_queue?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  let body: EmailRequest;
  try {
    body = await req.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: `Invalid JSON: ${String(err)}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const {
    to, recipient_name, subject, body_title, body_lines,
    button_text, button_url, footer_lines, branding_id, event_type, metadata,
  } = body;

  if (!to || !subject || !event_type) {
    return new Response(JSON.stringify({ error: "to, subject und event_type erforderlich" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Branding auflösen (direkt oder über contract_id-Metadata)
    let effectiveBrandingId = branding_id ?? null;
    if (!effectiveBrandingId && metadata && typeof metadata === "object" && "contract_id" in metadata) {
      const contractId = (metadata as any).contract_id as string;
      const { data: contractRow } = await adminClient
        .from("employment_contracts")
        .select("branding_id, user_id")
        .eq("id", contractId)
        .single();
      if (contractRow?.user_id) {
        const { data: profile } = await adminClient
          .from("profiles")
          .select("branding_id")
          .eq("id", contractRow.user_id)
          .single();
        effectiveBrandingId = profile?.branding_id ?? contractRow.branding_id ?? null;
      } else {
        effectiveBrandingId = contractRow?.branding_id ?? null;
      }
    }

    if (!effectiveBrandingId) throw new Error("Kein Branding fuer diese E-Mail ermittelbar");

    const { data: branding } = await adminClient
      .from("brandings")
      .select("company_name, brand_color, street, zip_code, city, resend_api_key, resend_from_email, resend_from_name, managing_director, phone, register_court, trade_register, vat_id, email_logo_enabled, email_logo_url")
      .eq("id", effectiveBrandingId)
      .single();

    const resendApiKey = branding?.resend_api_key;
    if (!resendApiKey) throw new Error("Keine Resend-Konfiguration fuer dieses Branding vorhanden");

    const companyName = branding?.company_name || "Unternehmen";
    const brandColor = branding?.brand_color || "#3B82F6";
    const fromEmail = branding?.resend_from_email || "noreply@example.com";
    const fromName = branding?.resend_from_name || companyName;
    const footerAddress = [branding?.street, `${branding?.zip_code || ""} ${branding?.city || ""}`.trim()]
      .filter(Boolean)
      .join(", ");

    const suppressLogo =
      event_type === "bewerbung_angenommen" ||
      event_type === "bewerbung_angenommen_extern_meta" ||
      event_type === "bewerbung_angenommen_extern";

    const html = buildEmailHtml({
      companyName,
      brandColor,
      bodyTitle: body_title,
      bodyLines: Array.isArray(body_lines) ? body_lines : [],
      buttonText: button_text || undefined,
      buttonUrl: button_url || undefined,
      footerLines: Array.isArray(footer_lines) ? footer_lines : undefined,
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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject,
        html,
      }),
    });

    const resendResult = await resendRes.json();
    if (!resendRes.ok) {
      throw new Error(resendResult?.message || JSON.stringify(resendResult));
    }

    await adminClient.from("email_logs").insert({
      event_type,
      recipient_email: to,
      recipient_name: recipient_name ?? null,
      subject,
      branding_id: effectiveBrandingId,
      status: "sent",
      metadata: metadata ?? {},
    });

    return new Response(JSON.stringify({ success: true, direct: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("send-email failed:", msg);

    await adminClient.from("email_logs").insert({
      event_type,
      recipient_email: to,
      recipient_name: recipient_name ?? null,
      subject,
      branding_id: branding_id ?? null,
      status: "failed",
      error_message: msg,
      metadata: metadata ?? {},
    });

    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
