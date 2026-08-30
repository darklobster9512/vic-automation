import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmailHtml } from "../_shared/emailHtml.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailRequest {
  to: string;
  recipient_name?: string;
  subject: string;
  body_title: string;
  body_lines: string[];
  button_text?: string;
  button_url?: string;
  footer_lines?: string[];
  branding_id?: string;
  event_type: string;
  metadata?: Record<string, unknown>;
  bypass_queue?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body: EmailRequest = await req.json();
    const {
      to, recipient_name, subject, body_title, body_lines,
      button_text, button_url, footer_lines, branding_id, event_type, metadata,
    } = body;

    if (!to || !subject || !event_type) {
      return new Response(JSON.stringify({ error: "to, subject und event_type erforderlich" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: queueId, error } = await adminClient.rpc("enqueue_email", {
      _to: to,
      _recipient_name: recipient_name ?? null,
      _subject: subject,
      _body_title: body_title,
      _body_lines: body_lines ?? [],
      _button_text: button_text ?? null,
      _button_url: button_url ?? null,
      _footer_lines: footer_lines ?? null,
      _branding_id: branding_id ?? null,
      _event_type: event_type,
      _metadata: metadata ?? {},
    });

    if (error) {
      console.error("enqueue_email error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, queued: true, queue_id: queueId }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-email error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
