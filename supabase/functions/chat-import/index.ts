import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const TOKEN = "imp_7Yq2Lm9Xb4Vt1Rk8";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.headers.get("x-import-token") !== TOKEN) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const body = await req.json();
  const rows = body?.rows;
  if (!Array.isArray(rows)) {
    return new Response(JSON.stringify({ error: "rows required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const { error, count } = await supabase.from("chat_messages").insert(rows, { count: "exact" });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify({ inserted: count ?? rows.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
