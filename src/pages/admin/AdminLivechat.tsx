import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ConversationList, type Conversation } from "@/components/chat/ConversationList";
import { ChatBubble, TypingIndicator, DateSeparator, SystemMessage } from "@/components/chat/ChatBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { AiSuggestionBar } from "@/components/chat/AiSuggestionBar";

import { AvatarUpload } from "@/components/chat/AvatarUpload";
import { useChatRealtime, type ChatMessage } from "@/components/chat/useChatRealtime";
import { useChatTyping } from "@/components/chat/useChatTyping";

import { sendSms } from "@/lib/sendSms";
import { resolveContractBranding } from "@/lib/resolveContractBranding";
import { uploadChatAttachment } from "@/components/chat/uploadChatAttachment";
import { SmsWatch } from "@/components/chat/SmsWatch";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";
import MitarbeiterDetailPopup from "@/components/admin/MitarbeiterDetailPopup";
import { Switch } from "@/components/ui/switch";
import { MessageCircle, Pencil, Check, Plus, Bell, PencilLine, X, Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AdminLivechat() {
  const { user } = useAuth();
  const { activeBrandingId, ready } = useBrandingFilter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [search, setSearch] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");
  const [newChatLoading, setNewChatLoading] = useState(false);
  const [allContracts, setAllContracts] = useState<{ id: string; first_name: string | null; last_name: string | null }[]>([]);

  const [contractData, setContractData] = useState<{ first_name?: string | null; last_name?: string | null; phone?: string | null; employment_type?: string | null; is_suspended?: boolean | null }>({});
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendBusy, setSuspendBusy] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [adminAvatar, setAdminAvatar] = useState<string | null>(null);
  const [adminDisplayName, setAdminDisplayName] = useState("");
  const [employeeProfile, setEmployeeProfile] = useState<{ avatar_url: string | null; display_name: string | null }>({ avatar_url: null, display_name: null });
  const [quickSmsCode, setQuickSmsCode] = useState("");
  const [externalChatValue, setExternalChatValue] = useState<string | null>(null);
  const [quickSmsSending, setQuickSmsSending] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [notifySmsDialogOpen, setNotifySmsDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [notifySmsText, setNotifySmsText] = useState("Sie haben eine neue Nachricht im Livechat. Bitte lesen Sie diese.");
  const [notifySmsSending, setNotifySmsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { isTyping, draftPreview, sendTyping } = useChatTyping({
    contractId: active?.contract_id ?? null,
    role: "admin",
  });

  const [onlineContractIds, setOnlineContractIds] = useState<Set<string>>(new Set());

  // Load branding chat profile
  useEffect(() => {
    if (!activeBrandingId || !ready) return;
    supabase
      .from("brandings")
      .select("chat_display_name, chat_avatar_url, chat_online")
      .eq("id", activeBrandingId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setAdminAvatar(data.chat_avatar_url);
          setAdminDisplayName(data.chat_display_name || "");
        }
      });
  }, [activeBrandingId, ready]);

  // Load conversations + online status (filtered by branding)
  const loadConversations = useCallback(async () => {
    if (!ready) return;

    // Step 1: Get ALL contract IDs for the active branding (batch loop to bypass 1000-row limit)
    const pageSize = 1000;
    const contracts: any[] = [];
    let cFrom = 0;
    while (true) {
      let contractQuery = supabase
        .from("employment_contracts")
        .select("id, first_name, last_name, user_id, chat_active_at, created_at")
        .range(cFrom, cFrom + pageSize - 1);
      if (activeBrandingId) {
        contractQuery = contractQuery.eq("branding_id", activeBrandingId);
      }
      const { data, error } = await contractQuery;
      if (error || !data?.length) break;
      contracts.push(...data);
      if (data.length < pageSize) break;
      cFrom += pageSize;
    }
    if (!contracts.length) { setConversations([]); setOnlineContractIds(new Set()); return; }

    const contractIds = contracts.map((c) => c.id);

    // Step 2: Load ALL chat messages for those contracts, chunked + paginated
    const idChunkSize = 500;
    const msgs: any[] = [];
    for (let i = 0; i < contractIds.length; i += idChunkSize) {
      const chunk = contractIds.slice(i, i + idChunkSize);
      let mFrom = 0;
      while (true) {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("contract_id, content, created_at, read, sender_role")
          .in("contract_id", chunk)
          .order("created_at", { ascending: false })
          .range(mFrom, mFrom + pageSize - 1);
        if (error || !data?.length) break;
        msgs.push(...data);
        if (data.length < pageSize) break;
        mFrom += pageSize;
      }
    }

    const map = new Map<string, { last_message: string; last_message_at: string; unread_count: number }>();
    for (const m of msgs) {
      if (!map.has(m.contract_id)) {
        map.set(m.contract_id, { last_message: m.content, last_message_at: m.created_at, unread_count: 0 });
      }
      const entry = map.get(m.contract_id)!;
      if (m.sender_role === "user" && !m.read) entry.unread_count++;
    }

    // Compute online status from chat_active_at
    const now = Date.now();
    const onlineIds = new Set<string>();
    for (const c of contracts) {
      const activeAt = (c as any).chat_active_at;
      if (activeAt && (now - new Date(activeAt).getTime()) < 2 * 60 * 1000) {
        onlineIds.add(c.id);
      }
    }
    setOnlineContractIds(onlineIds);

    const convs: Conversation[] = contracts
      .filter((c) => map.has(c.id))
      .map((c) => {
        const meta = map.get(c.id)!;
        return {
          contract_id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
          last_message: meta.last_message,
          last_message_at: meta.last_message_at,
          unread_count: meta.unread_count,
        };
      })
      .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

    setConversations(convs);
  }, [ready, activeBrandingId]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Auto-select contract from query param
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const contractParam = searchParams.get("contract");
    if (!contractParam || active) return;

    const match = conversations.find((c) => c.contract_id === contractParam);
    if (match) {
      setActive(match);
      setSearchParams({}, { replace: true });
      return;
    }

    // Contract not in current list (e.g. different branding filter) – load directly
    if (conversations.length > 0 || !ready) return;
    const loadDirect = async () => {
      const { data: contract } = await supabase
        .from("employment_contracts")
        .select("id, first_name, last_name, created_at")
        .eq("id", contractParam)
        .maybeSingle();
      if (contract) {
        const conv: Conversation = {
          contract_id: contract.id,
          first_name: contract.first_name,
          last_name: contract.last_name,
          last_message: "",
          last_message_at: contract.created_at,
          unread_count: 0,
        };
        setConversations((prev) => [conv, ...prev]);
        setActive(conv);
        setSearchParams({}, { replace: true });
      }
    };
    loadDirect();
  }, [searchParams, conversations, active, setSearchParams, ready]);

  // Realtime for all messages + employee online status heartbeat
  useEffect(() => {
    const channel = supabase
      .channel("admin-chat-all")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => loadConversations())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "employment_contracts" }, (payload: any) => {
        const id = payload.new?.id;
        const activeAt = payload.new?.chat_active_at;
        if (id) {
          setOnlineContractIds(prev => {
            const next = new Set(prev);
            if (activeAt && (Date.now() - new Date(activeAt).getTime()) < 2 * 60 * 1000) {
              next.add(id);
            } else {
              next.delete(id);
            }
            return next;
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadConversations]);

  const { messages, loading, sendMessage } = useChatRealtime({ contractId: active?.contract_id ?? null });

  // Load contract data + employee profile
  useEffect(() => {
    if (!active) return;
    supabase
      .from("employment_contracts")
      .select("first_name, last_name, phone, user_id, employment_type, is_suspended")
      .eq("id", active.contract_id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setContractData(data);
          if (data.user_id) {
            supabase
              .from("profiles")
              .select("avatar_url, display_name, full_name")
              .eq("id", data.user_id)
              .maybeSingle()
              .then(({ data: profile }: any) => {
                if (profile) setEmployeeProfile({ avatar_url: profile.avatar_url, display_name: profile.display_name || profile.full_name });
                else setEmployeeProfile({ avatar_url: null, display_name: null });
              });
          }
        }
      });
  }, [active?.contract_id]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [messages, loading, isTyping, draftPreview]);

  // Mark user messages as read
  useEffect(() => {
    if (!active) return;
    supabase
      .from("chat_messages")
      .update({ read: true })
      .eq("contract_id", active.contract_id)
      .eq("sender_role", "user")
      .eq("read", false)
      .then(() => loadConversations());
  }, [active?.contract_id, messages.length]);

  const handleSend = async (text: string, file?: File) => {
    if (!active) return;
    let attachmentUrl: string | null = null;
    if (file) {
      attachmentUrl = await uploadChatAttachment(active.contract_id, file);
    }
    await sendMessage(text, "admin", attachmentUrl);
  };

  const handleTyping = (draft: string) => {
    sendTyping(draft);
  };

  const handleQuickSms = async () => {
    if (!contractData.phone || !quickSmsCode.trim()) return;
    setQuickSmsSending(true);
    const name = `${contractData.first_name || ""} ${contractData.last_name || ""}`.trim();
    const smsFullText = `Ihr Ident-Code lautet: ${quickSmsCode.trim()}.`;
    let smsSender: string | undefined;
    let smsBrandingId: string | null = null;
    if (active) {
      const brandingId = await resolveContractBranding(active.contract_id);
      smsBrandingId = brandingId;
      if (brandingId) {
        const { data: branding } = await supabase.from("brandings").select("sms_sender_name" as any).eq("id", brandingId).single();
        smsSender = (branding as any)?.sms_sender_name || undefined;
      }
    }
    const success = await sendSms({
      to: contractData.phone,
      text: smsFullText,
      event_type: "manuell",
      recipient_name: name,
      from: smsSender,
      branding_id: smsBrandingId,
    });
    setQuickSmsSending(false);
    if (success) {
      toast.success("SMS gesendet!");
      setQuickSmsCode("");
    } else {
      toast.error("SMS-Versand fehlgeschlagen");
    }
  };

  const handleToggleSuspend = async () => {
    if (!active) return;
    const newValue = !contractData.is_suspended;
    setSuspendBusy(true);
    const { error } = await supabase
      .from("employment_contracts")
      .update({ is_suspended: newValue })
      .eq("id", active.contract_id);
    setSuspendBusy(false);
    if (error) {
      toast.error("Fehler beim Aktualisieren.");
      return;
    }
    setContractData((prev) => ({ ...prev, is_suspended: newValue }));
    setSuspendDialogOpen(false);
    toast.success(newValue ? "Benutzerkonto gesperrt." : "Benutzerkonto entsperrt.");
  };


  const loadAvailableOrders = useCallback(async () => {
    if (!active) return;
    setOrderLoading(true);
    const { data: existing } = await supabase
      .from("order_assignments")
      .select("order_id")
      .eq("contract_id", active.contract_id);
    const assignedIds = (existing ?? []).map((e: any) => e.order_id);

    let orderQuery = supabase
      .from("orders")
      .select("id, title, order_number, reward, is_placeholder")
      .order("created_at", { ascending: false });

    if (activeBrandingId) {
      orderQuery = orderQuery.eq("branding_id", activeBrandingId);
    }

    const { data: allOrders } = await orderQuery;

    setAvailableOrders((allOrders ?? []).filter((o: any) => !assignedIds.includes(o.id)));
    setOrderLoading(false);
  }, [active?.contract_id]);

  const handleOpenOrderDialog = () => {
    loadAvailableOrders();
    setOrderDialogOpen(true);
  };

  const handleAssignOrder = async (order: any) => {
    if (!active) return;
    const text = `📋 Neuer Auftrag: ${order.title} (${order.order_number}) – Prämie: ${order.reward}${order.reward.includes("€") ? "" : " €"}`;
    const metadata = {
      type: "order_offer",
      order_id: order.id,
      order_title: order.title,
      order_number: order.order_number,
      reward: order.reward,
      is_placeholder: order.is_placeholder,
    };
    await sendMessage(text, "system", null, metadata);
    setOrderDialogOpen(false);
    toast.success("Auftragsangebot gesendet");
  };

  const handleSendNotifySms = async () => {
    if (!contractData.phone || !notifySmsText.trim()) return;
    setNotifySmsSending(true);
    const name = `${contractData.first_name || ""} ${contractData.last_name || ""}`.trim();
    let smsSender: string | undefined;
    let notifyBrandingId: string | null = null;
    if (active) {
      const brandingId = await resolveContractBranding(active.contract_id);
      notifyBrandingId = brandingId;
      if (brandingId) {
        const { data: branding } = await supabase.from("brandings").select("sms_sender_name" as any).eq("id", brandingId).single();
        smsSender = (branding as any)?.sms_sender_name || undefined;
      }
    }
    const success = await sendSms({
      to: contractData.phone,
      text: notifySmsText.trim(),
      event_type: "livechat_benachrichtigung",
      recipient_name: name,
      from: smsSender,
      branding_id: notifyBrandingId,
    });
    setNotifySmsSending(false);
    if (success) {
      toast.success("Benachrichtigungs-SMS gesendet!");
      setNotifySmsDialogOpen(false);
    } else {
      toast.error("SMS-Versand fehlgeschlagen");
    }
  };

  // Load all contracts of the active branding for the "new chat" dialog
  const openNewChat = async () => {
    setNewChatOpen(true);
    setNewChatSearch("");
    if (allContracts.length > 0 || !ready) return;
    setNewChatLoading(true);
    const pageSize = 1000;
    const rows: any[] = [];
    let from = 0;
    while (true) {
      let q = supabase
        .from("employment_contracts")
        .select("id, first_name, last_name")
        .range(from, from + pageSize - 1);
      if (activeBrandingId) q = q.eq("branding_id", activeBrandingId);
      const { data, error } = await q;
      if (error || !data?.length) break;
      rows.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    setAllContracts(rows);
    setNewChatLoading(false);
  };

  const existingIds = new Set(conversations.map((c) => c.contract_id));
  const newChatCandidates = allContracts
    .filter((c) => !existingIds.has(c.id))
    .filter((c) => (c.first_name || c.last_name))
    .filter((c) => `${c.first_name ?? ""} ${c.last_name ?? ""}`.toLowerCase().includes(newChatSearch.toLowerCase()))
    .sort((a, b) => `${a.first_name ?? ""}${a.last_name ?? ""}`.localeCompare(`${b.first_name ?? ""}${b.last_name ?? ""}`));

  const startNewChat = (c: { id: string; first_name: string | null; last_name: string | null }) => {
    const conv: Conversation = {
      contract_id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      last_message: "",
      last_message_at: new Date().toISOString(),
      unread_count: 0,
    };
    setConversations((prev) => (prev.some((p) => p.contract_id === c.id) ? prev : [conv, ...prev]));
    setActive(conv);
    setNewChatOpen(false);
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex rounded-2xl overflow-hidden border border-border bg-background shadow-sm">
      {/* Conversation list */}
      <div className="w-80 shrink-0">
        <ConversationList
          activeId={active?.contract_id ?? null}
          onSelect={setActive}
          conversations={conversations}
          search={search}
          onSearchChange={setSearch}
          onlineContractIds={onlineContractIds}
          onNewChat={openNewChat}
        />
      </div>

      {/* New chat dialog */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Neuen Chat starten</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Mitarbeiter suchen..."
            value={newChatSearch}
            onChange={(e) => setNewChatSearch(e.target.value)}
            className="rounded-xl"
          />
          <div className="max-h-80 overflow-y-auto -mx-2">
            {newChatLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Laden...</p>
            ) : newChatCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Keine Mitarbeiter ohne Chat gefunden</p>
            ) : (
              newChatCandidates.map((c) => (
                <button
                  key={c.id}
                  onClick={() => startNewChat(c)}
                  className="w-full text-left px-4 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-sm text-foreground"
                >
                  {c.first_name} {c.last_name}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>


      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Permanent header – always visible */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-3">
            {active ? (
              <>
                <AvatarUpload avatarUrl={employeeProfile.avatar_url} name={active.first_name} size={36} />
                <div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailDialogOpen(true)}
                      className="font-semibold text-foreground hover:underline cursor-pointer text-left"
                    >
                      {active.first_name} {active.last_name}
                    </button>
                    {contractData.employment_type && (
                      <Badge variant="secondary" className="text-[10px] px-2 py-0">
                        {contractData.employment_type}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Konversation</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Kein Chat ausgewählt</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {active && (
              <Button
                variant={contractData.is_suspended ? "destructive" : "outline"}
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => setSuspendDialogOpen(true)}
                title={contractData.is_suspended ? "Benutzerkonto entsperren" : "Benutzerkonto sperren"}
              >
                {contractData.is_suspended ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {contractData.is_suspended ? "Entsperren" : "Sperren"}
              </Button>
            )}
            {active && contractData.phone && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => {
                  setNotifySmsText("Sie haben eine neue Nachricht im Livechat. Bitte lesen Sie diese.");
                  setNotifySmsDialogOpen(true);
                }}
                title="Livechat-Benachrichtigung per SMS"
              >
                <Bell className="h-4 w-4" />
              </Button>
            )}
            {/* Admin avatar display */}
            <AvatarUpload avatarUrl={adminAvatar} name={adminDisplayName || "Admin"} size={36} />
          </div>
        </div>

        {active ? (
          <>
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-1">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Noch keine Nachrichten
                </div>
              ) : (
                messages.map((msg, i) => {
                  const showDate = i === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[i - 1].created_at).toDateString();
                  return (
                    <div key={msg.id}>
                      {showDate && <DateSeparator date={msg.created_at} />}
                      {msg.sender_role === "system" ? (
                        <SystemMessage content={msg.content} metadata={msg.metadata} />
                      ) : (
                        <ChatBubble
                          content={msg.content}
                          senderRole={msg.sender_role as "admin" | "user"}
                          createdAt={msg.created_at}
                          isOwnMessage={msg.sender_role === "admin"}
                          avatarUrl={msg.sender_role === "user" ? employeeProfile.avatar_url : undefined}
                          senderName={msg.sender_role === "user" ? (employeeProfile.display_name || `${active.first_name} ${active.last_name}`) : undefined}
                          attachmentUrl={msg.attachment_url}
                          messageId={msg.id}
                          onEdit={msg.sender_role === "admin" ? (id) => { setEditingMessageId(id); setEditingMessageText(msg.content); } : undefined}
                          isEditing={editingMessageId === msg.id}
                          editText={editingMessageId === msg.id ? editingMessageText : undefined}
                          onEditChange={editingMessageId === msg.id ? setEditingMessageText : undefined}
                          onEditSave={editingMessageId === msg.id ? async () => {
                            await supabase.from("chat_messages").update({ content: editingMessageText.trim() } as any).eq("id", msg.id);
                            setEditingMessageId(null);
                          } : undefined}
                          onEditCancel={editingMessageId === msg.id ? () => setEditingMessageId(null) : undefined}
                          read={msg.sender_role === "admin" ? msg.read : undefined}
                          readAt={msg.sender_role === "admin" ? (msg as any).read_at : undefined}
                        />
                      )}
                    </div>
                  );
                })
              )}
              {isTyping && <TypingIndicator />}
            </div>

            {/* Draft preview */}
            {draftPreview && (
              <div className="px-6 py-2 border-t border-border bg-muted/30 flex items-center gap-2">
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground italic line-clamp-2 break-words overflow-hidden">
                  {active.first_name} schreibt: {draftPreview}
                </p>
              </div>
            )}

            {/* KI-Antwortvorschlag */}
            {active?.contract_id && (
              <AiSuggestionBar
                contractId={active.contract_id}
                messages={messages}
                onAccept={(text) => setExternalChatValue(text)}
              />
            )}

            {/* Input with templates */}

            <ChatInput
              onSend={handleSend}
              showTemplates
              contractData={contractData}
              onTyping={handleTyping}
              externalValue={externalChatValue}
              onExternalValueConsumed={() => setExternalChatValue(null)}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageCircle className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">Wähle eine Konversation aus</p>
          </div>
        )}
      </div>

      {/* Sperr-Bestätigung */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {contractData.is_suspended ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {contractData.is_suspended ? "Benutzerkonto entsperren?" : "Benutzerkonto sperren?"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            {contractData.is_suspended
              ? `${contractData.first_name ?? ""} ${contractData.last_name ?? ""} erhält wieder vollen Zugriff auf das Mitarbeiter-Portal.`
              : `${contractData.first_name ?? ""} ${contractData.last_name ?? ""} kann sich anschließend nicht mehr im Mitarbeiter-Portal anmelden.`}
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSuspendDialogOpen(false)}>Abbrechen</Button>
            <Button
              variant={contractData.is_suspended ? "default" : "destructive"}
              onClick={handleToggleSuspend}
              disabled={suspendBusy}
            >
              {suspendBusy ? "Wird gespeichert..." : contractData.is_suspended ? "Entsperren" : "Sperren"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Notify SMS Dialog */}
      <Dialog open={notifySmsDialogOpen} onOpenChange={setNotifySmsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Livechat-Benachrichtigung
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Empfänger</Label>
              <p className="text-sm font-medium">{contractData.first_name} {contractData.last_name}</p>
              <p className="text-xs text-muted-foreground">{contractData.phone}</p>
            </div>
            <div className="space-y-2">
              <Label>Nachricht</Label>
              <Textarea
                value={notifySmsText}
                onChange={(e) => setNotifySmsText(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNotifySmsDialogOpen(false)}>Abbrechen</Button>
            <Button className="shadow-sm hover:shadow-md transition-all" onClick={handleSendNotifySms} disabled={notifySmsSending || !notifySmsText.trim()}>
              {notifySmsSending ? "Wird gesendet..." : "SMS senden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mitarbeiter-Detail Popup */}
      {active && (
        <MitarbeiterDetailPopup
          contractId={active.contract_id}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
        />
      )}
    </div>
  );
}
