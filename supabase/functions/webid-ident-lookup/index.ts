import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

function extractAid(input: string | null): string | null {
  if (!input) return null;
  const m = input.match(/\/aid\/(\d{4,})/i);
  return m ? m[1] : null;
}

function findInTestData(td: unknown, keyRegex: RegExp): string | null {
  if (!Array.isArray(td)) return null;
  for (const entry of td as Array<{ label?: string; value?: string }>) {
    if (entry && typeof entry.label === "string" && keyRegex.test(entry.label)) {
      const v = (entry.value ?? "").toString().trim();
      if (v) return v;
    }
  }
  return null;
}

function testDataContainsAid(td: unknown, aid: string): boolean {
  if (!Array.isArray(td)) return false;
  const needle = `/aid/${aid}`;
  for (const entry of td as Array<{ value?: string }>) {
    if (entry && typeof entry.value === "string" && entry.value.includes(needle)) return true;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let inputUrl = url.searchParams.get("url");
    let aid = url.searchParams.get("aid");

    if (!inputUrl && !aid && (req.method === "POST")) {
      try {
        const body = await req.json();
        inputUrl = body?.url ?? null;
        aid = body?.aid ?? null;
      } catch (_) { /* ignore */ }
    }

    if (!aid) aid = extractAid(inputUrl);
    if (!aid) {
      return new Response(JSON.stringify({ found: false, reason: "no_aid" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) ident_sessions: test_data enthält /aid/<aid>
    const { data: sessions, error: sErr } = await supabase
      .from("ident_sessions")
      .select("id, status, test_data, phone_api_url, branding_id, last_tan, last_tan_at, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (sErr) throw sErr;

    const allMatches = (sessions ?? []).filter((s: any) => testDataContainsAid(s.test_data, aid!));
    // Bevorzuge aktive Sitzungen (waiting/data_sent); Fallback auf zuletzt aktualisierte
    let match: any = allMatches.find((s: any) => s.status === "waiting" || s.status === "data_sent")
      ?? allMatches[0];

    // 2) Fallback: first_workday_preparations
    let source: "session" | "prep" | null = match ? "session" : null;
    let prep: any = null;
    if (!match) {
      const { data: preps, error: pErr } = await supabase
        .from("first_workday_preparations")
        .select("id, test_data, phone_api_url, branding_id, updated_at, contract_id")
        .order("updated_at", { ascending: false })
        .limit(500);
      if (pErr) throw pErr;
      prep = (preps ?? []).find((p: any) => testDataContainsAid(p.test_data, aid!));
      if (prep) source = "prep";
    }

    if (!match && !prep) {
      return new Response(JSON.stringify({ found: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const record = match ?? prep;
    const td = record.test_data;
    const email =
      findInTestData(td, /^e[-\s]?mail$|^email$/i) ??
      findInTestData(td, /mail/i);
    const phoneFromTd = findInTestData(td, /telefon|phone|nummer|rufnummer/i);

    // Rufnummer aus phone_api_url via phone_numbers.label
    let phone = phoneFromTd;
    const apiUrl = record.phone_api_url as string | null;
    const brandingId = record.branding_id as string | null;
    if (!phone && apiUrl) {
      const { data: pn } = await supabase
        .from("phone_numbers")
        .select("label")
        .eq("api_url", apiUrl)
        .maybeSingle();
      if (pn?.label) phone = pn.label as string;
    }

    // Live-Abruf beim Anbieter, falls immer noch keine Nummer bekannt
    if (!phone && apiUrl) {
      try {
        const isSmsbot = apiUrl.startsWith("smsbot://");
        const fnName = isSmsbot ? "smsbot-proxy" : "anosim-proxy";
        const body = isSmsbot
          ? { rentalId: apiUrl.slice("smsbot://".length), brandingId }
          : { url: apiUrl };
        const resp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/${fnName}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify(body),
        });
        if (resp.ok) {
          const data = await resp.json().catch(() => null);
          const num = data?.number
            ?? (Array.isArray(data?.rentals)
              ? data.rentals.find((r: any) => r.rentalId === body.rentalId)?.number
              : null);
          if (num) {
            phone = String(num);
            // Cache im Label speichern, damit spätere Aufrufe schneller sind
            try {
              await supabase
                .from("phone_numbers")
                .update({ label: phone })
                .eq("api_url", apiUrl);
            } catch (_) { /* ignore */ }
          }
        }
      } catch (e) {
        console.warn("phone live-lookup failed", e);
      }
    }

    const normalizePhone = (p: string | null | undefined) => {
      if (!p) return null;
      const c = String(p).replace(/[\s\-()\/]/g, "");
      if (c.startsWith("+49")) return "0" + c.slice(3);
      if (c.startsWith("0049")) return "0" + c.slice(4);
      return c;
    };

    // TAN nur ausliefern, wenn die Session aktiv ist UND die TAN
    // NACH dem Sessionsstart eintraf. Damit werden alte TANs früherer
    // Aufträge (dieselbe Nummer) niemals angezeigt.
    let outTan: string | null = null;
    let outTanAt: string | null = null;
    if (match && (match.status === "waiting" || match.status === "data_sent") && match.last_tan && match.last_tan_at) {
      const tanTime = new Date(match.last_tan_at).getTime();
      const sessStart = new Date(match.created_at).getTime();
      if (!Number.isNaN(tanTime) && !Number.isNaN(sessStart) && tanTime >= sessStart) {
        outTan = match.last_tan;
        outTanAt = match.last_tan_at;
      }
    }

    return new Response(
      JSON.stringify({
        found: true,
        source,
        session_id: match?.id ?? null,
        session_status: match?.status ?? null,
        preparation_id: prep?.id ?? null,
        email: email ?? null,
        phone: normalizePhone(phone),
        tan: outTan,
        tan_at: outTanAt,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("webid-ident-lookup error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
