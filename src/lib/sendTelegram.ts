import { supabase } from "@/integrations/supabase/client";
import { buildTelegramMessage, type TelegramMessageOptions } from "@/lib/telegramMessage";

export async function sendTelegram(eventType: string, messageOptions: TelegramMessageOptions, brandingId?: string | null) {
  try {
    const message = buildTelegramMessage(messageOptions);
    const { data, error } = await supabase.functions.invoke("send-telegram", {
      body: { event_type: eventType, message, branding_id: brandingId || undefined },
    });
    if (error) {
      console.error("Telegram notification error:", error);
    } else if (data?.sent === 0) {
      console.warn(`Telegram: event "${eventType}" fired but no matching chat found (branding: ${brandingId ?? "none"})`);
    }
  } catch (e) {
    console.error("Telegram notification failed:", e);
  }
}
