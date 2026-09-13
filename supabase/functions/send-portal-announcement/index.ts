import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRANDING_ID = "7acd3258-1288-4778-930c-35d60f4f46ec"; // Codebricks GmbH
const EVENT_TYPE = "portal_umzug_info";
const PORTAL_URL = "https://app.codebricks-gmbh.com";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Idempotenz: nur einmal versenden
    const { count } = await admin
      .from("email_logs")
      .select("id", { count: "exact", head: true })
      .eq("event_type", EVENT_TYPE);

    if ((count ?? 0) > 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "bereits versendet", count }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: branding } = await admin
      .from("brandings")
      .select("company_name, sms_sender_name")
      .eq("id", BRANDING_ID)
      .maybeSingle();

    const companyName = branding?.company_name || "Codebricks GmbH";
    const smsSender = branding?.sms_sender_name || "Codebricks";

    // Empfänger laden
    type Row = { first_name: string | null; last_name: string | null; email: string | null; phone: string | null };
    const all: Row[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await admin
        .from("employment_contracts")
        .select("first_name, last_name, email, phone")
        .eq("branding_id", BRANDING_ID)
        .eq("is_suspended", false)
        .not("user_id", "is", null)
        .range(from, from + PAGE - 1);
      if (error) throw error;
      all.push(...((data as Row[]) ?? []));
      if (!data || data.length < PAGE) break;
    }

    const normPhone = (p: string) => {
      let c = p.replace(/(?!^\+)\D/g, "");
      if (c.startsWith("0")) c = "+49" + c.slice(1);
      if (c.startsWith("49") && !c.startsWith("+")) c = "+" + c;
      return c;
    };

    const seenMail = new Set<string>();
    const seenPhone = new Set<string>();
    const recipients: { name: string; firstName: string; email: string | null; phone: string | null }[] = [];
    for (const r of all) {
      const mail = r.email?.trim().toLowerCase() || null;
      const phone = r.phone?.trim() ? normPhone(r.phone.trim()) : null;
      const useMail = mail && !seenMail.has(mail) ? mail : null;
      const usePhone = phone && !seenPhone.has(phone) ? phone : null;
      if (!useMail && !usePhone) continue;
      if (useMail) seenMail.add(useMail);
      if (usePhone) seenPhone.add(usePhone);
      const firstName = (r.first_name || "").trim();
      recipients.push({
        firstName: firstName || "Mitarbeiter",
        name: [r.first_name, r.last_name].filter(Boolean).join(" ").trim() || "Mitarbeiter",
        email: useMail,
        phone: usePhone,
      });
    }

    let emailsSent = 0, emailsFailed = 0, smsSent = 0, smsFailed = 0;

    const callFn = async (fn: string, body: unknown) => {
      const res = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || (json && json.error)) throw new Error(json?.error || `HTTP ${res.status}`);
    };

    for (const r of recipients) {
      if (r.email) {
        try {
          await callFn("send-email", {
            to: r.email,
            recipient_name: r.name,
            subject: `Mitarbeiter-Portal aktuell unter neuer Adresse erreichbar – ${companyName}`,
            body_title: "Technische Störung – Portal unter neuer Adresse",
            body_lines: [
              `Hallo ${r.firstName},`,
              "aufgrund technischer Störungen ist unser Mitarbeiter-Portal aktuell unter einer neuen Adresse erreichbar.",
              `Sie erreichen das Portal ab sofort hier: ${PORTAL_URL}`,
              "Vielen Dank für Ihr Verständnis.",
            ],
            button_text: "Zum Mitarbeiter-Portal",
            button_url: PORTAL_URL,
            branding_id: BRANDING_ID,
            event_type: EVENT_TYPE,
            metadata: {},
          });
          emailsSent++;
        } catch (e) {
          emailsFailed++;
          console.error("email failed:", String(e));
        }
      }

      if (r.phone) {
        try {
          await callFn("send-sms", {
            to: r.phone,
            recipient_name: r.name,
            text: `Hallo ${r.firstName}, aufgrund technischer Stoerungen ist das Mitarbeiter-Portal ab sofort hier erreichbar: ${PORTAL_URL}`,
            event_type: EVENT_TYPE,
            from: smsSender,
            branding_id: BRANDING_ID,
          });
          smsSent++;
        } catch (e) {
          smsFailed++;
          console.error("sms failed:", String(e));
        }
      }

      await sleep(150);
    }

    return new Response(
      JSON.stringify({ success: true, recipients: recipients.length, emailsSent, emailsFailed, smsSent, smsFailed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-portal-announcement failed:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
