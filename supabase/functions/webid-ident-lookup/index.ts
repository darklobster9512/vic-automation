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
      .select("id, test_data, phone_api_url, last_tan, last_tan_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (sErr) throw sErr;

    let match: any = (sessions ?? []).find((s: any) => testDataContainsAid(s.test_data, aid!));

    // 2) Fallback: first_workday_preparations
    let source: "session" | "prep" | null = match ? "session" : null;
    let prep: any = null;
    if (!match) {
      const { data: preps, error: pErr } = await supabase
        .from("first_workday_preparations")
        .select("id, test_data, phone_api_url, updated_at, contract_id")
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

    const td = (match ?? prep).test_data;
    const email =
      findInTestData(td, /^e[-\s]?mail$|^email$/i) ??
      findInTestData(td, /mail/i);
    const phoneFromTd = findInTestData(td, /telefon|phone|nummer|rufnummer/i);

    // Rufnummer aus phone_api_url via phone_numbers
    let phone = phoneFromTd;
    const apiUrl = (match ?? prep).phone_api_url as string | null;
    if (!phone && apiUrl) {
      const { data: pn } = await supabase
        .from("phone_numbers")
        .select("label")
        .eq("api_url", apiUrl)
        .maybeSingle();
      if (pn?.label) phone = pn.label as string;
    }

    return new Response(
      JSON.stringify({
        found: true,
        source,
        session_id: match?.id ?? null,
        preparation_id: prep?.id ?? null,
        email: email ?? null,
        phone: phone ?? null,
        tan: match?.last_tan ?? null,
        tan_at: match?.last_tan_at ?? null,
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
