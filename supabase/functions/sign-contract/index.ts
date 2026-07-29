import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildTelegramMessage } from "../_shared/telegramMessage.ts";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const { contract_id, signature_data } = await req.json();
    if (!contract_id || !signature_data) {
      return new Response(JSON.stringify({ error: "contract_id und signature_data erforderlich" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify contract belongs to user and status is genehmigt
    const { data: contract, error: contractError } = await adminClient
      .from("employment_contracts")
      .select("*")
      .eq("id", contract_id)
      .eq("user_id", userId)
      .eq("status", "genehmigt")
      .single();

    if (contractError || !contract) {
      return new Response(JSON.stringify({ error: "Vertrag nicht gefunden oder nicht berechtigt" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call generate-contract with signature_data
    const generateUrl = `${supabaseUrl}/functions/v1/generate-contract`;
    const generateRes = await fetch(generateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        apikey: anonKey,
      },
      body: JSON.stringify({ contract_id, signature_data }),
    });

    const result = await generateRes.json();
    if (!generateRes.ok) {
      return new Response(JSON.stringify({ error: result.error || "Fehler bei der Vertragsgenerierung" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Telegram notification
    try {
      const { data: contractForTg } = await adminClient
        .from("employment_contracts")
        .select("first_name, last_name, phone, email, branding_id, brandings(company_name)")
        .eq("id", contract_id)
        .single();
      const empName = `${contractForTg?.first_name || ""} ${contractForTg?.last_name || ""}`.trim();

      const sendTelegramUrl = `${supabaseUrl}/functions/v1/send-telegram`;
      await fetch(sendTelegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "vertrag_unterzeichnet",
          branding_id: (contractForTg as any)?.branding_id || undefined,
          message: buildTelegramMessage({
            icon: "✍️",
            title: "Vertrag unterzeichnet",
            fields: [
              { icon: "👤", label: "Name", value: empName || "Unbekannt", bold: true },
              { icon: "✉️", label: "E-Mail", value: (contractForTg as any)?.email },
              { icon: "📱", label: "Telefon", value: (contractForTg as any)?.phone },
              { icon: "📄", label: "Status", value: "Signiertes PDF erstellt" },
            ],
            brandingName: (contractForTg as any)?.brandings?.company_name,
          }),
        }),
      });
    } catch (telegramErr) {
      console.error("send-telegram call failed:", telegramErr);
    }

    return new Response(
      JSON.stringify({ success: true, pdf_url: result.pdf_url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
