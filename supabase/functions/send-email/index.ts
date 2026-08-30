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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body: EmailRequest = await req.json();
    const {
      to, recipient_name, subject, body_title, body_lines,
      button_text, button_url, footer_lines, branding_id, event_type, metadata,
      bypass_queue,
    } = body;

    if (!to || !subject || !event_type) {
      return new Response(JSON.stringify({ error: "to, subject und event_type erforderlich" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Direktversand ohne Queue (z. B. Panel-Link-Mails)
    if (bypass_queue) {
      try {
        if (!branding_id) throw new Error("branding_id fuer Direktversand erforderlich");

        const { data: branding } = await adminClient
          .from("brandings")
          .select("company_name, brand_color, street, zip_code, city, resend_api_key, resend_from_email, resend_from_name, managing_director, phone, register_court, trade_register, vat_id, email_logo_enabled, email_logo_url")
          .eq("id", branding_id)
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
          emailLogoEnabled: branding?.email_logo_enabled || false,
          emailLogoUrl: branding?.email_logo_url || undefined,
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
          branding_id,
          status: "sent",
          metadata: metadata ?? {},
        });

        return new Response(JSON.stringify({ success: true, queued: false, direct: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (directErr) {
        const msg = directErr instanceof Error ? directErr.message : String(directErr);
        console.error("send-email direct failed:", msg);

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
    }


    const { data: queueId, error } = await adminClient.rpc("enqueue_email", {
      _to: to,
      _recipient_name: recipient_name ?? null,
      _subject: subject,
      _body_title: body_title,
      _body_lines: body_lines ?? [],
      _button_text: button_text ?? null,
      _button_url: button_url ?? null,
      _footer_lines: footer_lines ?? null,
      _branding_id: branding_id ?? null,
      _event_type: event_type,
      _metadata: metadata ?? {},
    });

    if (error) {
      console.error("enqueue_email error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, queued: true, queue_id: queueId }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-email error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
