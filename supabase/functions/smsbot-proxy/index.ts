const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE = "https://cabinet.smsbot.cc/api/v1";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("SMSBOT_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "SMSBOT_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { rentalId } = await req.json();
    if (!rentalId || typeof rentalId !== "string") {
      return new Response(JSON.stringify({ error: "rentalId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(`${BASE}/rentals/${encodeURIComponent(rentalId)}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });

    const text = await res.text();
    let raw: any;
    try { raw = JSON.parse(text); } catch { raw = { raw: text }; }

    if (!res.ok) {
      return new Response(JSON.stringify({ error: raw?.message || `SMSBot HTTP ${res.status}`, code: raw?.code, statusCode: res.status }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SMSBot returns rental object — normalize into anosim-like shape.
    const r = raw?.data ?? raw?.rental ?? raw;
    const smsArr = r?.sms ?? r?.messages ?? r?.smsMessages ?? [];
    const service = Array.isArray(r?.services) && r.services.length > 0
      ? r.services.map((s: any) => s.name ?? s.service ?? s).join(", ")
      : (r?.service?.name ?? r?.service ?? r?.detectedService ?? "—");

    const normalized = {
      number: r?.number ?? r?.phoneNumber ?? r?.phone ?? "",
      country: r?.country ?? r?.countryCode ?? "",
      rentalType: r?.type ?? r?.rentalType ?? (r?.isFullRental ? "full" : "single"),
      service,
      startDate: r?.createdAt ?? r?.startDate ?? r?.startsAt ?? new Date().toISOString(),
      endDate: r?.expiresAt ?? r?.endDate ?? r?.endsAt ?? r?.expiredAt ?? new Date().toISOString(),
      state: mapState(r?.status ?? r?.state),
      sms: Array.isArray(smsArr) ? smsArr.map(normSms) : [],
    };

    return new Response(JSON.stringify(normalized), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
