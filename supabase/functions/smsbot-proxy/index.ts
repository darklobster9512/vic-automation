import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE = "https://cabinet.smsbot.cc/api/v1";
const LIST_TTL_MS = 30_000;
const SMS_TTL_MS = 12_000;
const DETAIL_TTL_MS = 12_000;
const BACKOFF_MS = 10_000;

const BACKOFF_KEY = "smsbot:backoff";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

function mapState(raw: string | undefined | null): string {
  const s = (raw ?? "").toLowerCase();
  if (["active", "waiting", "in_progress"].includes(s)) return "active";
  if (["expired", "cancelled", "canceled", "finished", "completed", "ended"].includes(s)) return "ended";
  return raw || "pending";
}

function normSms(m: any) {
  const svc = typeof m?.service === "object" ? (m.service?.name ?? null) : (m?.service ?? null);
  return {
    messageSender:
      m?.sender ?? m?.detectedService ?? svc ?? m?.from ?? m?.originator ?? "Unknown",
    messageDate: m?.receivedAt ?? m?.createdAt ?? m?.date ?? new Date().toISOString(),
    messageText: m?.message ?? m?.text ?? m?.body ?? "",
  };
}

function normRental(r: any) {
  const smsArr = r?.sms ?? r?.messages ?? r?.smsMessages ?? r?.data?.sms ?? r?.data?.messages ?? [];
  const service = Array.isArray(r?.services) && r.services.length > 0
    ? r.services.map((s: any) => s?.name ?? s?.service ?? s).join(", ")
    : (r?.service?.name ?? r?.service ?? r?.detectedService ?? "—");
  return {
    rentalId: r?.id ?? r?.rentalId ?? r?._id ?? "",
    number: r?.number ?? r?.phoneNumber ?? r?.phone ?? "",
    country: r?.country ?? r?.countryCode ?? "",
    rentalType: r?.type ?? r?.rentalType ?? (r?.isFullRental ? "full" : "single"),
    service,
    startDate: r?.createdAt ?? r?.startDate ?? r?.startsAt ?? new Date().toISOString(),
    endDate: r?.expiresAt ?? r?.endDate ?? r?.endsAt ?? r?.expiredAt ?? new Date().toISOString(),
    state: mapState(r?.status ?? r?.state),
    sms: Array.isArray(smsArr) ? smsArr.map(normSms) : [],
  };
}

function jsonResponse(body: unknown, status: number, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

async function cacheGet(key: string): Promise<{ value: any; expired: boolean } | null> {
  const { data, error } = await supabase
    .from("edge_cache")
    .select("value, expires_at")
    .eq("key", key)
    .maybeSingle();
  if (error || !data) return null;
  const expired = new Date(data.expires_at).getTime() < Date.now();
  return { value: data.value, expired };
}

async function cacheSet(key: string, value: unknown, ttlMs: number) {
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  await supabase
    .from("edge_cache")
    .upsert({ key, value: value as any, expires_at: expiresAt, updated_at: new Date().toISOString() });
}

/**
 * Fetch-through cache using Postgres as shared cross-isolate store.
 * Returns { status, body, source: 'HIT'|'MISS'|'STALE' }.
 */
async function cached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<{ ok: true; data: T } | { ok: false; status: number; body: unknown; retryAfter?: string | null }>,
  backoffKey: string,
): Promise<{ status: number; body: unknown; source: string; retryAfter?: string | null }> {
  const cacheKey = `smsbot:${key}`;

  // 1) Fresh cache hit?
  const cached1 = await cacheGet(cacheKey);
  if (cached1 && !cached1.expired) {
    return { status: 200, body: cached1.value, source: "HIT" };
  }

  // 2) Global back-off after 429?
  const backoff = await cacheGet(backoffKey);
  if (backoff && !backoff.expired) {
    if (cached1) return { status: 200, body: cached1.value, source: "STALE" };
    return { status: 429, body: { error: "SMSBot rate-limited, no cache yet", statusCode: 429 }, source: "STALE" };
  }

  // 3) Fetch from origin.
  const result = await fetcher();
  if (result.ok) {
    await cacheSet(cacheKey, result.data, ttlMs);
    return { status: 200, body: result.data, source: "MISS" };
  }
  if (result.status === 429) {
    await cacheSet(backoffKey, { at: Date.now() }, BACKOFF_MS);
    if (cached1) return { status: 200, body: cached1.value, source: "STALE", retryAfter: result.retryAfter };
  }
  return { status: result.status, body: result.body, source: "MISS", retryAfter: result.retryAfter };
}

