import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DEFAULT_TARGETS: Record<number, number> = { 5: 2, 10: 3, 20: 3, 25: 4 };
const FALLBACK_TARGET = 4;

function berlinNow() {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  const weekdayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: parseInt(parts.hour, 10),
    minute: parseInt(parts.minute, 10),
    isoDow: weekdayMap[parts.weekday as string] ?? 0,
  };
}

function parseHours(title: string): number | null {
  const m = title.match(/(\d+)\s*(?:stunden|std\.?|h)\b/i) || title.match(/(\d+)\s*std/i);
  return m ? parseInt(m[1], 10) : null;
}

async function fetchAll<T>(build: (from: number, to: number) => any): Promise<T[]> {
  const pageSize = 1000;
  let from = 0;
  const out: T[] = [];
  while (true) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw error;
    const batch = (data ?? []) as T[];
    out.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

function pickRandom<T>(items: T[], count: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (pool.length > 0 && out.length < count) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

async function buildBrandingUrl(branding: any, path: string): Promise<string> {
  if (branding?.custom_email_link_enabled && branding?.custom_email_link?.trim()) {
    const link = branding.custom_email_link.replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
    return `https://${link}${path}`;
  }
  if (branding?.domain) {
    const domain = String(branding.domain).replace(/^https?:\/\//, "").replace(/\/$/, "");
    const prefix = branding.subdomain_prefix || "web";
    return `https://${prefix}.${domain}${path}`;
  }
  return path;
}

async function invokeFunction(name: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${name} failed: ${res.status} ${text}`);
  return text;
}

async function notifyOrdersAssigned(
  contract: any,
  orders: any[],
  branding: any,
  smsTemplates: Record<string, string>,
) {
  if (!orders.length) return;
  const name = `${contract.first_name || ""} ${contract.last_name || ""}`.trim();
  const multiple = orders.length > 1;
  const eventType = multiple ? "auftraege_zugewiesen_sammel" : "auftrag_zugewiesen";

  if (contract.email) {
    const portalUrl = await buildBrandingUrl(branding, "/mitarbeiter/auftraege");
    const bodyLines = [
      `Sehr geehrte/r ${name || "Mitarbeiter/in"},`,
      multiple
        ? `Ihnen wurden ${orders.length} neue Aufträge zugewiesen:`
        : "Ihnen wurde ein neuer Auftrag zugewiesen:",
      ...orders.map((o) => `Auftrag: ${o.order_number ? `#${o.order_number} – ` : ""}${o.title}`),
      multiple
        ? "Bitte loggen Sie sich in Ihrem Mitarbeiterportal ein, um die Aufträge einzusehen und zu bearbeiten."
        : "Bitte loggen Sie sich in Ihrem Mitarbeiterportal ein, um den Auftrag einzusehen und zu bearbeiten.",
    ];

    await invokeFunction("send-email", {
      to: contract.email,
      recipient_name: name || undefined,
      subject: multiple ? `${orders.length} neue Aufträge verfügbar` : "Neuer Auftrag verfügbar",
      body_title: multiple
        ? "Ihnen wurden neue Aufträge zugewiesen"
        : "Ihnen wurde ein neuer Auftrag zugewiesen",
      body_lines: bodyLines,
      button_text: multiple ? "Aufträge ansehen" : "Auftrag ansehen",
      button_url: portalUrl,
      branding_id: branding?.id ?? null,
      event_type: eventType,
      metadata: { contract_id: contract.id, order_ids: orders.map((o: any) => o.id), source: "auto_distribution" },
      bypass_queue: true,
    });
  }

  if (contract.phone) {
    const tpl = smsTemplates[eventType];
    const smsText = tpl
      ? tpl
        .replace("{name}", name)
        .replace("{anzahl}", String(orders.length))
        .replace("{auftrag}", orders[0]?.title || "")
      : multiple
        ? `Hallo ${name}, es sind ${orders.length} neue Auftraege fuer Sie verfuegbar. Jetzt im Mitarbeiterportal ansehen.`
        : `Hallo ${name}, Ihnen wurde ein neuer Auftrag zugewiesen: ${orders[0]?.title || ""}`;

    await invokeFunction("send-sms", {
      to: contract.phone,
      text: smsText,
      event_type: eventType,
      recipient_name: name,
      from: branding?.sms_sender_name || undefined,
      branding_id: branding?.id ?? null,
    });
  }
}

async function distributeForBranding(branding: any, today: string) {
  const brandingId = branding.id as string;

  const { data: templates } = await supabase
    .from("contract_templates")
    .select("id, title")
    .eq("branding_id", brandingId);
  const templateHours: Record<string, number> = {};
  (templates ?? []).forEach((t: any) => {
    const h = parseHours(t.title ?? "");
    if (h) templateHours[t.id] = h;
  });

  const contracts = await fetchAll<any>((from, to) =>
    supabase
      .from("employment_contracts")
      .select("id, first_name, last_name, email, phone, user_id, template_id, employment_type, desired_start_date, application_id")
      .eq("branding_id", brandingId)
      .eq("is_suspended", false)
      .not("template_id", "is", null)
      .not("desired_start_date", "is", null)
      .lte("desired_start_date", today)
      .range(from, to)
  );
  if (!contracts.length) return { employees: 0, assignments: 0, warnings: ["Keine passenden Mitarbeiter"] };

  const fwa = await fetchAll<any>((from, to) =>
    supabase
      .from("first_workday_appointments")
      .select("contract_id, application_id")
      .eq("status", "erfolgreich")
      .range(from, to)
  );
  const okContracts = new Set(fwa.map((a) => a.contract_id).filter(Boolean));
  const okApplications = new Set(fwa.map((a) => a.application_id).filter(Boolean));

  const eligible = contracts.filter(
    (c) => okContracts.has(c.id) || (c.application_id && okApplications.has(c.application_id))
  );
  if (!eligible.length) return { employees: 0, assignments: 0, warnings: ["Keine Mitarbeiter mit erfolgreichem 1. Arbeitstag"] };

  const placeholders = await fetchAll<any>((from, to) =>
    supabase
      .from("orders")
      .select("id, title, order_number")
      .eq("branding_id", brandingId)
      .eq("is_placeholder", true)
      .range(from, to)
  );
  const ordersById: Record<string, any> = {};
  placeholders.forEach((o) => { ordersById[o.id] = o; });

  const assignments: any[] = [];
  const contractIds = eligible.map((c) => c.id);
  for (let i = 0; i < contractIds.length; i += 100) {
    const chunk = contractIds.slice(i, i + 100);
    const rows = await fetchAll<any>((from, to) =>
      supabase
        .from("order_assignments")
        .select("order_id, contract_id, assigned_at")
        .in("contract_id", chunk)
        .range(from, to)
    );
    assignments.push(...rows);
  }
  const assignedByContract: Record<string, Set<string>> = {};
  const todayCount: Record<string, number> = {};
  assignments.forEach((a) => {
    (assignedByContract[a.contract_id] ??= new Set()).add(a.order_id);
    if (String(a.assigned_at ?? "").slice(0, 10) === today) {
      todayCount[a.contract_id] = (todayCount[a.contract_id] || 0) + 1;
    }
  });

  const { data: targetRows } = await supabase
    .from("distribution_targets")
    .select("hours, orders_per_day")
    .eq("branding_id", brandingId);
  const targets: Record<number, number> = {};
  (targetRows ?? []).forEach((r: any) => { targets[r.hours] = r.orders_per_day; });

  const { data: tplRows } = await supabase
    .from("sms_templates")
    .select("event_type, message")
    .in("event_type", ["auftrag_zugewiesen", "auftraege_zugewiesen_sammel"]);
  const smsTemplates: Record<string, string> = {};
  (tplRows ?? []).forEach((r: any) => { if (r.message) smsTemplates[r.event_type] = r.message; });

  const warnings: string[] = [];
  let employeesServed = 0;
  let assignmentsCreated = 0;

  for (const c of eligible) {
    const fromTemplate = templateHours[c.template_id] ?? null;
    const hours = fromTemplate ?? (String(c.employment_type ?? "").toLowerCase().includes("minijob") ? 5 : 0);
    const target = targets[hours] ?? DEFAULT_TARGETS[hours] ?? FALLBACK_TARGET;
    const missing = target - (todayCount[c.id] ?? 0);
    if (missing <= 0) continue;

    const already = assignedByContract[c.id] ?? new Set<string>();
    const available = placeholders.filter((o) => !already.has(o.id));
    if (!available.length) {
      warnings.push(`${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() + ": keine freien Platzhalteraufträge");
      continue;
    }
    const picked = pickRandom(available, missing);
    if (picked.length < missing) {
      warnings.push(
        `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() + `: nur ${picked.length} von ${missing} möglich`
      );
    }

    const { error: insErr } = await supabase
      .from("order_assignments")
      .insert(picked.map((o) => ({ order_id: o.id, contract_id: c.id })));
    if (insErr) {
      warnings.push(`${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() + `: Fehler (${insErr.message})`);
      continue;
    }

    employeesServed += 1;
    assignmentsCreated += picked.length;

    try {
      await notifyOrdersAssigned(c, picked, branding, smsTemplates);
    } catch (err) {
      warnings.push(`${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() + `: Benachrichtigung fehlgeschlagen`);
      console.error("notify failed", err);
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  return { employees: employeesServed, assignments: assignmentsCreated, warnings };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "1";
    const now = berlinNow();

    if (!force) {
      if (now.isoDow > 5) {
        return new Response(JSON.stringify({ skipped: "weekend", now }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (now.hour !== 8 || now.minute > 14) {
        return new Response(JSON.stringify({ skipped: "outside_window", now }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: brandings, error: bErr } = await supabase
      .from("brandings")
      .select("id, company_name, domain, subdomain_prefix, custom_email_link_enabled, custom_email_link, sms_sender_name")
      .eq("auto_distribution_enabled", true);
    if (bErr) throw bErr;

    const results: any[] = [];
    for (const branding of brandings ?? []) {
      const { data: existing } = await supabase
        .from("auto_distribution_runs")
        .select("id")
        .eq("branding_id", branding.id)
        .eq("run_date", now.date)
        .maybeSingle();
      if (existing) {
        results.push({ branding: branding.company_name, skipped: "already_ran" });
        continue;
      }

      // Reserve the day immediately to prevent a parallel double run.
      const { error: lockErr } = await supabase
        .from("auto_distribution_runs")
        .insert({ branding_id: branding.id, run_date: now.date });
      if (lockErr) {
        results.push({ branding: branding.company_name, skipped: "locked" });
        continue;
      }

      try {
        const res = await distributeForBranding(branding, now.date);
        await supabase
          .from("auto_distribution_runs")
          .update({
            employees_served: res.employees,
            assignments_created: res.assignments,
            warnings: res.warnings,
          })
          .eq("branding_id", branding.id)
          .eq("run_date", now.date);
        results.push({ branding: branding.company_name, ...res });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await supabase
          .from("auto_distribution_runs")
          .update({ warnings: [`Fehler: ${msg}`] })
          .eq("branding_id", branding.id)
          .eq("run_date", now.date);
        results.push({ branding: branding.company_name, error: msg });
      }
    }

    return new Response(JSON.stringify({ ok: true, now, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("auto-distribute-orders error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
