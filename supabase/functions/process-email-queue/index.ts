import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { buildEmailHtml } from "../_shared/emailHtml.ts";

interface QueueRow {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  body_title: string;
  body_lines: string[];
  button_text: string | null;
  button_url: string | null;
  footer_lines: string[] | null;
  branding_id: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: batch, error: claimErr } = await adminClient.rpc("claim_email_batch", { _limit: 5 });

    if (claimErr) {
      console.error("claim_email_batch error:", claimErr);
      return new Response(JSON.stringify({ error: claimErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows: QueueRow[] = batch || [];
    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const row of rows) {
      try {
        let effectiveBrandingId = row.branding_id;

        if (!effectiveBrandingId && row.metadata?.contract_id) {
          const contractId = row.metadata.contract_id as string;
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

        let branding: any = null;
        if (effectiveBrandingId) {
          const { data } = await adminClient
            .from("brandings")
            .select("company_name, logo_url, brand_color, street, zip_code, city, resend_api_key, resend_from_email, resend_from_name, managing_director, phone, register_court, trade_register, vat_id, email_logo_enabled, email_logo_url")
            .eq("id", effectiveBrandingId)
            .single();
          branding = data;
        }

        const resendApiKey = branding?.resend_api_key;
        if (!resendApiKey) {
          throw new Error("Keine Resend-Konfiguration fuer dieses Branding vorhanden");
        }

        const companyName = branding?.company_name || "Unternehmen";
        const brandColor = branding?.brand_color || "#3B82F6";
        const fromEmail = branding?.resend_from_email || "noreply@example.com";
        const fromName = branding?.resend_from_name || companyName;
        const footerParts = [branding?.street, `${branding?.zip_code || ""} ${branding?.city || ""}`.trim()].filter(Boolean);
        const footerAddress = footerParts.join(", ");

        const suppressLogo = row.event_type === "bewerbung_angenommen" || row.event_type === "bewerbung_angenommen_extern_meta" || row.event_type === "bewerbung_angenommen_extern";

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
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: `${fromName} <${fromEmail}>`,
            to: [row.recipient_email],
            subject: row.subject,
            html,
          }),
        });

        const resendResult = await resendRes.json();

        if (!resendRes.ok) {
          throw new Error(resendResult?.message || JSON.stringify(resendResult));
        }

        await adminClient
          .from("email_queue")
          .update({ status: "sent", sent_at: new Date().toISOString(), last_error: null })
          .eq("id", row.id);

        await adminClient.from("email_logs").insert({
          event_type: row.event_type,
          recipient_email: row.recipient_email,
          recipient_name: row.recipient_name,
          subject: row.subject,
          branding_id: effectiveBrandingId,
          status: "sent",
          metadata: row.metadata || {},
        });

        results.push({ id: row.id, status: "sent" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Email ${row.id} failed:`, msg);

        await adminClient
          .from("email_queue")
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

        results.push({ id: row.id, status: "failed", error: msg });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-email-queue error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
