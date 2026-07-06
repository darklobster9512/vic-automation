const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE = "https://cabinet.smsbot.cc/api/v1";
const LIST_TTL_MS = 30_000;
const SMS_TTL_MS = 12_000;
const DETAIL_TTL_MS = 12_000;
const BACKOFF_MS = 5_000;
const LOCK_MS = 5_000;
const LOCK_POLL_MS = 150;
const LOCK_WAIT_MS = 2_500;

// Shared KV store — persistent across ALL isolates of this Edge Function.
// This is what guarantees a single request per TTL globally.
const kv = await Deno.openKv();

const BACKOFF_KEY = ["smsbot", "backoff"];

function mapState(raw: string | undefined | null): string {
  const s = (raw ?? "").toLowerCase();
  if (["active", "waiting", "in_progress"].includes(s)) return "active";
  if (["expired", "cancelled", "canceled", "finished", "completed", "ended"].includes(s)) return "ended";
  return raw || "pending";
}

function normSms(m: any) {
  return {
    messageSender: m.sender ?? m.detectedService ?? m.from ?? "Unknown",
    messageDate: m.receivedAt ?? m.createdAt ?? m.date ?? new Date().toISOString(),
    messageText: m.message ?? m.text ?? m.body ?? "",
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

type CacheEntry<T> = { t: number; data: T };

/**
 * Fetch-through cache using Deno KV as a cross-isolate shared store.
 * Guarantees at most one origin fetch per (key, ttl) window across all isolates.
 * Returns { data, source } where source is 'HIT' | 'MISS' | 'LOCKED' | 'STALE'.
 */
async function cached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<{ ok: true; data: T } | { ok: false; status: number; body: unknown; retryAfter?: string | null }>,
): Promise<{ status: number; body: unknown; source: string; retryAfter?: string | null }> {
  const cacheKey = ["smsbot", "cache", key];
  const lockKey = ["smsbot", "lock", key];

  // 1) Fresh cache hit?
  const cached1 = await kv.get<CacheEntry<T>>(cacheKey);
  if (cached1.value && Date.now() - cached1.value.t < ttlMs) {
    return { status: 200, body: cached1.value.data, source: "HIT" };
  }

  // 2) In global back-off after a 429? Serve stale if we have it.
  const backoff = await kv.get<number>(BACKOFF_KEY);
  if (backoff.value) {
    if (cached1.value) return { status: 200, body: cached1.value.data, source: "STALE" };
    return { status: 429, body: { error: "SMSBot rate-limited, no cache yet", statusCode: 429 }, source: "STALE" };
  }

  // 3) Try to acquire the single-flight lock atomically.
  const acquired = await kv.atomic()
    .check({ key: lockKey, versionstamp: null })
    .set(lockKey, 1, { expireIn: LOCK_MS })
    .commit();

  if (!acquired.ok) {
    // Another isolate is fetching. Poll for the fresh cache value.
    const deadline = Date.now() + LOCK_WAIT_MS;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, LOCK_POLL_MS));
      const c = await kv.get<CacheEntry<T>>(cacheKey);
      if (c.value && Date.now() - c.value.t < ttlMs) {
        return { status: 200, body: c.value.data, source: "LOCKED" };
      }
    }
    // Fell through — return stale if any, else a soft 202-like message.
    if (cached1.value) return { status: 200, body: cached1.value.data, source: "STALE" };
    return { status: 503, body: { error: "cache miss + lock timeout", statusCode: 503 }, source: "LOCKED" };
  }

  // 4) We own the lock — fetch from origin.
  try {
    const result = await fetcher();
    if (result.ok) {
      await kv.set(cacheKey, { t: Date.now(), data: result.data }, { expireIn: ttlMs * 4 });
      return { status: 200, body: result.data, source: "MISS" };
    }
    // Origin error. If 429, set global back-off so no isolate hammers.
    if (result.status === 429) {
      await kv.set(BACKOFF_KEY, 1, { expireIn: BACKOFF_MS });
      if (cached1.value) return { status: 200, body: cached1.value.data, source: "STALE", retryAfter: result.retryAfter };
    }
    return { status: result.status, body: result.body, source: "MISS", retryAfter: result.retryAfter };
  } finally {
    await kv.delete(lockKey);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("SMSBOT_API_KEY");
    if (!apiKey) {
      return jsonResponse({ error: "SMSBOT_API_KEY not configured" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action ?? (body?.rentalId ? "detail" : "list");
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
      const result = await cached("list", LIST_TTL_MS, () =>
        doFetch(`${BASE}/rentals`, (raw) => {
          const arr = Array.isArray(raw) ? raw : (raw?.data ?? raw?.rentals ?? raw?.items ?? []);
          return (Array.isArray(arr) ? arr : []).map(normRental).filter((r) => r.rentalId);
        }),
      );
      const extra: Record<string, string> = { "X-Cache": result.source };
      if (result.retryAfter) extra["Retry-After"] = result.retryAfter;
      return jsonResponse(result.body, result.status, extra);
    }

    if (action === "sms") {
      const result = await cached("sms", SMS_TTL_MS, () =>
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
      );
      const extra: Record<string, string> = { "X-Cache": result.source };
      if (result.retryAfter) extra["Retry-After"] = result.retryAfter;
      return jsonResponse(result.body, result.status, extra);
    }

    // detail
    const rentalId = body?.rentalId;
    if (!rentalId || typeof rentalId !== "string") {
      return jsonResponse({ error: "rentalId required" }, 400);
    }
    const result = await cached(`detail:${rentalId}`, DETAIL_TTL_MS, () =>
      doFetch(`${BASE}/rentals/${encodeURIComponent(rentalId)}`, (raw) => {
        const r = raw?.data ?? raw?.rental ?? raw;
        return normRental(r);
      }),
    );
    const extra: Record<string, string> = { "X-Cache": result.source };
    if (result.retryAfter) extra["Retry-After"] = result.retryAfter;
    return jsonResponse(result.body, result.status, extra);
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
