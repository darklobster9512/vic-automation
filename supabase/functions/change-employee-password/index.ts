import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);

    const callerId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => null);
    const current_password = typeof body?.current_password === "string" ? body.current_password : "";
    const new_password = typeof body?.new_password === "string" ? body.new_password : "";

    if (!current_password || !new_password) {
      return json({ error: "Aktuelles und neues Passwort erforderlich." }, 400);
    }
    if (new_password.length < 6 || new_password.length > 100) {
      return json({ error: "Neues Passwort muss zwischen 6 und 100 Zeichen lang sein." }, 400);
    }
    if (new_password === current_password) {
      return json({ error: "Das neue Passwort muss sich vom aktuellen unterscheiden." }, 400);
    }

    const adminClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Resolve the caller's email from auth
    const { data: userData, error: userErr } = await adminClient.auth.admin.getUserById(callerId);
    const email = userData?.user?.email;
    if (userErr || !email) return json({ error: "Benutzer nicht gefunden." }, 404);

    // Verify current password with an isolated client (does not touch browser session)
    const verifyClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInErr } = await verifyClient.auth.signInWithPassword({
      email,
      password: current_password,
    });
    if (signInErr) return json({ error: "Aktuelles Passwort ist falsch." }, 400);

    const { error: updateErr } = await adminClient.auth.admin.updateUserById(callerId, {
      password: new_password,
    });
    if (updateErr) return json({ error: updateErr.message }, 500);

    // Keep the cleartext copy in sync on the employee's contract(s)
    await adminClient
      .from("employment_contracts")
      .update({ temp_password: new_password })
      .eq("user_id", callerId);

    return json({ success: true });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
