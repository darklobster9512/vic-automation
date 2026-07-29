import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Send, Plus, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useChatRealtime, type ChatMessage } from "./useChatRealtime";
import { useChatSounds } from "./useChatSounds";
import { useChatTyping } from "./useChatTyping";
import { isChatOnline } from "@/lib/isChatOnline";

import { ChatBubble, TypingIndicator, DateSeparator, SystemMessage } from "./ChatBubble";
import { AvatarUpload } from "./AvatarUpload";
import { uploadChatAttachment } from "./uploadChatAttachment";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChatWidgetProps {
  contractId: string | null;
  brandColor?: string | null;
  senderName?: string | null;
  senderPhone?: string | null;
  brandingId?: string | null;
  brandingName?: string | null;
}


export function ChatWidget({ contractId, brandColor, senderName, senderPhone, brandingId, brandingName }: ChatWidgetProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [chatSchedule, setChatSchedule] = useState<{ from: string | null; until: string | null }>({ from: null, until: null });
  const [adminProfile, setAdminProfile] = useState<{ avatar_url: string | null; display_name: string | null }>({ avatar_url: null, display_name: null });
  const [now, setNow] = useState(new Date());
  // Tick every 60s to keep online status current
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const adminOnline = isChatOnline(chatSchedule.from, chatSchedule.until);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { playNotification, playSend } = useChatSounds();
  const openRef = useRef(open);
  openRef.current = open;

  const { isTyping, sendTyping } = useChatTyping({ contractId, role: "user" });

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // DB-based heartbeat: update chat_active_at every 30s when chat is open
  useEffect(() => {
    if (!open || !contractId) {
      // Clear on close
      if (contractId) {
        supabase.from("employment_contracts").update({ chat_active_at: null } as any).eq("id", contractId).then(() => {});
      }
      return;
    }
    const updateHeartbeat = () => {
      supabase.from("employment_contracts").update({ chat_active_at: new Date().toISOString() } as any).eq("id", contractId).then(() => {});
    };
    updateHeartbeat(); // immediate
    const interval = setInterval(updateHeartbeat, 30000);
    return () => {
      clearInterval(interval);
      supabase.from("employment_contracts").update({ chat_active_at: null } as any).eq("id", contractId).then(() => {});
    };
  }, [open, contractId]);

  const { messages, loading, sendMessage } = useChatRealtime({
    contractId,
    onNewMessage: (msg: ChatMessage) => {
      if (msg.sender_role !== "user") {
        if (!openRef.current || document.hidden) {
          setUnreadCount((c) => c + 1);
          playNotification();

          // Browser push notification
          if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
            const preview = msg.content.length > 80 ? msg.content.slice(0, 80) + "…" : msg.content;
            const n = new Notification("Neue Nachricht", {
              body: preview,
              icon: adminProfile.avatar_url || undefined,
            });
            n.onclick = () => {
              window.focus();
              setOpen(true);
              n.close();
            };
          }
        } else {
          supabase.from("chat_messages").update({ read: true, read_at: new Date().toISOString() } as any).eq("id", msg.id).then(() => {});
        }
      }
    },
  });

  // Auto-welcome on first contact
  const welcomeSentRef = useRef(false);
  useEffect(() => {
    if (loading || !contractId || messages.length > 0 || welcomeSentRef.current) return;
    welcomeSentRef.current = true;

    const name = adminProfile.display_name;
    const text = name
      ? `Herzlich willkommen im Livechat! Mein Name ist ${name} und ich bin Ihr persönlicher Ansprechpartner. Wie kann ich Ihnen behilflich sein?`
      : `Herzlich willkommen im Livechat! Ich bin Ihr persönlicher Ansprechpartner. Wie kann ich Ihnen behilflich sein?`;

    sendMessage(text, "admin");
  }, [loading, contractId, messages.length, adminProfile.display_name, sendMessage]);

  // Load admin profile (with sessionStorage cache)
  useEffect(() => {
    if (!contractId) return;

    const cacheKey = `admin_chat_profile_${contractId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try { setAdminProfile(JSON.parse(cached)); } catch {}
    }

    const loadBrandingChat = async () => {
      // Get branding_id from contract
      const { data: contract } = await supabase
        .from("employment_contracts")
        .select("branding_id")
        .eq("id", contractId)
        .maybeSingle();
      const brandingId = contract?.branding_id;
      if (!brandingId) return;

      const { data: branding } = await supabase
        .from("brandings")
        .select("chat_display_name, chat_avatar_url, chat_online_from, chat_online_until")
        .eq("id", brandingId)
        .maybeSingle();
      if (branding) {
        const p = { avatar_url: (branding as any).chat_avatar_url, display_name: (branding as any).chat_display_name };
        setAdminProfile(p);
        setChatSchedule({ from: (branding as any).chat_online_from, until: (branding as any).chat_online_until });
        sessionStorage.setItem(cacheKey, JSON.stringify(p));
      }

      // Subscribe to branding changes for online status
      const statusChannel = supabase
        .channel(`branding-chat-${brandingId}`)
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "brandings",
          filter: `id=eq.${brandingId}`,
        }, (payload: any) => {
          if (payload.new.chat_online_from !== undefined || payload.new.chat_online_until !== undefined) {
            setChatSchedule(prev => ({
              from: payload.new.chat_online_from ?? prev.from,
              until: payload.new.chat_online_until ?? prev.until,
            }));
          }
          if (payload.new.chat_display_name !== undefined || payload.new.chat_avatar_url !== undefined) {
            setAdminProfile(prev => ({
              avatar_url: payload.new.chat_avatar_url ?? prev.avatar_url,
              display_name: payload.new.chat_display_name ?? prev.display_name,
            }));
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(statusChannel);
      };
    };
    const cleanup = loadBrandingChat();
    return () => { cleanup.then(fn => fn?.()); };
  }, [contractId]);

  // Auto-scroll bei neuen Nachrichten
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [messages, loading, isTyping]);

  // Beim Oeffnen sofort ganz unten starten (vor dem Paint)
  useLayoutEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, messages, loading]);

  // Count unread on mount
  useEffect(() => {
    if (!contractId) return;
    supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("contract_id", contractId)
      .in("sender_role", ["admin", "system"])
      .eq("read", false)
      .then(({ count }) => setUnreadCount(count ?? 0));
  }, [contractId]);

  // Mark all as read when opening
  useEffect(() => {
    if (open && contractId && unreadCount > 0) {
      supabase
        .from("chat_messages")
        .update({ read: true, read_at: new Date().toISOString() } as any)
        .eq("contract_id", contractId)
        .in("sender_role", ["admin", "system"])
        .eq("read", false)
        .then(() => setUnreadCount(0));
    }
  }, [open, contractId, unreadCount]);

  const handleInputChange = (val: string) => {
    setInput(val);
    sendTyping(val);
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedFile) || !contractId) return;
    const text = input;
    const file = selectedFile;
    setInput("");
    setSelectedFile(null);
    sendTyping("");
    playSend();

    let attachmentUrl: string | null = null;
    if (file) {
      setUploading(true);
      attachmentUrl = await uploadChatAttachment(contractId, file);
      setUploading(false);
    }
    await sendMessage(text, "user", attachmentUrl);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAcceptOrder = useCallback(async (metadata: Record<string, any>) => {
    if (!contractId) return;
    const orderId = metadata.order_id;
    const isPlaceholder = metadata.is_placeholder;

    try {
      // Create order assignment
      await supabase.from("order_assignments").insert({
        order_id: orderId,
        contract_id: contractId,
        status: "offen",
      } as any);

      // For non-placeholder orders, auto-book appointment at current time
      if (!isPlaceholder) {
        const now = new Date();
        const appointmentDate = now.toISOString().split("T")[0];
        // Format time as HH:MM:SS
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const appointmentTime = `${hours}:${minutes}:00`;

        await supabase.from("order_appointments").insert({
          order_id: orderId,
          contract_id: contractId,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
        } as any);
      }

      // Mark the offer message as accepted by updating metadata
      // Find the message with this order_offer
      const { data: offerMsgs } = await supabase
        .from("chat_messages")
        .select("id, metadata")
        .eq("contract_id", contractId)
        .eq("sender_role", "system")
        .order("created_at", { ascending: false })
        .limit(50);

      const offerMsg = (offerMsgs ?? []).find((m: any) => m.metadata?.type === "order_offer" && m.metadata?.order_id === orderId);
      if (offerMsg) {
        await supabase.from("chat_messages").update({
          metadata: { ...(offerMsg.metadata as any), accepted: true },
        } as any).eq("id", offerMsg.id);
      }

      // Send confirmation system message
      await sendMessage(`✅ Auftrag "${metadata.order_title}" wurde angenommen.`, "system");

      // Navigate to order details
      navigate(`/mitarbeiter/auftragdetails/${orderId}`);
    } catch (err) {
      console.error("Error accepting order:", err);
    }
  }, [contractId, sendMessage, navigate]);

  if (!contractId) return null;

  return (
    <div className={cn("fixed z-50", isMobile && open ? "inset-0" : "bottom-6 right-6")}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className={cn(
              "bg-card shadow-2xl border border-border flex flex-col overflow-hidden",
              isMobile
                ? "fixed inset-0 w-full h-full rounded-none"
                : "absolute bottom-16 right-0 w-[380px] h-[520px] rounded-2xl"
            )}
          >
            {/* Header */}
            <div className="bg-primary px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <AvatarUpload
                    avatarUrl={adminProfile.avatar_url}
                    name={adminProfile.display_name || "Admin"}
                    size={36}
                  />
                  <span className={cn(
                    "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-primary",
                    adminOnline ? "bg-green-500" : "bg-gray-400"
                  )} />
                </div>
                <div>
                  <h3 className="text-primary-foreground font-semibold text-sm leading-tight">
                    {adminProfile.display_name || "Admin"}
                  </h3>
                  <p className="text-primary-foreground/70 text-xs">Dein Ansprechpartner</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm text-center px-6">
                  <p>Willkommen! Schreibe uns eine Nachricht und wir helfen dir weiter.</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const showDate = i === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[i - 1].created_at).toDateString();
                  return (
                    <div key={msg.id}>
                      {showDate && <DateSeparator date={msg.created_at} />}
                      {msg.sender_role === "system" ? (
                        <SystemMessage content={msg.content} metadata={msg.metadata} onAcceptOrder={handleAcceptOrder} />
                      ) : (
                        <ChatBubble
                          content={msg.content}
                          senderRole={msg.sender_role}
                          createdAt={msg.created_at}
                          isOwnMessage={msg.sender_role === "user"}
                          avatarUrl={msg.sender_role === "admin" ? adminProfile.avatar_url : undefined}
                          senderName={msg.sender_role === "admin" ? (adminProfile.display_name || "Admin") : undefined}
                          attachmentUrl={msg.attachment_url}
                        />
                      )}
                    </div>
                  );
                })
              )}
              {isTyping && <TypingIndicator />}
            </div>

            {/* Input */}
            <div className="border-t border-border p-3 shrink-0">
              {/* File preview */}
              {selectedFile && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 text-sm max-w-[80%]">
                    {selectedFile.type.startsWith("image/") ? (
                      <img src={URL.createObjectURL(selectedFile)} alt="preview" className="h-8 w-8 rounded object-cover" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate text-foreground">{selectedFile.name}</span>
                    <button onClick={() => setSelectedFile(null)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-end gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 h-10 w-10 rounded-xl flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Anhang hinzufügen"
                >
                  <Plus className="h-5 w-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setSelectedFile(file);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                />
                <textarea
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nachricht schreiben..."
                  className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[40px] max-h-[100px]"
                  rows={1}
                />
                <button
                  onClick={handleSend}
                  disabled={(!input.trim() && !selectedFile) || uploading}
                  className={cn(
                    "shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                    input.trim() || selectedFile
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      {!(isMobile && open) && (
        <motion.button
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.5 }}
          onClick={() => setOpen(!open)}
          className={cn(
            "shadow-lg flex items-center justify-center transition-all hover:scale-105",
            "bg-primary text-primary-foreground",
            !open && unreadCount > 0 && "animate-pulse",
            open ? "h-14 w-14 rounded-full" : "h-12 rounded-full px-5 gap-2.5"
          )}
        >
          {open ? (
            <X className="h-6 w-6" />
          ) : (
            <>
              <MessageCircle className="h-5 w-5 shrink-0" />
              <span className="text-sm font-semibold whitespace-nowrap">Chatte jetzt mit uns</span>
            </>
          )}
          {!open && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
              {unreadCount}
            </span>
          )}
        </motion.button>
      )}
    </div>
  );
}
