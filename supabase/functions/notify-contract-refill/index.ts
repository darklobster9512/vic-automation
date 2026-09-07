import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, key);

  const { ids, dry } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return new Response(JSON.stringify({ error: "ids required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: rows, error } = await admin
    .from("employment_contracts")
    .select("id, first_name, email, phone, branding_id")
    .in("id", ids);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: brandings } = await admin
    .from("brandings")
    .select("id, company_name, subdomain_prefix, domain");
  const bMap = new Map((brandings ?? []).map((b: any) => [b.id, b]));

  const results: any[] = [];

  for (const r of rows ?? []) {
    const b: any = bMap.get(r.branding_id);
    const domain = (b?.domain ?? "").replace(/^https?:\/\//, "").replace(/^web\./, "");
    const prefix = b?.subdomain_prefix || "app";
    const link = domain ? `https://${prefix}.${domain}` : "";
    const name = r.first_name || "";
    const company = b?.company_name ?? "";

    const smsText =
      `Hallo ${name}, aus technischen Gruenden muessen wir dich bitten, deinen Arbeitsvertrag im Portal erneut auszufuellen: ${link}`;

    const res: any = { id: r.id, email: r.email, phone: r.phone };

    if (dry) {
      res.sms = smsText;
      results.push(res);
      continue;
    }

    if (r.phone) {
      try {
        const sr = await fetch(`${url}/functions/v1/send-sms`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            to: r.phone,
            text: smsText,
            event_type: "vertrag_neu_ausfuellen",
            recipient_name: name,
            branding_id: r.branding_id,
          }),
        });
        res.sms = sr.status;
      } catch (e) {
        res.sms = String(e);
      }
    }

    if (r.email) {
      try {
        const er = await fetch(`${url}/functions/v1/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            to: r.email,
            recipient_name: name,
            subject: "Bitte fülle deinen Arbeitsvertrag erneut aus",
            body_title: "Arbeitsvertrag erneut ausfüllen",
            body_lines: [
              `Hallo ${name},`,
              `aus technischen Gründen konnten wir deine bereits eingereichten Vertragsdaten leider nicht übernehmen.`,
              `Bitte logge dich in deinem Mitarbeiterportal ein, wähle deine Vertragsform erneut aus und fülle deine Daten noch einmal vollständig aus.`,
              `Vielen Dank für dein Verständnis.`,
            ],
            button_text: "Arbeitsvertrag ausfüllen",
            button_url: link,
            footer_lines: [company],
            branding_id: r.branding_id,
            event_type: "vertrag_neu_ausfuellen",
            metadata: { contract_id: r.id },
          }),
        });
        res.email_status = er.status;
        if (er.status >= 400) res.email_body = (await er.text()).slice(0, 300);
      } catch (e) {
        res.email_status = String(e);
      }
    }

    results.push(res);
  }

  return new Response(JSON.stringify({ count: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
