import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Du liest deutsche Ausweisdokumente (Personalausweis Vorder-/Rückseite oder Reisepass) und optional einen Meldenachweis (Meldebescheinigung, Wohnsitzbestätigung) aus Bildern/PDFs aus.
Gib IMMER das Tool "extract_id" zurück.
Regeln:
- Übernimm ALLE Vornamen exakt so, wie sie im Dokument stehen (auch Zweit- und Drittnamen).
- Wandle Versalien in normale Schreibweise um (MUSTERMANN -> Mustermann), Umlaute korrekt (MUELLER -> Müller, "MÜLLER" -> Müller).
- Bindestrich-Namen und Adels-/Namenszusätze (von, van, de) beibehalten.
- birth_date im Format TT.MM.JJJJ.
- birth_place: Geburtsort exakt wie im Dokument.
- Adresse (street, zip_code, city) steht beim deutschen Personalausweis auf der RÜCKSEITE. Straße inkl. Hausnummer und Zusatz (z.B. "Wilhelm-Busch-Str. 18 A").
- Reisepässe enthalten keine Adresse.
- WICHTIG: Wenn ein Meldenachweis vorhanden ist, übernimm street, zip_code und city IMMER aus dem Meldenachweis (überschreibt eventuelle Adresse aus dem Ausweis). Name, Geburtsdatum und Geburtsort bleiben aus dem Ausweisdokument.
- Wenn keine Adresse verfügbar ist (Reisepass ohne Meldenachweis), gib die Adressfelder leer zurück.
- Wenn ein Wert nicht lesbar ist, gib "" zurück. Erfinde niemals Werte.`;

const TOOL = {
  type: "function",
  function: {
    name: "extract_id",
    description: "Gibt die aus dem Ausweisdokument gelesenen Daten zurück",
    parameters: {
      type: "object",
      properties: {
        first_names: { type: "string" },
        last_name: { type: "string" },
        birth_date: { type: "string" },
        birth_place: { type: "string" },
        street: { type: "string" },
        zip_code: { type: "string" },
        city: { type: "string" },
      },
      required: ["first_names", "last_name", "birth_date", "birth_place", "street", "zip_code", "city"],
      additionalProperties: false,
    },
  },
};

function toBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function buildBlock(url: string, label: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Datei konnte nicht geladen werden (${label}): ${res.status}`);
  const type = (res.headers.get("content-type") || "").split(";")[0].trim();
  const buf = await res.arrayBuffer();
  if (!buf.byteLength) throw new Error(`Datei ist leer (${label})`);
  const isPdf = type === "application/pdf" || url.toLowerCase().split("?")[0].endsWith(".pdf");
  const b64 = toBase64(buf);
  if (isPdf) {
    return {
      type: "file",
      file: { filename: `${label}.pdf`, file_data: `data:application/pdf;base64,${b64}` },
    };
  }
  const mime = type.startsWith("image/") ? type : "image/jpeg";
  return { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { front_url, back_url, id_type, proof_of_address_url } = await req.json();
    if (!front_url && !back_url) {
      return new Response(JSON.stringify({ error: "Kein Ausweisdokument vorhanden" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY nicht konfiguriert" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content: any[] = [
      {
        type: "text",
        text: `Lies die Daten aus dem folgenden Dokument (${id_type === "reisepass" ? "Reisepass" : "Personalausweis"}) aus.`,
      },
    ];
    if (front_url) content.push(await buildBlock(front_url, "vorderseite"));
    if (back_url) content.push(await buildBlock(back_url, "rueckseite"));
    if (proof_of_address_url) {
      content.push({
        type: "text",
        text: "Das folgende Dokument ist der MELDENACHWEIS. Nimm street, zip_code und city ausschließlich aus diesem Dokument.",
      });
      content.push(await buildBlock(proof_of_address_url, "meldenachweis"));
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "extract_id" } },
      }),
    });

    if (!aiRes.ok) {
      const body = await aiRes.text();
      let message = body;
      try { message = JSON.parse(body)?.error?.message ?? body; } catch { /* ignore */ }
      if (aiRes.status === 402) message = "AI-Credits aufgebraucht. Bitte Credits aufladen.";
      if (aiRes.status === 429) message = "Zu viele Anfragen. Bitte kurz warten und erneut versuchen.";
      if (aiRes.status >= 500) message = "AI-Dienst momentan nicht erreichbar. Bitte später erneut versuchen.";
      return new Response(JSON.stringify({ error: message }), {
        status: aiRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) {
      return new Response(JSON.stringify({ error: "Keine Daten erkannt" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(call.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