/** Resolve the branding for a request: explicit id, or derived from the rental id. */
async function resolveBrandingId(explicit: string | null, rentalId: string | null): Promise<string | null> {
  if (explicit) return explicit;
  if (!rentalId) return null;

  // a) A branding that has this rental id configured as its default.
  const { data: byDefault } = await supabase
    .from("brandings")
    .select("id")
    .eq("smsbot_rental_id", rentalId)
    .limit(1)
    .maybeSingle();
  if (byDefault?.id) return byDefault.id as string;

  // b) A phone number entry pointing at this rental.
  const { data: byPhone } = await supabase
    .from("phone_numbers")
    .select("branding_id")
    .eq("rental_id", rentalId)
    .not("branding_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (byPhone?.branding_id) return byPhone.branding_id as string;

  // c) An ident session using this rental (employee ident flow).
  const { data: bySession } = await supabase
    .from("ident_sessions")
    .select("branding_id")
    .eq("phone_api_url", `smsbot://${rentalId}`)
    .not("branding_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (bySession?.branding_id) return bySession.branding_id as string;

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action ?? (body?.rentalId ? "detail" : "list");
    const requestedRentalId = typeof body?.rentalId === "string" && body.rentalId ? body.rentalId : null;

    const brandingId = await resolveBrandingId(
      typeof body?.brandingId === "string" && body.brandingId ? body.brandingId : null,
      requestedRentalId,
    );

    if (!brandingId) {
      return jsonResponse({ error: "Kein Branding für diese SMSBot-Anfrage ermittelbar" }, 400);
    }

    const { data: branding } = await supabase
      .from("brandings")
      .select("smsbot_api_key, smsbot_rental_id")
      .eq("id", brandingId)
      .maybeSingle();

    const apiKey = branding?.smsbot_api_key as string | null | undefined;
    if (!apiKey) {
      return jsonResponse({ error: "Für dieses Branding ist kein SMSBot API Key hinterlegt" }, 400);
    }

    const backoffKey = `${BACKOFF_KEY}:${brandingId}`;
    const authHeaders = { Authorization: `Bearer ${apiKey}`, Accept: "application/json" };

    const doFetch = async <T>(
      url: string,
      transform: (raw: any) => T,
    ) => {
      const res = await fetch(url, { headers: authHeaders });
      const text = await res.text();
      let raw: any;
      try { raw = JSON.parse(text); } catch { raw = { raw: text }; }
      if (!res.ok) {
        return {
          ok: false as const,
          status: res.status,
          body: { error: raw?.message || `SMSBot HTTP ${res.status}`, code: raw?.code, statusCode: res.status },
          retryAfter: res.headers.get("retry-after"),
        };
      }
      return { ok: true as const, data: transform(raw) };
    };

    if (action === "list") {
      const result = await cached(`${brandingId}:list`, LIST_TTL_MS, () =>
        doFetch(`${BASE}/rentals`, (raw) => {
          const arr = Array.isArray(raw) ? raw : (raw?.data ?? raw?.rentals ?? raw?.items ?? []);
          return (Array.isArray(arr) ? arr : []).map(normRental).filter((r) => r.rentalId);
        }),
        backoffKey,
      );
      const extra: Record<string, string> = { "X-Cache": result.source };
      if (result.retryAfter) extra["Retry-After"] = result.retryAfter;
      return jsonResponse(result.body, result.status, extra);
    }

    if (action === "sms") {
      const result = await cached(`${brandingId}:sms`, SMS_TTL_MS, () =>
        doFetch(`${BASE}/sms`, (raw) => {
          const arr = Array.isArray(raw) ? raw : (raw?.data ?? raw?.sms ?? raw?.items ?? []);
          const byRental: Record<string, ReturnType<typeof normSms>[]> = {};
          for (const m of (Array.isArray(arr) ? arr : [])) {
            const rid = m?.rentalId ?? m?.rental_id ?? m?.rental?.id ?? "";
            if (!rid) continue;
            (byRental[rid] ??= []).push(normSms(m));
          }
          return byRental;
        }),
        backoffKey,
      );
      const extra: Record<string, string> = { "X-Cache": result.source };
      if (result.retryAfter) extra["Retry-After"] = result.retryAfter;
      return jsonResponse(result.body, result.status, extra);
    }

    // detail
    const rentalId = requestedRentalId ?? (branding?.smsbot_rental_id as string | null) ?? null;
    if (!rentalId) {
      return jsonResponse({ error: "rentalId required" }, 400);
    }
    const result = await cached(`${brandingId}:detail:${rentalId}`, DETAIL_TTL_MS, () =>
      doFetch(`${BASE}/rentals/${encodeURIComponent(rentalId)}`, (raw) => {
        const r = raw?.data ?? raw?.rental ?? raw;
        return normRental(r);
      }),
      backoffKey,
    );
    const extra: Record<string, string> = { "X-Cache": result.source };
    if (result.retryAfter) extra["Retry-After"] = result.retryAfter;
    return jsonResponse(result.body, result.status, extra);
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
