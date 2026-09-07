import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  LifeBuoy, Search, Send, Paperclip, X, Loader2, Lock, User as UserIcon, ExternalLink, ArrowLeft,
  CheckCircle2, RotateCcw, XCircle,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";
import { sendEmail } from "@/lib/sendEmail";
import {
  TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES,
  categoryLabel, priorityLabel, statusLabel, statusBadgeClass, priorityBadgeClass,
  uploadTicketAttachment, type SupportTicket, type SupportTicketMessage,
} from "@/lib/supportTickets";
import { useSupportTicketsRealtime, useTicketMessages } from "@/hooks/useSupportTickets";

const isImage = (url: string) => /\.(png|jpe?g|gif|webp|avif)$/i.test(url.split("?")[0]);

const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

interface EnrichedTicket extends SupportTicket {
  employee_name: string;
  employee_email: string | null;
  branding_name: string | null;
}

export default function AdminTickets() {
  const { activeBrandingId, brandings } = useBrandingFilter();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState("offen");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("alle");
  const [priority, setPriority] = useState("alle");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["admin-support-tickets", activeBrandingId],
    queryFn: async (): Promise<EnrichedTicket[]> => {
      let query = supabase.from("support_tickets").select("*").order("last_message_at", { ascending: false });
      if (activeBrandingId) query = query.eq("branding_id", activeBrandingId);
      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []) as SupportTicket[];

      const contractIds = [...new Set(rows.map((r) => r.contract_id).filter(Boolean))] as string[];
      const userIds = [...new Set(rows.map((r) => r.user_id))];

      const [contractsRes, profilesRes] = await Promise.all([
        contractIds.length
          ? supabase.from("employment_contracts").select("id, first_name, last_name, email").in("id", contractIds)
          : Promise.resolve({ data: [] as any[] }),
        userIds.length
          ? supabase.from("profiles").select("id, full_name, display_name, email").in("id", userIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const contractMap = new Map((contractsRes.data ?? []).map((c: any) => [c.id, c]));
      const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
      const brandingMap = new Map(brandings.map((b) => [b.id, b.company_name]));

      return rows.map((r) => {
        const c = r.contract_id ? contractMap.get(r.contract_id) : null;
        const p = profileMap.get(r.user_id);
        const name =
          [c?.first_name, c?.last_name].filter(Boolean).join(" ") ||
          p?.full_name || p?.display_name || p?.email || "Unbekannt";
        return {
          ...r,
          employee_name: name,
          employee_email: c?.email ?? p?.email ?? null,
          branding_name: r.branding_id ? brandingMap.get(r.branding_id) ?? null : null,
        };
      });
    },
  });

  useSupportTicketsRealtime([
    ["admin-support-tickets", activeBrandingId],
    ["support-ticket-messages", selectedId],
  ]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { alle: tickets.length };
    for (const s of TICKET_STATUSES) c[s.value] = tickets.filter((t) => t.status === s.value).length;
    return c;
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (tab !== "alle" && t.status !== tab) return false;
      if (category !== "alle" && t.category !== category) return false;
      if (priority !== "alle" && t.priority !== priority) return false;
      if (!q) return true;
      return (
        t.subject.toLowerCase().includes(q) ||
        t.ticket_number.toLowerCase().includes(q) ||
        t.employee_name.toLowerCase().includes(q) ||
        (t.employee_email ?? "").toLowerCase().includes(q)
      );
    });
  }, [tickets, tab, category, priority, search]);

  const selected = useMemo(() => tickets.find((t) => t.id === selectedId) ?? null, [tickets, selectedId]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-support-tickets", activeBrandingId] });

  const bulkSetStatus = async (status: string) => {
    if (checked.length === 0) return;
    const { error } = await supabase
      .from("support_tickets")
      .update({ status, closed_at: status === "geschlossen" ? new Date().toISOString() : null })
      .in("id", checked);
    if (error) {
      toast.error("Aktion fehlgeschlagen.");
      return;
    }
    toast.success(`${checked.length} Ticket(s) auf „${statusLabel(status)}" gesetzt.`);
    setChecked([]);
    refresh();
  };

  if (selected) {
    return (
      <TicketDetailPanel
        ticket={selected}
        onBack={() => setSelectedId(null)}
        onChanged={refresh}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary">
          <LifeBuoy className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
          <p className="text-sm text-muted-foreground">Support-Anfragen der Mitarbeiter</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v); setChecked([]); }}>
        <TabsList className="flex-wrap h-auto">
          {[...TICKET_STATUSES, { value: "alle", label: "Alle" }].map((s) => (
            <TabsTrigger key={s.value} value={s.value} className="gap-2">
              {s.label}
              <Badge variant="secondary" className="px-1.5 py-0 text-xs">{counts[s.value] ?? 0}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche nach Name, Betreff oder Ticketnummer"
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Kategorien</SelectItem>
            {TICKET_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Prioritäten</SelectItem>
            {TICKET_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {checked.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">{checked.length} ausgewählt</span>
            <Button size="sm" variant="outline" onClick={() => bulkSetStatus("in_bearbeitung")}>In Bearbeitung</Button>
            <Button size="sm" variant="outline" onClick={() => bulkSetStatus("geloest")}>Gelöst</Button>
            <Button size="sm" variant="outline" onClick={() => bulkSetStatus("geschlossen")}>Schließen</Button>
            <Button size="sm" variant="ghost" onClick={() => setChecked([])}>Auswahl aufheben</Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-2xl">
          <CardContent className="py-16 text-center text-muted-foreground">
            <LifeBuoy className="h-10 w-10 mx-auto mb-3 opacity-40" />
            Keine Tickets in dieser Ansicht.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Checkbox
              checked={checked.length === filtered.length && filtered.length > 0}
              onCheckedChange={(v) => setChecked(v ? filtered.map((t) => t.id) : [])}
            />
            <span className="text-sm text-muted-foreground">Alle auswählen</span>
          </div>

          {filtered.map((t) => (
            <Card key={t.id} className="shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <Checkbox
                  checked={checked.includes(t.id)}
                  onCheckedChange={(v) =>
                    setChecked((prev) => (v ? [...prev, t.id] : prev.filter((id) => id !== t.id)))
                  }
                />
                <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                  {initials(t.employee_name)}
                </div>
                <button className="flex-1 min-w-0 text-left" onClick={() => setSelectedId(t.id)}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{t.ticket_number}</span>
                    {t.unread_for_admin && <span className="h-2 w-2 rounded-full bg-destructive" />}
                  </div>
                  <p className="font-semibold truncate">{t.subject}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {t.employee_name}
                    {t.branding_name ? ` · ${t.branding_name}` : ""} · {categoryLabel(t.category)} ·{" "}
                    {format(new Date(t.last_message_at), "dd.MM.yyyy HH:mm", { locale: de })}
                  </p>
                </button>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Badge variant="outline" className={statusBadgeClass(t.status)}>{statusLabel(t.status)}</Badge>
                  <Badge variant="outline" className={priorityBadgeClass(t.priority)}>{priorityLabel(t.priority)}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Detail panel ---------------- */

function TicketDetailPanel({
  ticket, onBack, onChanged,
}: {
  ticket: EnrichedTicket;
  onBack: () => void;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: messages = [] } = useTicketMessages(ticket.id);

  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: admins = [] } = useQuery({
    queryKey: ["ticket-admin-list"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      const ids = (roles ?? []).map((r: any) => r.user_id);
      if (ids.length === 0) return [] as { id: string; name: string }[];
      const { data } = await supabase.from("profiles").select("id, full_name, display_name, email").in("id", ids);
      return (data ?? []).map((p: any) => ({
        id: p.id,
        name: p.display_name || p.full_name || p.email || p.id.slice(0, 8),
      }));
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["ticket-templates", ticket.branding_id],
    queryFn: async () => {
      let q = supabase.from("chat_templates").select("id, shortcode, content");
      if (ticket.branding_id) q = q.eq("branding_id", ticket.branding_id);
      const { data } = await q.order("shortcode");
      return data ?? [];
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Mark read for admin
  useEffect(() => {
    if (ticket.unread_for_admin) {
      supabase.from("support_tickets").update({ unread_for_admin: false }).eq("id", ticket.id).then(onChanged);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["support-ticket-messages", ticket.id] });
    onChanged();
  };

  const patch = async (values: Partial<SupportTicket>) => {
    const { error } = await supabase.from("support_tickets").update(values).eq("id", ticket.id);
    if (error) {
      toast.error("Änderung fehlgeschlagen.");
      return;
    }
    refresh();
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
        sender_role: "admin",
        created_by: user.id,
        content: text,
        attachment_url: attachmentUrl,
        is_internal: internal,
      });
      if (error) throw error;

      if (!internal && ticket.employee_email) {
        try {
          await sendEmail({
            to: ticket.employee_email,
            recipient_name: ticket.employee_name,
            subject: `Antwort auf dein Ticket ${ticket.ticket_number}`,
            body_title: "Neue Antwort vom Support",
            body_lines: [
              `Hallo ${ticket.employee_name.split(" ")[0]},`,
              `zu deinem Ticket ${ticket.ticket_number} („${ticket.subject}") gibt es eine neue Antwort.`,
              text || "Es wurde ein Anhang hinzugefügt.",
            ],
            button_text: "Ticket öffnen",
            button_url: `${window.location.origin}/mitarbeiter/support`,
            branding_id: ticket.branding_id,
            event_type: "ticket_antwort",
            metadata: { ticket_id: ticket.id },
          });
        } catch (e) {
          console.error("Ticket-Mail fehlgeschlagen:", e);
        }
      }

      setReply("");
      setFile(null);
      setInternal(false);
      refresh();
    } catch (e) {
      console.error(e);
      toast.error("Nachricht konnte nicht gesendet werden.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Zurück zur Ticketliste
      </Button>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-2xl">
          <CardContent className="p-5">
            <div className="mb-4">
              <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
              <h2 className="text-xl font-bold">{ticket.subject}</h2>
              <p className="text-sm text-muted-foreground">
                {ticket.employee_name} · {categoryLabel(ticket.category)} ·{" "}
                {format(new Date(ticket.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
              </p>
            </div>

            <div className="space-y-4 max-h-[52vh] overflow-y-auto pr-1">
              {messages.map((m: SupportTicketMessage) => {
                const admin = m.sender_role === "admin";
                return (
                  <div key={m.id} className={`flex ${admin ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        m.is_internal
                          ? "bg-amber-500/10 border border-amber-500/30 text-foreground"
                          : admin
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="text-xs opacity-70 mb-1 flex items-center gap-1">
                        {m.is_internal && <Lock className="h-3 w-3" />}
                        {m.is_internal ? "Interne Notiz" : admin ? "Support" : ticket.employee_name} ·{" "}
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

            <div className="mt-5 border-t pt-4">
              {templates.length > 0 && (
                <Select onValueChange={(v) => setReply((p) => (p ? `${p}\n${v}` : v))}>
                  <SelectTrigger className="w-full mb-3">
                    <SelectValue placeholder="Antwortvorlage einfügen" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t: any) => (
                      <SelectItem key={t.id} value={t.content}>{t.shortcode}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Textarea
                value={reply}
                maxLength={5000}
                rows={4}
                onChange={(e) => setReply(e.target.value)}
                placeholder={internal ? "Interne Notiz (für den Mitarbeiter unsichtbar) …" : "Antwort an den Mitarbeiter …"}
                className="mb-3"
              />

              {file && (
                <div className="flex items-center justify-between text-sm bg-muted rounded-lg px-3 py-1.5 mb-3">
                  <span className="truncate">{file.name}</span>
                  <button onClick={() => setFile(null)}><X className="h-3.5 w-3.5" /></button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
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
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={internal} onCheckedChange={(v) => setInternal(!!v)} />
                    Interne Notiz
                  </label>
                </div>
                <Button onClick={send} disabled={sending || (!reply.trim() && !file)}>
                  {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  {internal ? "Notiz speichern" : "Antwort senden"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xl h-fit">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                {initials(ticket.employee_name)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{ticket.employee_name}</p>
                <p className="text-xs text-muted-foreground truncate">{ticket.employee_email ?? "–"}</p>
              </div>
            </div>

            {ticket.contract_id && (
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to={`/admin/mitarbeiter/${ticket.contract_id}`}>
                  <UserIcon className="h-4 w-4 mr-2" />
                  Mitarbeiterprofil
                  <ExternalLink className="h-3.5 w-3.5 ml-auto" />
                </Link>
              </Button>
            )}

            <div>
              <label className="text-sm font-medium mb-1.5 block">Status</label>
              <Select
                value={ticket.status}
                onValueChange={(v) =>
                  patch({ status: v, closed_at: v === "geschlossen" ? new Date().toISOString() : null })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TICKET_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Priorität</label>
              <Select value={ticket.priority} onValueChange={(v) => patch({ priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TICKET_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Zugewiesen an</label>
              <Select
                value={ticket.assigned_to ?? "none"}
                onValueChange={(v) => patch({ assigned_to: v === "none" ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="Niemand" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Niemand</SelectItem>
                  {admins.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
              <p>Branding: {ticket.branding_name ?? "–"}</p>
              <p>Kategorie: {categoryLabel(ticket.category)}</p>
              <p>Erstellt: {format(new Date(ticket.created_at), "dd.MM.yyyy HH:mm", { locale: de })}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
