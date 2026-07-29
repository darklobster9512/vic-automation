import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { event_type, message, branding_id } = await req.json();
    // TEMP DEBUG (v2): zeigt exakt, welcher Text ankommt und ob er aus dem neuen Builder stammt
    const isNewFormat = typeof message === "string" && message.includes("━━━━━━━━━━━━━━━━━");
    console.log(
      `[send-telegram v2] event_type=${event_type} branding_id=${branding_id ?? "none"} newFormat=${isNewFormat}\n--- MESSAGE START ---\n${message}\n--- MESSAGE END ---`
    );
    if (!event_type || !message) {
      return new Response(JSON.stringify({ error: "event_type and message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }



    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      console.error("TELEGRAM_BOT_TOKEN not set");
      return new Response(JSON.stringify({ error: "Bot token not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get chat IDs – for _test send to ALL, otherwise filter by event
    let query = adminClient.from("telegram_chats").select("chat_id, branding_ids");
    if (event_type !== "_test") {
      query = query.contains("events", [event_type]);
    }
    const { data: chats, error: dbError } = await query;

    if (dbError) {
      console.error("DB error:", dbError);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!chats || chats.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter by branding_id if provided
    const filteredChats = branding_id
      ? chats.filter((c: any) => !c.branding_ids || c.branding_ids.length === 0 || c.branding_ids.includes(branding_id))
      : chats;

    // Send to each chat
    const results = await Promise.allSettled(
      filteredChats.map(async (chat: any) => {
        const res = await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chat.chat_id,
              text: message,
              parse_mode: "HTML",
            }),
          }
        );
        if (!res.ok) {
          const errBody = await res.text();
          console.error(`Telegram send failed for ${chat.chat_id}:`, errBody);
          throw new Error(errBody);
        }
        return await res.json();
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;

    return new Response(JSON.stringify({ sent }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
