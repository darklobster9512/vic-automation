import { supabase } from "@/integrations/supabase/client";

interface SendEmailParams {
  to: string;
  recipient_name?: string;
  subject: string;
  body_title: string;
  body_lines: string[];
  button_text?: string;
  button_url?: string;
  footer_lines?: string[];
  branding_id?: string | null;
  event_type: string;
  metadata?: Record<string, unknown>;
  bypass_queue?: boolean;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  let data: any;
  let error: any;
  try {
    const res = await supabase.functions.invoke("send-email", { body: params });
    data = res.data;
    error = res.error;
  } catch (err) {
    console.error("send-email call failed:", err);
    throw new Error(`E-Mail-Versand fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (error) {
    console.error("send-email error:", error);
    throw new Error(`E-Mail-Versand fehlgeschlagen: ${error.message || JSON.stringify(error)}`);
  }
  if (data && typeof data === "object" && "error" in data && data.error) {
    console.error("send-email returned error:", data);
    throw new Error(`E-Mail-Versand fehlgeschlagen: ${data.error}`);
  }
}
