import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Du extrahierst Kontaktdaten aus deutschen Lebenslauf-Texten (Rohtext aus PDF, Spalten und Fußzeilen können durcheinander sein, Ligaturen können fehlen).
Gib IMMER das Tool "extract_applicant" zurück mit:
- first_name: alle Vornamen der Person (nie in Großbuchstaben, Anfangsbuchstaben groß)
- last_name: Nachname (nie in Großbuchstaben)
- email: private E-Mail-Adresse der Person, sonst ""
- phone: Mobil-/Telefonnummer der Person im Format +49..., sonst ""
Nimm niemals Firmen-, Schul- oder Referenzkontakte. Wenn ein Wert fehlt, gib "" zurück. Korrigiere fehlende Buchstaben in Namen (z.B. "Ko ermair" -> "Kottermair") nur, wenn der Dateiname es bestätigt.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, file_name } = await req.json();
    if (!text || typeof text !== "string" || !text.trim()) {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Dateiname: ${file_name || "unbekannt"}\n\nLebenslauf-Text:\n${text.slice(0, 12000)}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_applicant",
            description: "Kontaktdaten des Bewerbers",
            parameters: {
              type: "object",
              properties: {
                first_name: { type: "string" },
                last_name: { type: "string" },
                email: { type: "string" },
                phone: { type: "string" },
              },
              required: ["first_name", "last_name", "email", "phone"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_applicant" } },
    };

    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (response.ok) break;
      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number(response.headers.get("Retry-After") || 0);
        const wait = retryAfter > 0 ? retryAfter * 1000 : 800 * Math.pow(2, attempt);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
      }
      break;
    }

    if (!response || !response.ok) {
      const status = response?.status ?? 500;
      const detail = response ? await response.text() : "no response";
      console.error("AI gateway error:", status, detail);
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit erreicht, bitte kurz warten." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Guthaben aufgebraucht, bitte Lovable AI Credits aufladen." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 403) {
        return new Response(
          JSON.stringify({ error: "Lovable AI ist für diesen Workspace gesperrt." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const call = result.choices?.[0]?.message?.tool_calls?.[0];
    let applicant = { first_name: "", last_name: "", email: "", phone: "" };
    if (call?.function?.arguments) {
      try {
        const parsed = JSON.parse(call.function.arguments);
        applicant = {
          first_name: String(parsed.first_name ?? "").trim(),
          last_name: String(parsed.last_name ?? "").trim(),
          email: String(parsed.email ?? "").trim(),
          phone: String(parsed.phone ?? "").trim(),
        };
      } catch (e) {
        console.error("tool args parse failed", e);
      }
    }

    return new Response(JSON.stringify({ applicant }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-cv-data error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
