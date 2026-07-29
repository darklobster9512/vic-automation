import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendTelegram } from "@/lib/sendTelegram";
import { quoteText } from "@/lib/telegramMessage";

export interface ChatMessage {
  id: string;
  contract_id: string;
  sender_role: "admin" | "user" | "system";
  content: string;
  created_at: string;
  read: boolean;
  attachment_url?: string | null;
  metadata?: Record<string, any> | null;
}

interface UseChatRealtimeOptions {
  contractId?: string | null;
  onNewMessage?: (msg: ChatMessage) => void;
  /** Name des Mitarbeiters – für Telegram-Benachrichtigungen */
  senderName?: string | null;
  senderPhone?: string | null;
  brandingId?: string | null;
  brandingName?: string | null;
}

export function useChatRealtime({
  contractId,
  onNewMessage,
  senderName,
  senderPhone,
  brandingId,
  brandingName,
}: UseChatRealtimeOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const callbackRef = useRef(onNewMessage);
  callbackRef.current = onNewMessage;

  // Load initial messages
  useEffect(() => {
    if (!contractId) { setLoading(false); return; }

    const load = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: true });
      setMessages((data as ChatMessage[]) ?? []);
      setLoading(false);
    };
    load();
  }, [contractId]);

  // Realtime subscription
  useEffect(() => {
    if (!contractId) return;

    const channel = supabase
      .channel(`chat-${contractId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `contract_id=eq.${contractId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          callbackRef.current?.(newMsg);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `contract_id=eq.${contractId}`,
        },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [contractId]);

  const sendMessage = useCallback(
    async (content: string, senderRole: "admin" | "user" | "system", attachmentUrl?: string | null, metadata?: Record<string, any> | null) => {
      if (!contractId || (!content.trim() && !attachmentUrl)) return;
      await supabase.from("chat_messages").insert({
        contract_id: contractId,
        sender_role: senderRole,
        content: content.trim(),
        attachment_url: attachmentUrl ?? null,
        metadata: metadata ?? null,
      } as any);

      // Telegram notification for user messages
      if (senderRole === "user") {
        const text = content.trim();
        await sendTelegram(
          "chat_nachricht",
          {
            icon: "💬",
            title: "Neue Chat-Nachricht",
            fields: [
              { icon: "👤", label: "Von", value: senderName || "Mitarbeiter", bold: true },
              { icon: "📱", label: "Telefon", value: senderPhone },
              { icon: "📎", label: "Anhang", value: attachmentUrl ? "Ja" : null },
              { value: text ? quoteText(text, 300) : "(nur Anhang)" },
            ],
            brandingName,
          },
          brandingId ?? undefined
        );
      }
    },
    [contractId, senderName, senderPhone, brandingId, brandingName]
  );

  return { messages, loading, sendMessage };
}
