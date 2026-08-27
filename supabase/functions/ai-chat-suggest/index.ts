import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { contract_id } = await req.json();
    if (!contract_id) {
      return new Response(JSON.stringify({ error: "contract_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Kompletter Chatverlauf (gekappt auf die letzten 200 Nachrichten)
    const { data: allMessages } = await supabase
      .from("chat_messages")
      .select("content, sender_role, created_at")
      .eq("contract_id", contract_id)
      .order("created_at", { ascending: false })
      .limit(200);

    const activeMessages = (allMessages ?? []).slice().reverse();

    // Load last 100 admin messages from ALL chats as reference for tone/style
    const { data: referenceMessages } = await supabase
      .from("chat_messages")
      .select("content, sender_role")
      .eq("sender_role", "admin")
      .neq("contract_id", contract_id)
      .order("created_at", { ascending: false })
      .limit(100);

    const chatHistory = activeMessages
      .map((m) => `${m.sender_role === "admin" ? "Admin" : m.sender_role === "user" ? "Mitarbeiter" : "System"}: ${m.content}`)
      .join("\n");

    const lastUserMessage = [...activeMessages].reverse().find((m) => m.sender_role === "user")?.content ?? "";

    const referenceExamples = (referenceMessages ?? [])
      .slice(0, 50)
      .map((m) => m.content)
      .join("\n---\n");

    const systemPrompt = `Du bist ein KI-Assistent, der dem Admin hilft, Antworten auf Mitarbeiter-Nachrichten im Livechat zu formulieren.

Wichtigste Regeln:
- Sprich den Mitarbeiter IMMER mit "du" an (duzen). Niemals siezen, auch wenn die Referenzbeispiele siezen.
- Keine förmlichen Floskeln wie "Sehr geehrte/r" oder "Mit freundlichen Grüßen".
- Berücksichtige den KOMPLETTEN Chatverlauf als Kontext, antworte aber gezielt auf die LETZTE Nachricht des Mitarbeiters.
- Antworte auf Deutsch, freundlich, hilfsbereit und kurz (max. 2-3 Sätze).
- Gib NUR den reinen Antworttext aus – keine Erklärung, keine Anführungszeichen, keine Formatierung.

Referenz-Antworten aus anderen Chats (nur als Stil-Orientierung, NICHT für die Anrede):
${referenceExamples || "(Keine Referenzen verfügbar)"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Kompletter Chatverlauf:\n\n${chatHistory}\n\nDie neueste Nachricht des Mitarbeiters lautet:\n"${lastUserMessage}"\n\nSchlage genau eine passende Admin-Antwort darauf vor (duzen!).`,
          },
        ],
      }),
    });


    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit erreicht, bitte versuche es später erneut." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Guthaben aufgebraucht, bitte Lovable AI Credits aufladen." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const suggestion = result.choices?.[0]?.message?.content?.trim() ?? "";

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-chat-suggest error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
