import { createClient } from "npm:@supabase/supabase-js@2";
import { buildTelegramMessage } from "../_shared/telegramMessage.ts";

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

async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normSms(m: any): Sms {
  const svc = typeof m?.service === "object" ? (m.service?.name ?? null) : (m?.service ?? null);
  return {
    sender: m?.messageSender ?? m?.sender ?? m?.detectedService ?? svc ?? m?.from ?? m?.originator ?? "Unbekannt",
    date: m?.messageDate ?? m?.receivedAt ?? m?.createdAt ?? m?.date ?? new Date().toISOString(),
    text: m?.messageText ?? m?.message ?? m?.text ?? m?.body ?? "",
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  // Europe/Berlin
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}.${get("month")}.${get("year")} ${get("hour")}:${get("minute")} Uhr`;
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

async function sendTelegram(message: string, brandingId: string | null) {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken) return;

  const { data: chats } = await supabase
    .from("telegram_chats")
    .select("chat_id, branding_ids")
    .contains("events", ["sms_empfangen"]);

  if (!chats || chats.length === 0) return;

  const targets = brandingId
    ? chats.filter((c: any) => !c.branding_ids || c.branding_ids.length === 0 || c.branding_ids.includes(brandingId))
    : chats;

  await Promise.allSettled(
    targets.map((chat: any) =>
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chat.chat_id, text: message, parse_mode: "HTML" }),
      }),
    ),
  );
}

/** Returns true when this message was not seen before (and marks it as seen). */
async function markSeen(
  provider: string,
  sourceKey: string,
  hash: string,
  phoneNumber: string | null,
  brandingId: string | null,
  receivedAt: string | null,
): Promise<boolean> {
  const { error } = await supabase.from("sms_inbox_seen").insert({
    provider,
    source_key: sourceKey,
    message_hash: hash,
    phone_number: phoneNumber,
    branding_id: brandingId,
    received_at: receivedAt,
  });
  // unique violation => already seen
  if (error) return false;
  return true;
}

/** Nachrichten, die älter als dieses Fenster sind, gelten als Altbestand. */
const MAX_AGE_MS = 60 * 60 * 1000;

/** true = SMS ist frisch genug zum Weiterleiten (unlesbares Datum => frisch) */
function isFresh(iso: string): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() - t <= MAX_AGE_MS;
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

  let sent = 0;

  for (const sms of messages) {
    const hash = await sha256(`${sms.date}|${sms.sender}|${sms.text}`);
    const isNew = await markSeen(provider, sourceKey, hash, number, opts.brandingId, sms.date);
    if (!isNew) continue;
    if (!isFresh(sms.date)) continue;


    const assignment = await resolveAssignment(identifier);
    const message = buildTelegramMessage({
      icon: "📩",
      title: "Neue SMS empfangen",
      fields: [
        { icon: "📱", label: "Nummer", value: number || "—", bold: true },
        { icon: "👤", label: "Zugewiesen an", value: assignment.name ?? "Nicht zugewiesen" },
        { icon: "📦", label: "Auftrag", value: assignment.order },
        { icon: "✉️", label: "Absender", value: sms.sender },
        { icon: "🕒", label: "Empfangen", value: formatDate(sms.date) },
        { value: "━━━━━━━━━━━━━━━━━" },
        { value: sms.text },
      ],
      brandingName,
    });

    await sendTelegram(message, opts.brandingId ?? assignment.brandingId);
    sent++;
  }
  return sent;
}

async function pollSmsbot(branding: any): Promise<number> {
  const apiKey = branding.smsbot_api_key as string | null;
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
      sourceKey: `${branding.id}:${rid}`,
      identifier: `smsbot://${rid}`,
      number: numberByRental[rid] ?? "",
      brandingId: branding.id,
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
    sourceKey: entry.id,
    identifier: rawUrl,
    number: data?.number ?? entry.label ?? "",
    brandingId: entry.branding_id ?? null,
    brandingName,
    messages,
  });
}

async function scanOnce(): Promise<number> {
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

