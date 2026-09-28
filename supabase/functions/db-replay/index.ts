// TEMPORARY: used once to rebuild the schema. Delete after use.
import postgres from "npm:postgres@3.4.4";

Deno.serve(async (req) => {
  const key = Deno.env.get("DB_REPLAY_KEY");
  if (!key || req.headers.get("x-replay-key") !== key) {
    return new Response("forbidden", { status: 403 });
  }
  const sqlText = await req.text();
  const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
  try {
    await sql.unsafe(sqlText).simple();
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String((e as Error).message), detail: (e as any).detail, position: (e as any).position }, { status: 400 });
  } finally {
    await sql.end();
  }
});
