import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-import-key",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const key = req.headers.get("x-import-key");
  if (!key || key !== Deno.env.get("RESTORE_IMPORT_KEY")) return json({ error: "unauthorized" }, 401);

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    const action = String(body.action ?? "");
    const rows: any[] = Array.isArray(body.rows) ? body.rows : [];

    if (action === "employees") {
      const out: any[] = [];
      for (const r of rows) {
        let userId: string | null = null;
        const { data: created, error: authErr } = await db.auth.admin.createUser({
          email: r.email,
          password: r.password,
          email_confirm: true,
          user_metadata: { full_name: r.name },
        });
        if (authErr) {
          // user may already exist
          const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1 });
          void list;
          out.push({ email: r.email, error: authErr.message });
        } else {
          userId = created.user?.id ?? null;
        }

        const { data: app } = await db
          .from("applications")
          .select("id")
          .eq("email", r.email)
          .eq("branding_id", r.branding_id)
          .limit(1)
          .maybeSingle();

        const parts = String(r.name ?? "").trim().split(/\s+/);
        const firstName = parts.shift() ?? null;
        const lastName = parts.join(" ") || null;

        const { data: contract, error: cErr } = await db
          .from("employment_contracts")
          .insert({
            application_id: app?.id ?? null,
            branding_id: r.branding_id,
            user_id: userId,
            first_name: firstName,
            last_name: lastName,
            email: r.email,
            phone: r.phone ?? null,
            employment_type: r.employment_type ?? null,
            desired_start_date: r.start ?? null,
            status: r.status ?? "offen",
            submitted_at: r.submitted_at ?? null,
            temp_password: r.password,
            created_at: r.created_at ?? null,
          })
          .select("id")
          .single();

        if (cErr) out.push({ email: r.email, error: cErr.message });
        else out.push({ email: r.email, contract_id: contract.id, user_id: userId });
      }
      return json({ results: out });
    }

    if (action === "orders") {
      const { data, error } = await db.from("orders").insert(rows).select("id, title, branding_id");
      if (error) throw error;
      return json({ inserted: data?.length ?? 0 });
    }

    if (action === "reviews") {
      // rows: { email, branding_id, title, rating, comment, questions, date }
      const emails = [...new Set(rows.map((r) => r.email))];
      const titles = [...new Set(rows.map((r) => r.title))];
      const brandings = [...new Set(rows.map((r) => r.branding_id))];

      const { data: contracts } = await db
        .from("employment_contracts")
        .select("id, email, branding_id")
        .in("email", emails);
      const { data: orders } = await db
        .from("orders")
        .select("id, title, branding_id")
        .in("title", titles)
        .in("branding_id", brandings);

      const cMap = new Map((contracts ?? []).map((c: any) => [`${c.email}|${c.branding_id}`, c.id]));
      const oMap = new Map((orders ?? []).map((o: any) => [`${o.title}|${o.branding_id}`, o.id]));

      const assignments: any[] = [];
      const reviews: any[] = [];
      const errors: string[] = [];
      for (const r of rows) {
        const cid = cMap.get(`${r.email}|${r.branding_id}`);
        const oid = oMap.get(`${r.title}|${r.branding_id}`);
        if (!cid || !oid) {
          errors.push(`${r.email} | ${r.title}`);
          continue;
        }
        assignments.push({
          order_id: oid,
          contract_id: cid,
          status: "erfolgreich",
          review_unlocked: true,
          assigned_at: r.date,
        });
        reviews.push({
          order_id: oid,
          contract_id: cid,
          question: "Gesamtbewertung",
          rating: Math.round(Number(r.rating) || 5),
          comment: r.comment ?? "",
          created_at: r.date,
        });
      }

      if (assignments.length) {
        const { error: aErr } = await db.from("order_assignments").insert(assignments);
        if (aErr) errors.push(`assignments: ${aErr.message}`);
      }
      if (reviews.length) {
        const { error: rErr } = await db.from("order_reviews").insert(reviews);
        if (rErr) errors.push(`reviews: ${rErr.message}`);
      }
      return json({ assignments: assignments.length, reviews: reviews.length, errors: errors.slice(0, 5), errorCount: errors.length });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
