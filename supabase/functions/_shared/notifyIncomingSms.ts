// Direkte Telegram-Meldung "Neue SMS empfangen" — wird von anosim-proxy und
// smsbot-proxy in dem Moment aufgerufen, in dem der Browser die SMS abruft.
// Idempotent über public.sms_inbox_seen (unique provider,source_key,message_hash).
//
// Nur SMS aus dem letzten `MAX_AGE_MS`-Fenster werden gemeldet; ältere werden
// still als gesehen markiert, damit der erste Aufruf einer neu belegten Nummer
// keinen Nachrichten-Schwall auslöst.

import { createClient } from "npm:@supabase/supabase-js@2";
import { buildTelegramMessage } from "./telegramMessage.ts";

export interface IncomingSms {
  sender: string;
  date: string;
  text: string;
}

export interface NotifyOpts {
  provider: "smsbot" | "anosim";
  sourceKey: string;
  identifier: string; // ident_sessions.phone_api_url zum Assignment-Lookup
  phoneNumber: string;
  brandingId: string | null;
  brandingName: string | null;
  messages: IncomingSms[];
}

const MAX_AGE_MS = 60 * 60 * 1000;

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}.${get("month")}.${get("year")} ${get("hour")}:${get("minute")} Uhr`;
}

function isFresh(iso: string): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() - t <= MAX_AGE_MS;
}

async function resolveAssignment(supabase: any, identifier: string) {
  const { data: session } = await supabase
    .from("ident_sessions")
    .select("contract_id, order_id, branding_id, updated_at")
    .eq("phone_api_url", identifier)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!session) return { name: null as string | null, order: null as string | null, brandingId: null as string | null };

  let name: string | null = null;
  let order: string | null = null;
  if (session.contract_id) {
    const { data: c } = await supabase
      .from("employment_contracts")
      .select("first_name, last_name")
      .eq("id", session.contract_id)
      .maybeSingle();
    if (c) name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || null;
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

async function sendTelegram(
  supabase: any,
  message: string,
  brandingId: string | null,
) {
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

export async function notifyIncomingSms(opts: NotifyOpts): Promise<number> {
  if (!opts.messages || opts.messages.length === 0) return 0;
  const supabase = serviceClient();

  // Bereits gesehene Hashes für diese Quelle laden (letzte 30 Tage)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: seenRows } = await supabase
    .from("sms_inbox_seen")
    .select("message_hash")
    .eq("provider", opts.provider)
    .eq("source_key", opts.sourceKey)
    .gte("created_at", since)
    .limit(2000);
  const seen = new Set<string>((seenRows ?? []).map((r: any) => r.message_hash as string));

  const newRows: Record<string, unknown>[] = [];
  const toForward: IncomingSms[] = [];

  for (const sms of opts.messages) {
    const hash = await sha256(`${sms.date}|${sms.sender}|${sms.text}`);
    if (seen.has(hash)) continue;
    seen.add(hash);
    newRows.push({
      provider: opts.provider,
      source_key: opts.sourceKey,
      message_hash: hash,
      phone_number: opts.phoneNumber || null,
      branding_id: opts.brandingId,
      received_at: sms.date,
    });
    if (isFresh(sms.date)) toForward.push(sms);
  }

  if (newRows.length > 0) {
    const { error } = await supabase
      .from("sms_inbox_seen")
      .upsert(newRows, { onConflict: "provider,source_key,message_hash", ignoreDuplicates: true });
    if (error) console.warn("sms_inbox_seen upsert failed:", error.message);
  }

  if (toForward.length === 0) return 0;

  const assignment = await resolveAssignment(supabase, opts.identifier);

  let sent = 0;
  for (const sms of toForward) {
    const message = buildTelegramMessage({
      icon: "📩",
      title: "Neue SMS empfangen",
      fields: [
        { icon: "📱", label: "Nummer", value: opts.phoneNumber || "—", bold: true },
        { icon: "👤", label: "Zugewiesen an", value: assignment.name ?? "Nicht zugewiesen" },
        { icon: "📦", label: "Auftrag", value: assignment.order },
        { icon: "✉️", label: "Absender", value: sms.sender },
        { icon: "🕒", label: "Empfangen", value: formatDate(sms.date) },
        { value: "━━━━━━━━━━━━━━━━━" },
        { value: sms.text },
      ],
      brandingName: opts.brandingName,
    });
    try {
      await sendTelegram(supabase, message, opts.brandingId ?? assignment.brandingId);
      sent++;
    } catch (e) {
      console.error("sendTelegram sms_empfangen failed:", e);
    }
  }
  return sent;
}
