// TEMPORARY maintenance function used to replay schema migrations after the
// Supabase project was recreated. Delete after the restore is complete.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import postgres from "npm:postgres@3.4.4";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const key = req.headers.get("x-replay-key") ?? "";
  const expected = Deno.env.get("DB_REPLAY_KEY") ?? "";
  if (!expected || key !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) {
    return new Response(JSON.stringify({ error: "SUPABASE_DB_URL missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sql: string;
  try {
    const body = await req.json();
    sql = String(body?.sql ?? "");
  } catch {
    return new Response(JSON.stringify({ error: "invalid body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!sql.trim()) {
    return new Response(JSON.stringify({ error: "empty sql" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const client = postgres(dbUrl, { max: 1, prepare: false, idle_timeout: 5 });
  try {
    const result = await client.unsafe(sql);
    return new Response(JSON.stringify({ ok: true, rows: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    await client.end({ timeout: 5 });
  }
});
