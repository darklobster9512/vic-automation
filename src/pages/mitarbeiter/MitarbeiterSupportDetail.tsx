import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowLeft, Send, Paperclip, X, Loader2, CheckCircle2, RotateCcw } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sendTelegram } from "@/lib/sendTelegram";
import {
  categoryLabel, priorityLabel, statusLabel, statusBadgeClass, priorityBadgeClass,
  uploadTicketAttachment,
} from "@/lib/supportTickets";
import { useMyTickets, useTicketMessages, useSupportTicketsRealtime } from "@/hooks/useSupportTickets";

interface LayoutContext {
  contract: { id: string; first_name: string | null; last_name: string | null; branding_id: string | null } | null;
  branding: { id: string; company_name: string } | null;
}

const isImage = (url: string) => /\.(png|jpe?g|gif|webp|avif)$/i.test(url.split("?")[0]);

export default function MitarbeiterSupportDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { contract, branding } = useOutletContext<LayoutContext>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useMyTickets(user?.id);
  const { data: messages = [] } = useTicketMessages(id ?? null);

  useSupportTicketsRealtime([
    ["my-support-tickets", user?.id],
    ["support-ticket-messages", id],
  ]);

  const ticket = useMemo(() => tickets.find((t) => t.id === id) ?? null, [tickets, id]);

  const [reply, setReply] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (ticket?.unread_for_user) {
      supabase
        .from("support_tickets")
        .update({ unread_for_user: false })
        .eq("id", ticket.id)
        .then(() => queryClient.invalidateQueries({ queryKey: ["my-support-tickets", user?.id] }));
    }
  }, [ticket?.id, ticket?.unread_for_user, queryClient, user?.id]);

  const brandingId = branding?.id ?? contract?.branding_id ?? null;
  const brandingName = branding?.company_name ?? null;
  const employeeName =
    [contract?.first_name, contract?.last_name].filter(Boolean).join(" ") || user?.email || "Mitarbeiter";

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["my-support-tickets", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["support-ticket-messages", id] });
  };

  const send = async () => {
    const text = reply.trim();
    if (!ticket || (!text && !file) || !user?.id) return;
    if (text.length > 5000) {
      toast.error("Die Nachricht darf maximal 5000 Zeichen lang sein.");
      return;
    }
    setSending(true);
    try {
      let attachmentUrl: string | null = null;
      if (file) attachmentUrl = await uploadTicketAttachment(ticket.id, file);

      const { error } = await supabase.from("support_ticket_messages").insert({
        ticket_id: ticket.id,
        sender_role: "user",
        created_by: user.id,
        content: text,
        attachment_url: attachmentUrl,
      });
      if (error) throw error;

      void sendTelegram(
        "ticket_antwort",
        {
          icon: "💬",
          title: "Antwort auf Support-Ticket",
          fields: [
            { icon: "🔖", label: "Ticket", value: ticket.ticket_number, bold: true },
            { icon: "👤", label: "Mitarbeiter", value: employeeName },
            { icon: "📌", label: "Betreff", value: ticket.subject },
            { icon: "💬", value: text.slice(0, 500) || "(Anhang)" },
          ],
          brandingName,
        },
        brandingId,
      );

      setReply("");
      setFile(null);
      refresh();
    } catch (e) {
      console.error(e);
      toast.error("Nachricht konnte nicht gesendet werden.");
    } finally {
      setSending(false);
    }
  };

  const setStatus = async (status: string) => {
    if (!ticket) return;
    const { error } = await supabase
      .from("support_tickets")
      .update({ status, closed_at: status === "geschlossen" ? new Date().toISOString() : null })
      .eq("id", ticket.id);
    if (error) {
      toast.error("Status konnte nicht geändert werden.");
      return;
    }
    toast.success(status === "geschlossen" ? "Ticket geschlossen." : "Ticket wieder geöffnet.");
    refresh();
  };

  const backButton = (
    <Button variant="ghost" size="sm" onClick={() => navigate("/mitarbeiter/support")} className="mb-4 -ml-2">
      <ArrowLeft className="h-4 w-4 mr-2" />
      Zurück zur Übersicht
    </Button>
  );

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        {backButton}
        <Skeleton className="h-24 w-full rounded-2xl mb-4" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-4xl mx-auto">
        {backButton}
        <Card className="rounded-2xl border-border">
          <CardContent className="py-14 text-center">
            <p className="font-medium text-foreground">Ticket nicht gefunden</p>
            <p className="text-sm text-muted-foreground mt-1">
              Dieses Ticket existiert nicht oder gehört nicht zu deinem Konto.
            </p>
            <Button className="mt-4 rounded-xl" onClick={() => navigate("/mitarbeiter/support")}>
              Zur Übersicht
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const closed = ticket.status === "geschlossen";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
      {backButton}

      <Card className="rounded-2xl border-border mb-4">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
              <h1 className="text-xl font-bold text-foreground">{ticket.subject}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {categoryLabel(ticket.category)} · Erstellt am{" "}
                {format(new Date(ticket.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={statusBadgeClass(ticket.status)}>
                {statusLabel(ticket.status)}
              </Badge>
              <Badge variant="outline" className={priorityBadgeClass(ticket.priority)}>
                {priorityLabel(ticket.priority)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border">
        <CardContent className="p-5">
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            {messages.map((m) => {
              const mine = m.sender_role === "user";
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="text-xs opacity-70 mb-1">
                      {mine ? "Du" : "Support"} ·{" "}
                      {format(new Date(m.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                    </p>
                    {m.content && <p className="whitespace-pre-wrap text-sm">{m.content}</p>}
                    {m.attachment_url && (
                      isImage(m.attachment_url) ? (
                        <a href={m.attachment_url} target="_blank" rel="noreferrer">
                          <img src={m.attachment_url} alt="Anhang" className="mt-2 rounded-lg max-h-56" />
                        </a>
                      ) : (
                        <a
                          href={m.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-2 text-sm underline"
                        >
                          <Paperclip className="h-3.5 w-3.5" /> Anhang öffnen
                        </a>
                      )
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="mt-5 border-t border-border pt-4">
            {closed ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Dieses Ticket ist geschlossen.</p>
                <Button variant="outline" size="sm" onClick={() => setStatus("offen")}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Wieder öffnen
                </Button>
              </div>
            ) : (
              <>
                <Textarea
                  value={reply}
                  maxLength={5000}
                  rows={3}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Deine Antwort …"
                  className="mb-3"
                />
                {file && (
                  <div className="flex items-center justify-between text-sm bg-muted rounded-lg px-3 py-1.5 mb-3">
                    <span className="truncate">{file.name}</span>
                    <button onClick={() => setFile(null)}><X className="h-3.5 w-3.5" /></button>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setStatus("geschlossen")}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Ticket schließen
                    </Button>
                  </div>
                  <Button onClick={send} disabled={sending || (!reply.trim() && !file)}>
                    {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Senden
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
