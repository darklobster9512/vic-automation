import { useMemo, useRef, useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  LifeBuoy, Plus, ArrowLeft, Send, Paperclip, X, Loader2, CheckCircle2, RotateCcw,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sendTelegram } from "@/lib/sendTelegram";
import {
  TICKET_CATEGORIES, TICKET_PRIORITIES, categoryLabel, priorityLabel,
  statusLabel, statusBadgeClass, priorityBadgeClass, uploadTicketAttachment,
  type SupportTicket,
} from "@/lib/supportTickets";
import { useMyTickets, useTicketMessages, useSupportTicketsRealtime } from "@/hooks/useSupportTickets";

interface LayoutContext {
  contract: { id: string; first_name: string | null; last_name: string | null; branding_id: string | null } | null;
  branding: { id: string; company_name: string } | null;
}

const isImage = (url: string) => /\.(png|jpe?g|gif|webp|avif)$/i.test(url.split("?")[0]);

export default function MitarbeiterSupport() {
  const { user } = useAuth();
  const { contract, branding } = useOutletContext<LayoutContext>();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: tickets = [], isLoading } = useMyTickets(user?.id);
  const { data: messages = [] } = useTicketMessages(selectedId);

  useSupportTicketsRealtime([
    ["my-support-tickets", user?.id],
    ["support-ticket-messages", selectedId],
  ]);

  const selected = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? null,
    [tickets, selectedId],
  );

  // Mark as read once opened
  useEffect(() => {
    if (selected?.unread_for_user) {
      supabase
        .from("support_tickets")
        .update({ unread_for_user: false })
        .eq("id", selected.id)
        .then(() => queryClient.invalidateQueries({ queryKey: ["my-support-tickets", user?.id] }));
    }
  }, [selected?.id, selected?.unread_for_user, queryClient, user?.id]);

  const employeeName =
    [contract?.first_name, contract?.last_name].filter(Boolean).join(" ") || user?.email || "Mitarbeiter";

  if (selected) {
    return (
      <TicketDetail
        ticket={selected}
        messages={messages}
        onBack={() => setSelectedId(null)}
        employeeName={employeeName}
        brandingId={branding?.id ?? contract?.branding_id ?? null}
        brandingName={branding?.company_name ?? null}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto"
    >
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Support</h1>
          </div>
          <p className="text-muted-foreground">
            Stelle hier eine Anfrage an dein Support-Team und verfolge den Bearbeitungsstand.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="rounded-xl">
          <Plus className="h-4 w-4 mr-2" />
          Neues Ticket
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : tickets.length === 0 ? (
        <Card className="rounded-2xl border-border">
          <CardContent className="py-14 text-center">
            <LifeBuoy className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-medium text-foreground">Noch keine Tickets</p>
            <p className="text-sm text-muted-foreground mt-1">
              Erstelle ein Ticket, wenn du Hilfe brauchst – wir melden uns schnellstmöglich.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <button
                onClick={() => setSelectedId(t.id)}
                className="w-full text-left"
              >
                <Card className="rounded-2xl border-border hover:border-primary/40 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">{t.ticket_number}</span>
                          {t.unread_for_user && (
                            <span className="h-2 w-2 rounded-full bg-primary" aria-label="Neue Antwort" />
                          )}
                        </div>
                        <p className="font-semibold text-foreground truncate">{t.subject}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {categoryLabel(t.category)} · Letzte Aktivität{" "}
                          {format(new Date(t.last_message_at), "dd.MM.yyyy HH:mm", { locale: de })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge variant="outline" className={statusBadgeClass(t.status)}>
                          {statusLabel(t.status)}
                        </Badge>
                        <Badge variant="outline" className={priorityBadgeClass(t.priority)}>
                          {priorityLabel(t.priority)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <CreateTicketDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        userId={user?.id}
        contractId={contract?.id ?? null}
        brandingId={branding?.id ?? contract?.branding_id ?? null}
        brandingName={branding?.company_name ?? null}
        employeeName={employeeName}
        onCreated={(id) => {
          queryClient.invalidateQueries({ queryKey: ["my-support-tickets", user?.id] });
          setSelectedId(id);
        }}
      />
    </motion.div>
  );
}

/* ---------------- Create dialog ---------------- */

function CreateTicketDialog({
  open, onOpenChange, userId, contractId, brandingId, brandingName, employeeName, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId?: string;
  contractId: string | null;
  brandingId: string | null;
  brandingName: string | null;
  employeeName: string;
  onCreated: (id: string) => void;
}) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("sonstiges");
  const [priority, setPriority] = useState("normal");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setSubject(""); setCategory("sonstiges"); setPriority("normal");
    setDescription(""); setFiles([]);
  };

  const submit = async () => {
    if (!userId) return;
    const trimmedSubject = subject.trim();
    const trimmedDescription = description.trim();
    if (!trimmedSubject || trimmedSubject.length > 150) {
      toast.error("Bitte gib einen Betreff mit maximal 150 Zeichen an.");
      return;
    }
    if (!trimmedDescription || trimmedDescription.length > 5000) {
      toast.error("Bitte beschreibe dein Anliegen (maximal 5000 Zeichen).");
      return;
    }

    setSaving(true);
    try {
      const { data: ticket, error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: userId,
          contract_id: contractId,
          branding_id: brandingId,
          subject: trimmedSubject,
          category,
          priority,
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("support_ticket_messages").insert({
        ticket_id: ticket.id,
        sender_role: "user",
        created_by: userId,
        content: trimmedDescription,
      });

      for (const file of files) {
        const url = await uploadTicketAttachment(ticket.id, file);
        if (url) {
          await supabase.from("support_ticket_messages").insert({
            ticket_id: ticket.id,
            sender_role: "user",
            created_by: userId,
            content: "",
            attachment_url: url,
          });
        }
      }

      void sendTelegram(
        "ticket_neu",
        {
          icon: "🎫",
          title: "Neues Support-Ticket",
          fields: [
            { icon: "🔖", label: "Ticket", value: ticket.ticket_number, bold: true },
            { icon: "👤", label: "Mitarbeiter", value: employeeName },
            { icon: "📌", label: "Betreff", value: trimmedSubject },
            { icon: "🗂", label: "Kategorie", value: categoryLabel(category) },
            { icon: "⚡", label: "Priorität", value: priorityLabel(priority) },
            { icon: "💬", value: trimmedDescription.slice(0, 500) },
          ],
          brandingName,
        },
        brandingId,
      );

      toast.success(`Ticket ${ticket.ticket_number} wurde erstellt.`);
      reset();
      onOpenChange(false);
      onCreated(ticket.id);
    } catch (e) {
      console.error(e);
      toast.error("Ticket konnte nicht erstellt werden.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Neues Support-Ticket</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Betreff</label>
            <Input
              value={subject}
              maxLength={150}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Kurze Zusammenfassung deines Anliegens"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Kategorie</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TICKET_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Priorität</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TICKET_PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Beschreibung</label>
            <Textarea
              value={description}
              maxLength={5000}
              rows={6}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreibe dein Anliegen so genau wie möglich."
            />
          </div>

          <div>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])]);
                e.target.value = "";
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Paperclip className="h-4 w-4 mr-2" />
              Anhang hinzufügen
            </Button>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-sm bg-muted rounded-lg px-3 py-1.5">
                    <span className="truncate">{f.name}</span>
                    <button onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}>
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Abbrechen</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Ticket absenden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Detail view ---------------- */

function TicketDetail({
  ticket, messages, onBack, employeeName, brandingId, brandingName,
}: {
  ticket: SupportTicket;
  messages: { id: string; sender_role: string; content: string; attachment_url: string | null; created_at: string }[];
  onBack: () => void;
  employeeName: string;
  brandingId: string | null;
  brandingName: string | null;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const closed = ticket.status === "geschlossen";

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["my-support-tickets", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["support-ticket-messages", ticket.id] });
  };

  const send = async () => {
    const text = reply.trim();
    if ((!text && !file) || !user?.id) return;
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Zurück zur Übersicht
      </Button>

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
