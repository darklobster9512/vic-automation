import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const TOKEN = "imp_3Fz8Qw6Nc2Hd5Ls0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.headers.get("x-import-token") !== TOKEN) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { items } = await req.json();
  if (!Array.isArray(items)) {
    return new Response(JSON.stringify({ error: "items required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  let updated = 0;
  const errors: string[] = [];
  for (const it of items) {
    const { data, error } = await supabase
      .from("orders")
      .update({
        description: it.description,
        project_goal: it.project_goal,
        work_steps: it.work_steps,
        review_questions: it.review_questions,
        required_attachments: it.required_attachments,
        reward: "0",
        estimated_hours: "0",
        is_starter_job: !!it.is_starter_job,
      })
      .eq("title", it.title)
      .select("id");
    if (error) errors.push(`${it.title}: ${error.message}`);
    else updated += data?.length ?? 0;
  }
  return new Response(JSON.stringify({ updated, errors }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
