import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-caller-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sha256(value: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sbServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sbAdmin = createClient(sbUrl, sbServiceKey);

    const authHeader = req.headers.get("Authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    const callerKey = req.headers.get("x-caller-key")?.trim() || null;

    let callerUserId: string | null = null;
    let forcedBrandingId: string | null = null;
    let authorized = false;

    // 1) Panel user (unchanged behaviour)
    if (bearer && bearer !== sbServiceKey) {
      const callerClient = createClient(sbUrl, sbAnonKey, {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
      });
      const { data: claimsData } = await callerClient.auth.getClaims(bearer);
      if (claimsData?.claims) {
        callerUserId = claimsData.claims.sub as string;
        authorized = true;
      }
    }

    // 2) Caller API key
    if (!authorized && callerKey) {
      const hash = await sha256(callerKey);
      const { data: keyRow } = await sbAdmin
        .from("caller_api_keys")
        .select("id, branding_id, is_active")
        .eq("token_hash", hash)
        .maybeSingle();
      if (keyRow && (keyRow as any).is_active) {
        authorized = true;
        forcedBrandingId = (keyRow as any).branding_id ?? null;
      }
    }

    // 3) Internal service-role invocation
    if (!authorized && bearer && bearer === sbServiceKey) {
      authorized = true;
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const { action, to, senderID, text, recipientName, templateId, source } = payload;
    const brandingId = forcedBrandingId ?? payload.brandingId;


    // Send SMS via elitegateway.net
    if (action === "send") {


      let apiKey: string | null = null;
      if (brandingId) {
        const { data: brand } = await sbAdmin
          .from("brandings")
          .select("elitegateway_api_key")
          .eq("id", brandingId)
          .maybeSingle();
        apiKey = (brand as any)?.elitegateway_api_key?.trim() || null;
      }
      if (!apiKey) apiKey = Deno.env.get("ELITEGATEWAY_API_KEY") || null;

      if (!apiKey) {
        return new Response(JSON.stringify({ error: "Kein Elitegateway API Key für dieses Branding konfiguriert" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!to || !senderID || !text) {
        return new Response(JSON.stringify({ error: "to, senderID, text required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Normalize to international digits-only (no '+'), e.g. "+49 152..." -> "49152..."
      function normalizeNumberNoPlus(phone: string): string {
        let cleaned = String(phone).replace(/\D/g, "");
        if (cleaned.startsWith("00")) cleaned = cleaned.slice(2);
        else if (cleaned.startsWith("0")) cleaned = "49" + cleaned.slice(1);
        return cleaned;
      }
      const number = normalizeNumberNoPlus(to);

      const reqBody = JSON.stringify({ SID: senderID, Content: text, number });
      console.log("elitegateway send request:", { number, senderID, textLen: text.length });

      const res = await fetch("https://api.elitegateway.net/api/send/sms", {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "api_key": apiKey,
          "Content-Type": "application/json",
        },
        body: reqBody,
      });

      const rawText = await res.text();
      console.log("elitegateway raw response:", res.status, rawText);

      let data: any;
      try { data = JSON.parse(rawText); } catch { data = { raw: rawText }; }

      // Success = HTTP 2xx AND (suc: true OR Success: "100" OR success: "100")
      const isSuccess = res.status >= 200 && res.status < 300 && data && (
        data.suc === true ||
        String(data.Success) === "100" ||
        String(data.success) === "100"
      );
      if (isSuccess) {
        try {
          const sb = sbAdmin;
          await sb.from("sms_spoof_logs").insert({
            recipient_phone: to,
            recipient_name: recipientName || null,
            sender_name: senderID,
            message: text,
            template_id: templateId || null,
            created_by: callerUserId,
            branding_id: brandingId || null,
            source: source || "auto",
          });

          if (brandingId) {
            await sb.rpc("decrement_spoof_credits", { _branding_id: brandingId });
          }
        } catch (logErr) {
          console.error("Failed to log SMS:", logErr);
        }
      }

      return new Response(JSON.stringify(data), {
        status: isSuccess ? 200 : (res.status >= 400 ? res.status : 400),
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
