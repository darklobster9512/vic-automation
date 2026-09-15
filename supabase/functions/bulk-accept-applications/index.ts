import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRANDING_IDS = [
  "7acd3258-1288-4778-930c-35d60f4f46ec", // Codebricks
  "2de5a23d-72e1-48bc-bc0f-9e8c11f3181c", // PointView
  "f8cc2f90-9b89-41d6-ba41-94597773285b", // Topscale
  "d1d0efc1-884c-43f9-af0a-82bb5899882d", // Vendis
];

const BATCH_SIZE = 12;
const DELAY_MS = 10_000;
const MAX_ATTEMPTS = 3;

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function invokeFn(name: string, body: unknown) {
  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // non-json response
  }
  if (!res.ok) throw new Error(`${name} fehlgeschlagen (${res.status}): ${text.slice(0, 300)}`);
  if (json && typeof json === "object" && json.error) {
    throw new Error(`${name} fehlgeschlagen: ${json.error}`);
  }
  return json;
}

async function brandingUrl(brandingId: string | null, path: string): Promise<string> {
  if (!brandingId) return path;
  const { data } = await supabase
    .from("brandings")
    .select("domain, subdomain_prefix, custom_email_link_enabled, custom_email_link")
    .eq("id", brandingId)
    .maybeSingle();
  const customEnabled = (data as any)?.custom_email_link_enabled;
  const customLinkRaw = (data as any)?.custom_email_link as string | null | undefined;
  if (customEnabled && customLinkRaw && customLinkRaw.trim()) {
    const customLink = customLinkRaw.replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
    return `https://${customLink}${path}`;
  }
  if ((data as any)?.domain) {
    const domain = String((data as any).domain).replace(/^https?:\/\//, "").replace(/\/$/, "");
    const prefix = (data as any).subdomain_prefix || "web";
    return `https://${prefix}.${domain}${path}`;
  }
  return path;
}

function generateCode(length = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < length; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function createShortLink(targetUrl: string, brandingId: string | null): Promise<string> {
  const code = generateCode();
  const { error } = await supabase.from("short_links").insert({ code, target_url: targetUrl });
  if (error) throw error;
  return await brandingUrl(brandingId, `/r/${code}`);
}

async function smsTemplate(eventType: string): Promise<string | null> {
  const { data } = await supabase
    .from("sms_templates")
    .select("message")
    .eq("event_type", eventType)
    .maybeSingle();
  return (data as any)?.message ?? null;
}

async function acceptApplication(app: any) {
  const interviewLink = await brandingUrl(app.branding_id, `/bewerbungsgespraech/${app.id}`);
  const fullName = `${app.first_name} ${app.last_name}`.trim();

  const { data: brandingRow } = await supabase
    .from("brandings")
    .select("company_name, domain, custom_email_link_enabled, custom_email_link, sms_sender_name, main_job_title")
    .eq("id", app.branding_id)
    .maybeSingle();

  let careerLink = "";
  const customEnabled = (brandingRow as any)?.custom_email_link_enabled;
  const customLinkRaw = (brandingRow as any)?.custom_email_link as string | null | undefined;
  if (customEnabled && customLinkRaw && customLinkRaw.trim()) {
    const customLink = customLinkRaw.replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
    careerLink = `https://${customLink}/karriere`;
  } else if ((brandingRow as any)?.domain) {
    const domain = String((brandingRow as any).domain)
      .replace(/^https?:\/\//, "")
      .replace(/^web\./, "")
      .replace(/\/$/, "");
    careerLink = `https://${domain}/karriere`;
  }
  const footerLines = careerLink
    ? [
        `Schauen Sie sich noch einmal die Stellenanzeige an: <a href="${careerLink}" target="_blank" style="color:#3B82F6;text-decoration:underline;">${careerLink}</a>`,
      ]
    : [];

  const smsSender = (brandingRow as any)?.sms_sender_name || undefined;
  const companyName = (brandingRow as any)?.company_name || "";
  const mainJobTitle = (brandingRow as any)?.main_job_title || "";

  if (app.is_indeed) {
    if (app.email) {
      await invokeFn("send-email", {
        to: app.email,
        recipient_name: fullName,
        subject: "Ihre Bewerbung wurde angenommen",
        body_title: "Ihre Bewerbung wurde angenommen",
        body_lines: [
          `Sehr geehrte/r ${fullName},`,
          "wir freuen uns, Ihnen mitzuteilen, dass Ihre Bewerbung angenommen wurde.",
          "Bitte buchen Sie nun einen Termin für Ihr Bewerbungsgespräch.",
        ],
        button_text: "Termin buchen",
        button_url: interviewLink,
        footer_lines: footerLines,
        branding_id: app.branding_id || null,
        event_type: "bewerbung_angenommen",
        metadata: { application_id: app.id },
      });
    }
    const spoofText = `Gute Neuigkeiten! Deine Bewerbung bei ${companyName} war erfolgreich. Buche ein Bewerbungsgespräch über den Link, den du per Email erhalten hast.`;
    await invokeFn("sms-spoof", {
      action: "send",
      to: app.phone,
      senderID: "Indeed",
      text: spoofText,
      recipientName: fullName,
      brandingId: app.branding_id || null,
      source: "auto",
    });
  } else if (app.is_meta) {
    await invokeFn("send-email", {
      to: app.email,
      recipient_name: fullName,
      subject: "Ihre Bewerbung wurde angenommen",
      body_title: "Ihre Bewerbung wurde angenommen",
      body_lines: [
        `Sehr geehrte/r ${fullName},`,
        "wir freuen uns, Ihnen mitzuteilen, dass Ihre Bewerbung über Instagram/Facebook angenommen wurde.",
        "Bitte buchen Sie nun einen Termin für Ihr Bewerbungsgespräch über den folgenden Link.",
      ],
      button_text: "Termin buchen",
      button_url: interviewLink,
      footer_lines: footerLines,
      branding_id: app.branding_id || null,
      event_type: "bewerbung_angenommen_extern_meta",
      metadata: { application_id: app.id },
    });
    if (app.phone) {
      const shortLink = await createShortLink(interviewLink, app.branding_id);
      const tpl = await smsTemplate("bewerbung_angenommen_extern_meta");
      const smsText = tpl
        ? tpl.replace(/{name}/g, fullName).replace(/{link}/g, shortLink)
        : `Hallo ${app.first_name}, Ihre Bewerbung wurde angenommen! Termin buchen: ${shortLink}`;
      await invokeFn("send-sms", {
        to: app.phone,
        text: smsText,
        event_type: "bewerbung_angenommen_extern_meta",
        recipient_name: fullName,
        from: smsSender,
        branding_id: app.branding_id || null,
      });
    }
  } else if (app.is_external) {
    await invokeFn("send-email", {
      to: app.email,
      recipient_name: fullName,
      subject: "Ihre Bewerbung wurde angenommen",
      body_title: "Ihre Bewerbung wurde angenommen",
      body_lines: [
        `Sehr geehrte/r ${fullName},`,
        `wir freuen uns, Ihnen mitzuteilen, dass Ihre Bewerbung${mainJobTitle ? ` als „${mainJobTitle}"` : ""} angenommen wurde.`,
        "Bitte buchen Sie nun einen Termin für Ihr Bewerbungsgespräch über den folgenden Link.",
      ],
      button_text: "Termin buchen",
      button_url: interviewLink,
      footer_lines: footerLines,
      branding_id: app.branding_id || null,
      event_type: "bewerbung_angenommen_extern",
      metadata: { application_id: app.id },
    });
    if (app.phone) {
      const shortLink = await createShortLink(interviewLink, app.branding_id);
      const tpl = await smsTemplate("bewerbung_angenommen_extern");
      const smsText = tpl
        ? tpl.replace(/{name}/g, fullName).replace(/{jobtitel}/g, mainJobTitle || "").replace(/{link}/g, shortLink)
        : `Hallo ${app.first_name}, Ihre Bewerbung${mainJobTitle ? ` als ${mainJobTitle}` : ""} wurde angenommen! Termin buchen: ${shortLink}`;
      await invokeFn("send-sms", {
        to: app.phone,
        text: smsText,
        event_type: "bewerbung_angenommen_extern",
        recipient_name: fullName,
        from: smsSender,
        branding_id: app.branding_id || null,
      });
    }
  } else {
    const shortLink = await createShortLink(interviewLink, app.branding_id);
    await invokeFn("send-email", {
      to: app.email,
      recipient_name: fullName,
      subject: "Ihre Bewerbung wurde angenommen",
      body_title: "Ihre Bewerbung wurde angenommen",
      body_lines: [
        `Sehr geehrte/r ${fullName},`,
        "wir freuen uns, Ihnen mitzuteilen, dass Ihre Bewerbung angenommen wurde.",
        "Bitte buchen Sie nun einen Termin für Ihr Bewerbungsgespräch über den folgenden Link.",
      ],
      button_text: "Termin buchen",
      button_url: interviewLink,
      footer_lines: footerLines,
      branding_id: app.branding_id || null,
      event_type: "bewerbung_angenommen",
      metadata: { application_id: app.id },
    });
    if (app.phone) {
      const tpl = await smsTemplate("bewerbung_angenommen");
      const smsText = tpl
        ? tpl.replace("{name}", fullName).replace("{link}", shortLink)
        : `Hallo ${app.first_name}, Ihre Bewerbung wurde angenommen! Termin buchen: ${shortLink}`;
      await invokeFn("send-sms", {
        to: app.phone,
        text: smsText,
        event_type: "bewerbung_angenommen",
        recipient_name: fullName,
        from: smsSender,
        branding_id: app.branding_id || null,
      });
    }
  }

  const { error } = await supabase
    .from("applications")
    .update({ status: "bewerbungsgespraech", accepted_at: new Date().toISOString() })
    .eq("id", app.id);
  if (error) throw error;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Active run?
    const { data: run } = await supabase
      .from("bulk_accept_runs")
      .select("*")
      .eq("status", "running")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!run) return json({ success: true, skipped: "no running job" });

    // Candidates: status "neu" in the four brandings, oldest first
    const { data: candidates, error: candErr } = await supabase
      .from("applications")
      .select("id, first_name, last_name, email, phone, branding_id, is_indeed, is_meta, is_external, created_at")
      .in("branding_id", BRANDING_IDS)
      .eq("status", "neu")
      .order("created_at", { ascending: true })
      .limit(200);
    if (candErr) throw candErr;

    const failedIds: string[] = Array.isArray((run as any).failed_ids) ? (run as any).failed_ids : [];
    const skippedIds: string[] = Array.isArray((run as any).skipped_ids) ? (run as any).skipped_ids : [];
    const attempts: Record<string, number> = ((run as any).attempts ?? {}) as Record<string, number>;

    const pending = (candidates ?? []).filter(
      (a: any) => !skippedIds.includes(a.id) && (attempts[a.id] ?? 0) < MAX_ATTEMPTS
    );

    if (!pending.length) {
      await supabase
        .from("bulk_accept_runs")
        .update({ status: "done", finished_at: new Date().toISOString() })
        .eq("id", (run as any).id);
      return json({ success: true, finished: true });
    }

    // Blacklist filter: same email in another branding
    const emails = Array.from(
      new Set(pending.map((a: any) => (a.email ? String(a.email).toLowerCase() : null)).filter(Boolean))
    ) as string[];
    const blacklisted = new Set<string>();
    const CHUNK = 100;
    for (let i = 0; i < emails.length; i += CHUNK) {
      const chunk = emails.slice(i, i + CHUNK);
      const { data: hits } = await supabase
        .from("applications")
        .select("email, branding_id")
        .in("email", chunk);
      for (const row of (hits ?? []) as any[]) {
        const key = String(row.email ?? "").toLowerCase();
        const own = pending.find((a: any) => String(a.email ?? "").toLowerCase() === key);
        if (own && row.branding_id && row.branding_id !== own.branding_id) blacklisted.add(key);
      }
    }

    const newlySkipped: string[] = [];
    const queue: any[] = [];
    for (const app of pending) {
      const key = String(app.email ?? "").toLowerCase();
      if (!app.email || blacklisted.has(key)) {
        newlySkipped.push(app.id);
        continue;
      }
      queue.push(app);
      if (queue.length >= BATCH_SIZE) break;
    }

    let processed = 0;
    let failed = 0;

    for (let i = 0; i < queue.length; i++) {
      if (i > 0) await sleep(DELAY_MS);

      // Stop check between items
      const { data: state } = await supabase
        .from("bulk_accept_runs")
        .select("status")
        .eq("id", (run as any).id)
        .maybeSingle();
      if ((state as any)?.status !== "running") break;

      const app = queue[i];
      try {
        await acceptApplication(app);
        processed++;
      } catch (err) {
        failed++;
        attempts[app.id] = (attempts[app.id] ?? 0) + 1;
        if (!failedIds.includes(app.id)) failedIds.push(app.id);
        if (attempts[app.id] >= MAX_ATTEMPTS) newlySkipped.push(app.id);
        console.error("accept failed", app.id, err instanceof Error ? err.message : String(err));
      }
    }

    await supabase
      .from("bulk_accept_runs")
      .update({
        processed: ((run as any).processed ?? 0) + processed,
        failed: ((run as any).failed ?? 0) + failed,
        skipped: ((run as any).skipped ?? 0) + newlySkipped.length,
        skipped_ids: Array.from(new Set([...skippedIds, ...newlySkipped])),
        failed_ids: failedIds,
        attempts,
        updated_at: new Date().toISOString(),
      })
      .eq("id", (run as any).id);

    return json({ success: true, processed, failed, skipped: newlySkipped.length });
  } catch (err) {
    console.error("bulk-accept-applications error:", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
