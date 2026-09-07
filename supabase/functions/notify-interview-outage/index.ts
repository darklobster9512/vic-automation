import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function code(len = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let c = "";
  for (let i = 0; i < len; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, key);

  const { dry } = await req.json().catch(() => ({ dry: true }));

  const names = [
    "Vendis Development Services GmbH",
    "LIMEX Solutions GmbH",
    "Codebricks GmbH",
    "Topscale GmbH",
    "PointView GmbH",
  ];

  const { data: brandings } = await admin
    .from("brandings")
    .select("id, company_name, subdomain_prefix, domain, sms_sender_name, custom_email_link_enabled, custom_email_link")
    .in("company_name", names);
  const bMap = new Map((brandings ?? []).map((b: any) => [b.id, b]));
  const bIds = (brandings ?? []).map((b: any) => b.id);

  const today = new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 10);

  const { data: appts, error } = await admin
    .from("interview_appointments")
    .select("id, application_id, appointment_date, applications!inner(id, first_name, last_name, phone, branding_id)")
    .eq("appointment_date", today)
    .in("applications.branding_id", bIds);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: any[] = [];

  for (const a of (appts ?? []) as any[]) {
    const app = a.applications;
    if (!app?.phone) continue;
    const b: any = bMap.get(app.branding_id);

    let base = "";
    const custom = b?.custom_email_link_enabled && b?.custom_email_link?.trim();
    if (custom) {
      base = `https://${String(b.custom_email_link).replace(/^https?:\/\//, "").replace(/\/$/, "").trim()}`;
    } else if (b?.domain) {
      const domain = String(b.domain).replace(/^https?:\/\//, "").replace(/\/$/, "");
      base = `https://${b.subdomain_prefix || "web"}.${domain}`;
    }

    const target = `${base}/bewerbungsgespraech/${app.id}`;
    const c = code();
    if (!dry) {
      await admin.from("short_links").insert({ code: c, target_url: target });
    }
    const shortLink = `${base}/r/${c}`;

    const name = app.first_name || "";
    const text =
      `Hallo ${name}, leider hatten wir heute technische Probleme. Falls Sie von uns keinen Anruf erhalten haben, buchen Sie bitte hier einen neuen Gespraechstermin: ${shortLink}`;

    const res: any = { phone: app.phone, company: b?.company_name, text };

    if (!dry) {
      try {
        const sr = await fetch(`${url}/functions/v1/send-sms`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            to: app.phone,
            text,
            event_type: "gespraech_technische_stoerung",
            recipient_name: `${app.first_name ?? ""} ${app.last_name ?? ""}`.trim(),
            from: b?.sms_sender_name || undefined,
            branding_id: app.branding_id,
          }),
        });
        res.sms = sr.status;
        if (sr.status >= 400) res.body = (await sr.text()).slice(0, 200);
      } catch (e) {
        res.sms = String(e);
      }
      await new Promise((r) => setTimeout(r, 700));
    }

    results.push(res);
  }

  return new Response(JSON.stringify({ count: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
