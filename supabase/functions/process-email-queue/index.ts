import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildEmailHtml(opts: {
  companyName: string;
  brandColor: string;
  bodyTitle: string;
  bodyLines: string[];
  buttonText?: string;
  buttonUrl?: string;
  footerLines?: string[];
  footerAddress: string;
  footerDetails?: { managingDirector?: string; phone?: string; registerCourt?: string; tradeRegister?: string; vatId?: string };
  emailLogoEnabled?: boolean;
  emailLogoUrl?: string;
}): string {
  const { companyName, brandColor, bodyTitle, bodyLines, buttonText, buttonUrl, footerLines, footerAddress, footerDetails } = opts;

  const linkify = (line: string) => {
    if (/<a\s/i.test(line)) return line;
    return line.replace(/(https?:\/\/[^\s<>"']+[^\s<>"'.,;:)])/g, (url) =>
      `<a href="${url}" target="_blank" style="color:${brandColor};text-decoration:underline;word-break:break-all;">${url}</a>`
    );
  };

  const linesHtml = bodyLines
    .map((raw) => {
      const line = linkify(raw);
      const isInfoLine = /^(E-Mail|Passwort|Auftrag|Datum|Uhrzeit|Startdatum|Ihr Startdatum):/i.test(raw.trim());
      if (isInfoLine) {
        return `<div style="margin:4px 0;padding:10px 14px;background-color:#f8fafc;border-left:3px solid ${brandColor};border-radius:0 6px 6px 0;font-size:14px;line-height:1.5;color:#1e293b;font-family:'SF Mono',SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace;">${line}</div>`;
      }
      return `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">${line}</p>`;
    })
    .join("\n");


  const buttonHtml = buttonText && buttonUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 8px 0;"><tr><td style="border-radius:8px;background-color:${brandColor};box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1);"><a href="${buttonUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;letter-spacing:0.2px;">${buttonText}</a></td></tr></table>`
    : "";

  const emailLogoEnabled = opts.emailLogoEnabled || false;
  const emailLogoUrl = opts.emailLogoUrl || "";
  const logoHtml = emailLogoEnabled && emailLogoUrl
    ? `<img src="${emailLogoUrl}" alt="${companyName}" style="max-height:48px;max-width:280px;display:block;margin:0 auto;" />`
    : `<span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">${companyName}</span>`;

  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;">
<tr><td align="center" style="padding:48px 16px;">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 20px 25px -5px rgba(0,0,0,0.08),0 8px 10px -6px rgba(0,0,0,0.04);">
<tr><td style="background-color:${brandColor};padding:40px 32px;text-align:center;">${logoHtml}</td></tr>
<tr><td style="background-color:#ffffff;padding:40px 36px 20px 36px;">
<h1 style="margin:0 0 24px 0;font-size:21px;font-weight:700;color:#0f172a;line-height:1.3;letter-spacing:-0.3px;">${bodyTitle}</h1>
${linesHtml}
${buttonHtml}
</td></tr>
<tr><td style="background-color:#ffffff;padding:0 36px 32px 36px;">
${(footerLines || []).map((line) => `<p style="margin:12px 0 0 0;font-size:14px;line-height:1.6;color:#374151;">${line}</p>`).join("\n")}
<div style="margin:28px 0 0 0;padding:24px 20px;border-top:1px solid #e2e8f0;background-color:#f8fafc;border-radius:0 0 16px 16px;">
<p style="margin:0 0 2px 0;font-size:14px;font-weight:600;color:#334155;text-align:center;">${companyName}</p>
${footerAddress ? `<p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">${footerAddress}</p>` : ""}
${(() => {
  if (!footerDetails) return "";
  const rows: string[] = [];
  if (footerDetails.managingDirector) rows.push(`<tr><td style="padding:3px 12px 3px 0;font-size:12px;color:#94a3b8;white-space:nowrap;">Geschäftsführer</td><td style="padding:3px 0;font-size:12px;color:#64748b;">${footerDetails.managingDirector}</td></tr>`);
  if (footerDetails.phone) rows.push(`<tr><td style="padding:3px 12px 3px 0;font-size:12px;color:#94a3b8;white-space:nowrap;">Telefon</td><td style="padding:3px 0;font-size:12px;color:#64748b;">${footerDetails.phone}</td></tr>`);
  if (footerDetails.registerCourt) rows.push(`<tr><td style="padding:3px 12px 3px 0;font-size:12px;color:#94a3b8;white-space:nowrap;">Amtsgericht</td><td style="padding:3px 0;font-size:12px;color:#64748b;">${footerDetails.registerCourt}</td></tr>`);
  if (footerDetails.tradeRegister) rows.push(`<tr><td style="padding:3px 12px 3px 0;font-size:12px;color:#94a3b8;white-space:nowrap;">Handelsregister</td><td style="padding:3px 0;font-size:12px;color:#64748b;">${footerDetails.tradeRegister}</td></tr>`);
  if (footerDetails.vatId) rows.push(`<tr><td style="padding:3px 12px 3px 0;font-size:12px;color:#94a3b8;white-space:nowrap;">USt-ID</td><td style="padding:3px 0;font-size:12px;color:#64748b;">${footerDetails.vatId}</td></tr>`);
  if (!rows.length) return "";
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:12px auto 0 auto;">${rows.join("")}</table>`;
})()}
</div>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

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
