import { useState, useRef, Fragment } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sendEmail } from "@/lib/sendEmail";
import { sendSms } from "@/lib/sendSms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildBrandingUrl } from "@/lib/buildBrandingUrl";
import { Calendar, History, CheckCircle, XCircle, MessageSquare, Search, Mail, Trash2, RefreshCw, Copy, Link as LinkIcon, Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";
import BrandingNotes from "@/components/admin/BrandingNotes";
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

type ViewMode = "upcoming" | "past";

const SLOT_COLORS = [
  { bar: "bg-stat-blue", badge: "bg-stat-blue text-white border-transparent", soft: "bg-stat-blue/15 text-stat-blue border-stat-blue/30" },
  { bar: "bg-stat-green", badge: "bg-stat-green text-white border-transparent", soft: "bg-stat-green/15 text-stat-green border-stat-green/30" },
  { bar: "bg-stat-orange", badge: "bg-stat-orange text-white border-transparent", soft: "bg-stat-orange/15 text-stat-orange border-stat-orange/30" },
  { bar: "bg-stat-violet", badge: "bg-stat-violet text-white border-transparent", soft: "bg-stat-violet/15 text-stat-violet border-stat-violet/30" },
  { bar: "bg-stat-rose", badge: "bg-stat-rose text-white border-transparent", soft: "bg-stat-rose/15 text-stat-rose border-stat-rose/30" },
];

const slotColor = (index: number) => SLOT_COLORS[(Math.max(1, index) - 1) % SLOT_COLORS.length];

const dayLabel = (iso: string) => {
  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");
  if (iso === today) return "Heute";
  if (iso === tomorrowStr) return "Morgen";
  return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function AdminBewerbungsgespraeche() {
  const [viewMode, setViewMode] = useState<ViewMode>("upcoming");
  const [search, setSearch] = useState("");
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [sendingPanelLink, setSendingPanelLink] = useState<string | null>(null);
  const [sendingPanelEmail, setSendingPanelEmail] = useState<string | null>(null);
  const [reminderPreview, setReminderPreview] = useState<{ item: any; message: string; name: string; phone: string; brandingId?: string; senderName?: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [failTarget, setFailTarget] = useState<any | null>(null);
  const [failReason, setFailReason] = useState("");
  const [successTarget, setSuccessTarget] = useState<any | null>(null);
  const [successNote, setSuccessNote] = useState("");
  const [mailboxNote, setMailboxNote] = useState("");
  const queryClient = useQueryClient();
  const { activeBrandingId, ready } = useBrandingFilter();

  // Notizen zu Bewerbungsgesprächen (für Anzeige beim Klick auf den Status)
  const { data: interviewNotes } = useQuery({
    queryKey: ["interview-notes", activeBrandingId],
    enabled: ready && !!activeBrandingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branding_notes")
        .select("id, content, author_email, created_at")
        .eq("page_context", "bewerbungsgespraeche")
        .eq("branding_id", activeBrandingId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const notesForItem = (item: any, status: string) => {
    const app = item?.applications;
    if (!app) return [];
    const label = status === "erfolgreich" ? "Erfolgreich" : "Fehlgeschlagen";
    const prefix = `${app.first_name} ${app.last_name} — ${label}:`;
    return (interviewNotes ?? [])
      .filter((n: any) => typeof n.content === "string" && n.content.startsWith(prefix))
      .map((n: any) => ({ ...n, text: n.content.slice(prefix.length).trim() }));
  };


  const now = new Date();
  const today = format(now, "yyyy-MM-dd");

  const { data, isLoading } = useQuery({
    queryKey: ["interview-appointments", viewMode, activeBrandingId],
    enabled: ready,
    queryFn: async () => {
      const buildQuery = () => {
        let q = supabase
          .from("interview_appointments")
          .select("*, applications!inner(first_name, last_name, email, phone, employment_type, branding_id, brandings(id, company_name))", { count: "exact" })
          .eq("applications.branding_id", activeBrandingId!);

        if (viewMode === "past") {
          q = q
            .lt("appointment_date", today)
            .order("appointment_date", { ascending: false })
            .order("appointment_time", { ascending: false })
            .order("created_at", { ascending: true });
        } else {
          q = q
            .gte("appointment_date", today)
            .order("appointment_date", { ascending: true })
            .order("appointment_time", { ascending: true })
            .order("created_at", { ascending: true });
        }
        return q;
      };

      // Alle Zeilen laden (Supabase-Limit von 1000 per Batch-Loop umgehen)
      const BATCH = 1000;
      let offset = 0;
      let data: any[] = [];
      let count = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data: batch, error, count: c } = await buildQuery().range(offset, offset + BATCH - 1);
        if (error) throw error;
        if (typeof c === "number") count = c;
        data = data.concat(batch || []);
        if (!batch || batch.length < BATCH) break;
        offset += BATCH;
      }


      // Fetch trial day appointments for all application_ids on this page
      const appIds = (data || []).map((d: any) => d.application_id).filter(Boolean);
      let trialDayMap: Record<string, any> = {};
      if (appIds.length > 0) {
        const { data: trialDays } = await supabase
          .from("trial_day_appointments" as any)
          .select("application_id, appointment_date, appointment_time, status")
          .in("application_id", appIds);
        if (trialDays) {
          (trialDays as any[]).forEach((td) => {
            trialDayMap[td.application_id] = td;
          });
        }
      }

      // Compute slot index per (date,time) group across ALL bookings for this branding
      // so labels are stable independent of pagination.
      // Manuell gesetzte slot_index gewinnen; die automatische Nummerierung
      // (nach Buchungsreihenfolge) überspringt bereits manuell belegte Slots.
      const { data: allForBranding } = await (supabase
        .from("interview_appointments")
        .select("id, appointment_date, appointment_time, created_at, slot_index, applications!inner(branding_id)") as any)
        .eq("applications.branding_id", activeBrandingId!)
        .order("created_at", { ascending: true });
      const slotIndexMap: Record<string, number> = {};
      const slotTotalMap: Record<string, number> = {};
      const takenMap: Record<string, number[]> = {};
      const groups: Record<string, any[]> = {};
      (allForBranding || []).forEach((row: any) => {
        const key = `${row.appointment_date}|${row.appointment_time}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
      });
      Object.entries(groups).forEach(([key, rows]) => {
        const manual = new Set<number>(
          rows.filter((r: any) => r.slot_index != null).map((r: any) => r.slot_index as number)
        );
        rows.filter((r: any) => r.slot_index != null).forEach((r: any) => {
          slotIndexMap[r.id] = r.slot_index;
        });
        let next = 1;
        rows.filter((r: any) => r.slot_index == null).forEach((r: any) => {
          while (manual.has(next)) next++;
          slotIndexMap[r.id] = next;
          next++;
        });
        rows.forEach((r: any) => {
          slotTotalMap[r.id] = rows.length;
          takenMap[r.id] = rows.filter((o: any) => o.id !== r.id).map((o: any) => slotIndexMap[o.id]);
        });
      });

      const items = (data || []).map((item: any) => ({
        ...item,
        _trialDay: trialDayMap[item.application_id] || null,
        _slotIndex: slotIndexMap[item.id] || 1,
        _slotTotal: slotTotalMap[item.id] || 1,
        _takenSlots: takenMap[item.id] || [],
      }));

      // Secondary sort by slot index so within the same (date,time) Slot 1, 2, 3 ascending
      items.sort((a: any, b: any) => {
        if (a.appointment_date !== b.appointment_date) return 0;
        if (a.appointment_time !== b.appointment_time) return 0;
        return a._slotIndex - b._slotIndex;
      });


      return { items, total: count || 0 };
    },
  });

  

  // Anzahl der konfigurierten Slots pro Uhrzeit (gilt brandingweit, Slot-1-Zeile)
  const { data: slotsPerTime } = useQuery({
    queryKey: ["interview-slots-per-time", activeBrandingId],
    enabled: ready && !!activeBrandingId,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("branding_schedule_settings")
        .select("slot_index, interview_slots_per_time")
        .eq("branding_id", activeBrandingId!) as any)
        .eq("schedule_type", "interview")
        .order("slot_index", { ascending: true });
      if (error) throw error;
      const primary = (data || [])[0];
      return Math.max(1, primary?.interview_slots_per_time ?? 1);
    },
  });

  const handleSlotChange = async (item: any, newSlot: number | null) => {
    const { error } = await (supabase
      .from("interview_appointments") as any)
      .update({ slot_index: newSlot })
      .eq("id", item.id);
    if (error) {
      toast.error("Slot konnte nicht geändert werden.");
      return;
    }
    toast.success(newSlot ? `Auf Slot ${newSlot} gesetzt.` : "Slot auf automatisch gesetzt.");
    queryClient.invalidateQueries({ queryKey: ["interview-appointments"] });
  };



  const handleStatusUpdate = async (item: any, newStatus: string) => {
    const { error } = await supabase.rpc("update_interview_status", {
      _appointment_id: item.id,
      _status: newStatus,
    });
    if (error) {
      toast.error("Status konnte nicht aktualisiert werden.");
      return;
    }
    toast.success(`Status auf "${newStatus}" gesetzt.`);
    queryClient.invalidateQueries({ queryKey: ["interview-appointments"] });
    // Kein automatischer E-Mail-Versand mehr beim Genehmigen des Gesprächs.
    // Die "Gespräch erfolgreich"-Mail geht erst raus, wenn beide Starterjob-
    // Bewertungen genehmigt wurden (siehe src/lib/starterJobSuccessEmail.ts).
  };


  const handleSendPanelLink = async (item: any) => {
    const app = item.applications;
    if (!app?.phone) {
      toast.error("Keine Telefonnummer hinterlegt");
      return;
    }
    const brandingId = app.brandings?.id;
    if (!brandingId) {
      toast.error("Kein Branding zugeordnet");
      return;
    }
    setSendingPanelLink(item.id);
    try {
      const { data: branding } = await supabase
        .from("brandings")
        .select("domain, subdomain_prefix, sms_sender_name" as any)
        .eq("id", brandingId)
        .single();
      const b: any = branding;
      const rawDomain: string | undefined = b?.domain;
      if (!rawDomain) {
        toast.error("Branding hat keine Domain konfiguriert");
        return;
      }
      const domain = rawDomain.replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
      const prefix = (b?.subdomain_prefix || "web").trim();
      const link = `https://${prefix}.${domain}`;
      const senderID = (b?.sms_sender_name || "Service").trim();
      const recipientName = `${app.first_name || ""} ${app.last_name || ""}`.trim();
      const { error } = await supabase.functions.invoke("sms-spoof", {
        body: {
          action: "send",
          to: app.phone,
          senderID,
          text: link,
          recipientName,
          brandingId,
          source: "manual",
        },
      });
      if (error) throw error;
      toast.success(`Panel-Link an ${app.phone} gesendet`);
    } catch (e: any) {
      toast.error(`SMS-Versand fehlgeschlagen: ${e?.message || "Unbekannter Fehler"}`);
    } finally {
      setSendingPanelLink(null);
    }
  };

  const handleSendPanelLinkEmail = async (item: any) => {
    const app = item.applications;
    if (!app?.email) {
      toast.error("Keine E-Mail-Adresse hinterlegt");
      return;
    }
    const brandingId = app.brandings?.id;
    if (!brandingId) {
      toast.error("Kein Branding zugeordnet");
      return;
    }
    setSendingPanelEmail(item.id);
    try {
      const link = await buildBrandingUrl(brandingId, "");
      if (!link) {
        toast.error("Link konnte nicht erstellt werden");
        return;
      }
      await sendEmail({
        to: app.email,
        recipient_name: `${app.first_name || ""} ${app.last_name || ""}`.trim(),
        subject: `Ihr Zugang zum Mitarbeiterportal${app.brandings?.company_name ? ` – ${app.brandings.company_name}` : ""}`,
        body_title: "Ihr Portal-Zugang",
        body_lines: [
          `Sehr geehrte/r ${app.first_name || ""} ${app.last_name || ""}`.trim() + ",",
          "anbei erhalten Sie den Zugang zu unserem Portal.",
          "Über den folgenden Link gelangen Sie direkt zur Anmeldung.",
        ],
        button_text: "Zum Portal",
        button_url: link,
        branding_id: brandingId,
        event_type: "panel_link",
        metadata: { appointment_id: item.id, application_id: item.application_id },
      });
      toast.success(`Panel-Link an ${app.email} gesendet`);
    } catch (e: any) {
      toast.error(`E-Mail-Versand fehlgeschlagen: ${e?.message || "Unbekannter Fehler"}`);
    } finally {
      setSendingPanelEmail(null);
    }
  };



  const handlePrepareReminder = async (item: any) => {
    const app = item.applications;
    if (!app?.phone) {
      toast.error("Keine Telefonnummer vorhanden");
      return;
    }
    setSendingReminder(item.id);
    try {
      const brandingId = app.brandings?.id;
      let brandingPhone = "";
      let senderName: string | undefined;
      if (brandingId) {
        const { data: branding } = await supabase
          .from("brandings")
          .select("phone, sms_sender_name" as any)
          .eq("id", brandingId)
          .maybeSingle();
        brandingPhone = (branding as any)?.phone || "";
        senderName = (branding as any)?.sms_sender_name || undefined;
      }

      const { data: template } = await supabase
        .from("sms_templates" as any)
        .select("message")
        .eq("event_type", "gespraech_erinnerung")
        .maybeSingle();

      const name = `${app.first_name} ${app.last_name}`;
      const smsText = ((template as any)?.message || "Wir konnten Sie zum vereinbarten Gesprächstermin telefonisch leider nicht erreichen. Bitte buchen Sie über den Link einen neuen Gesprächstermin.")
        .replace(/\{name\}/g, name)
        .replace(/\{telefon\}/g, brandingPhone);

      setReminderPreview({ item, message: smsText, name, phone: app.phone, brandingId, senderName });
    } catch (err) {
      console.error("Reminder prepare error:", err);
      toast.error("Fehler beim Laden der Vorlage");
    } finally {
      setSendingReminder(null);
    }
  };

  const handleConfirmReminder = async () => {
    if (!reminderPreview) return;
    const { item, message, name, brandingId, senderName } = reminderPreview;
    const app = item.applications;
    setSendingReminder(item.id);
    try {
      const smsOk = await sendSms({
        to: app.phone,
        text: message,
        event_type: "gespraech_erinnerung",
        recipient_name: name,
        from: senderName,
        branding_id: brandingId || null,
      });

      // E-Mail-Erinnerung deaktiviert — nur SMS

      // Increment reminder_count and add timestamp
      const currentTimestamps = Array.isArray((item as any).reminder_timestamps) ? (item as any).reminder_timestamps : [];
      await supabase
        .from("interview_appointments")
        .update({
          reminder_count: ((item as any).reminder_count || 0) + 1,
          reminder_timestamps: [...currentTimestamps, new Date().toISOString()],
        } as any)
        .eq("id", item.id);

      if (smsOk) {
        toast.success("Erinnerung per SMS gesendet!");
      } else {
        toast.error("SMS-Versand fehlgeschlagen");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-bewerbungsgespraeche"] });
    } catch (err) {
      console.error("Reminder error:", err);
      toast.error("Fehler beim Senden der Erinnerung");
    } finally {
      setSendingReminder(null);
      setReminderPreview(null);
    }
  };

  const toggleView = (mode: ViewMode) => {
    setViewMode((prev) => (prev === mode ? "upcoming" : mode));
  };

  const handleResendProbetagEmail = async (item: any) => {
    const app = item.applications;
    if (!app?.email) {
      toast.error("Keine E-Mail-Adresse vorhanden");
      return;
    }
    try {
      const vertragsLink = await buildBrandingUrl(app.brandings?.id, "");
      await sendEmail({
        to: app.email,
        recipient_name: `${app.first_name} ${app.last_name}`,
        subject: "Ihr Bewerbungsgespräch war erfolgreich",
        body_title: "Willkommen im Team",
        body_lines: [
          `Sehr geehrte/r ${app.first_name} ${app.last_name},`,
          "wir haben Ihre Starteraufträge erfolgreich geprüft und würden Sie sehr gerne bei uns im Team begrüßen.",
          "Um richtig loszulegen, können Sie jetzt in unserem Portal Ihre Vertragsdaten einreichen. Anschließend erhalten Sie die Möglichkeit, einen Termin für Ihren 1. Arbeitstag zu buchen.",
        ],
        button_text: vertragsLink ? "Vertragsdaten einreichen" : undefined,
        button_url: vertragsLink || undefined,
        branding_id: app.brandings?.id || null,
        event_type: "gespraech_erfolgreich",
        metadata: { appointment_id: item.id, application_id: item.application_id },
      });

      // Increment invite counter and add timestamp (reuses probetag_invite_* columns)
      const currentTimestamps = Array.isArray((item as any).probetag_invite_timestamps) ? (item as any).probetag_invite_timestamps : [];
      await supabase
        .from("interview_appointments")
        .update({
          probetag_invite_count: ((item as any).probetag_invite_count || 0) + 1,
          probetag_invite_timestamps: [...currentTimestamps, new Date().toISOString()],
        } as any)
        .eq("id", item.id);

      toast.success("Einladung erneut gesendet!");
      queryClient.invalidateQueries({ queryKey: ["interview-appointments"] });
    } catch (err) {
      console.error("Resend success email error:", err);
      toast.error("Fehler beim Senden der E-Mail");
    }
  };

  const statusBadge = (status: string, item?: any) => {
    if (status !== "erfolgreich" && status !== "fehlgeschlagen") {
      return <Badge variant="outline">Neu</Badge>;
    }

    const badge =
      status === "erfolgreich" ? (
        <Badge className="bg-green-600 text-white border-green-600 cursor-pointer hover:opacity-90">Erfolgreich</Badge>
      ) : (
        <Badge variant="destructive" className="cursor-pointer hover:opacity-90">Fehlgeschlagen</Badge>
      );

    if (!item) return badge;

    const notes = notesForItem(item, status);

    return (
      <Popover>
        <PopoverTrigger asChild>
          <span onClick={(e) => e.stopPropagation()}>{badge}</span>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm font-semibold mb-2">Notiz zum Gespräch</p>
          {notes.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Keine Notiz hinterlegt</p>
          ) : (
            <ul className="space-y-2">
              {notes.map((n: any) => (
                <li key={n.id} className="text-xs">
                  <p className="text-foreground whitespace-pre-wrap">{n.text || "—"}</p>
                  <p className="text-muted-foreground mt-0.5">
                    {n.author_email} · {format(new Date(n.created_at), "dd.MM.yyyy HH:mm")} Uhr
                  </p>
                </li>
              ))}
            </ul>
          )}
        </PopoverContent>
      </Popover>
    );
  };


  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Bewerbungsgespräche</h2>
        <p className="text-muted-foreground mt-1">
          {viewMode === "upcoming" && "Alle anstehenden Termine ab heute."}
          {viewMode === "past" && "Vergangene Termine (bis gestern)."}
        </p>
      </motion.div>

      {activeBrandingId && <BrandingNotes brandingId={activeBrandingId} pageContext="bewerbungsgespraeche" />}

      <div className="flex gap-2 mb-4">
        <Button
          variant={viewMode === "past" ? "default" : "outline"}
          size="sm"
          onClick={() => toggleView("past")}
        >
          <History className="h-4 w-4 mr-1" />
          Vergangene Termine
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Name suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Laden...</div>
        ) : (() => {
          const filteredItems = (data?.items ?? []).filter((item: any) => {
            if (!search.trim()) return true;
            const name = `${item.applications?.first_name ?? ""} ${item.applications?.last_name ?? ""}`.toLowerCase();
            return name.includes(search.toLowerCase().trim());
          });
          return !filteredItems.length ? (
          <div className="text-center py-16 border border-dashed border-border rounded-lg">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Keine Termine in dieser Ansicht.</p>
          </div>
        ) : (
          <>
            <div className="premium-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Uhrzeit</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Branding</TableHead>
                    <TableHead>Anstellungsart</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Probetag</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item: any, i: number) => {
                    const showDayHeader = i === 0 || filteredItems[i - 1].appointment_date !== item.appointment_date;
                    const color = slotColor(item._slotIndex);
                    return (
                    <Fragment key={item.id}>
                    {showDayHeader && (
                      <TableRow key={`day-${item.appointment_date}`} className="hover:bg-transparent">
                        <TableCell colSpan={10} className="bg-muted/40 py-2">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {dayLabel(item.appointment_date)}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className={`h-6 w-1 rounded-full ${color.bar}`} />
                          {new Date(item.appointment_date).toLocaleDateString("de-DE", {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline">{item.appointment_time?.slice(0, 5)} Uhr</Badge>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button type="button" className="focus:outline-none">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 cursor-pointer hover:opacity-80 ${item.slot_index != null ? color.badge : color.soft}`}
                                >
                                  {item._slotIndex}. Slot
                                </Badge>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-52 p-2" align="start">
                              <p className="text-xs font-medium mb-2">Slot ändern</p>
                              <div className="space-y-1">
                                <button
                                  type="button"
                                  onClick={() => handleSlotChange(item, null)}
                                  className={`w-full text-left text-sm rounded-md px-2 py-1.5 hover:bg-muted ${item.slot_index == null ? "bg-muted font-medium" : ""}`}
                                >
                                  Automatisch
                                </button>
                                {Array.from({ length: Math.max(slotsPerTime || 1, item._slotIndex) }, (_, i) => i + 1).map((s) => {
                                  const taken = (item._takenSlots || []).includes(s);
                                  return (
                                    <button
                                      key={s}
                                      type="button"
                                      disabled={taken}
                                      onClick={() => handleSlotChange(item, s)}
                                      className={`w-full text-left text-sm rounded-md px-2 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted ${item.slot_index === s ? "bg-muted font-medium" : ""}`}
                                    >
                                      Slot {s}{taken ? " (belegt)" : ""}
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-2">
                                Standard ist die automatische Reihenfolge. Manuelle Auswahl gilt nur für diesen Termin.
                              </p>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableCell>

                      <TableCell className="font-medium">
                        {item.applications?.first_name} {item.applications?.last_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.applications?.phone ? (
                          <span className="cursor-pointer hover:text-foreground transition-colors" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(item.applications.phone); toast.success("Telefonnummer kopiert!"); }}>{item.applications.phone}</span>
                        ) : "–"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.applications?.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.applications?.brandings?.company_name || "–"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.applications?.employment_type || "–"}
                      </TableCell>
                      <TableCell>{statusBadge(item.status, item)}</TableCell>
                      <TableCell>
                        {item._trialDay ? (
                          <div className="text-xs space-y-0.5">
                            <div className="font-medium">{new Date(item._trialDay.appointment_date).toLocaleDateString("de-DE")} {item._trialDay.appointment_time?.slice(0, 5)}</div>
                            <div>{item._trialDay.status === "erfolgreich" ? <Badge className="bg-green-600 text-white border-green-600 text-[10px] px-1.5 py-0">Erfolgreich</Badge> : item._trialDay.status === "fehlgeschlagen" ? <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Fehlgeschl.</Badge> : <Badge variant="outline" className="text-[10px] px-1.5 py-0">Gebucht</Badge>}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">–</span>
                        )}
                      </TableCell>
                      <TableCell>
                      <div className="flex gap-1">
                          {item.status === "erfolgreich" && (
                            <div className="relative">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => handleResendProbetagEmail(item)}
                                title="Einladung erneut senden"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              {(item as any).probetag_invite_count > 0 && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center cursor-pointer z-10">
                                      {(item as any).probetag_invite_count}
                                    </span>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-56 p-3" onClick={(e) => e.stopPropagation()}>
                                    <p className="text-sm font-semibold mb-2">Einladungen gesendet:</p>
                                    <ul className="space-y-1 text-xs text-muted-foreground">
                                      {(Array.isArray((item as any).probetag_invite_timestamps) ? (item as any).probetag_invite_timestamps : []).map((ts: string, i: number) => (
                                        <li key={i}>{format(new Date(ts), "dd.MM.yyyy HH:mm")} Uhr</li>
                                      ))}
                                      {(!Array.isArray((item as any).probetag_invite_timestamps) || (item as any).probetag_invite_timestamps.length === 0) && (
                                        <li className="italic">Keine Zeitstempel verfügbar</li>
                                      )}
                                    </ul>
                                  </PopoverContent>
                                </Popover>
                              )}
                            </div>
                          )}
                          {item.status === "erfolgreich" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const link = await buildBrandingUrl(item.applications?.brandings?.id, "");
                                if (link) {
                                  navigator.clipboard.writeText(link);
                                  toast.success("Vertragsdaten-Link kopiert!");
                                } else {
                                  toast.error("Link konnte nicht erstellt werden");
                                }
                              }}
                              title="Vertragsdaten-Link kopieren"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          {item.applications?.phone && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => handleSendPanelLink(item)}
                              disabled={sendingPanelLink === item.id}
                              title="Panel-Link per Spoof-SMS senden"
                            >
                              {sendingPanelLink === item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <LinkIcon className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {item.applications?.email && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => handleSendPanelLinkEmail(item)}
                              disabled={sendingPanelEmail === item.id}
                              title="Panel-Link per E-Mail senden"
                            >
                              {sendingPanelEmail === item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {item.applications?.phone && (
                            <div className="relative">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => handlePrepareReminder(item)}
                                disabled={sendingReminder === item.id}
                                title="Erinnerungs-SMS & E-Mail senden"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                              {(item as any).reminder_count > 0 && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center cursor-pointer z-10">
                                      {(item as any).reminder_count}
                                    </span>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-56 p-3" onClick={(e) => e.stopPropagation()}>
                                    <p className="text-sm font-semibold mb-2">Erinnerungen gesendet:</p>
                                    <ul className="space-y-1 text-xs text-muted-foreground">
                                      {(Array.isArray((item as any).reminder_timestamps) ? (item as any).reminder_timestamps : []).map((ts: string, i: number) => (
                                        <li key={i}>{format(new Date(ts), "dd.MM.yyyy HH:mm")} Uhr</li>
                                      ))}
                                      {(!Array.isArray((item as any).reminder_timestamps) || (item as any).reminder_timestamps.length === 0) && (
                                        <li className="italic">Keine Zeitstempel verfügbar</li>
                                      )}
                                    </ul>
                                  </PopoverContent>
                                </Popover>
                              )}
                            </div>
                          )}
                          {item.status !== "erfolgreich" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => { setSuccessNote(""); setSuccessTarget(item); }}
                              title="Als erfolgreich markieren"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                           <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-red-50"
                            onClick={() => { setFailTarget(item); setFailReason(""); }}
                            title="Als fehlgeschlagen markieren"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-red-50"
                            onClick={() => setDeleteTarget({ id: item.id, name: `${item.applications?.first_name} ${item.applications?.last_name}` })}
                            title="Termin löschen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <p className="text-sm text-muted-foreground mt-4">{filteredItems.length} Termine</p>

          </>
        );
        })()}
      </motion.div>

      <Dialog open={!!reminderPreview} onOpenChange={(open) => { if (!open) { setReminderPreview(null); setMailboxNote(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mailbox</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Empfänger:</span>{" "}
              <span className="font-medium">{reminderPreview?.name}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Telefon:</span>{" "}
              <span className="font-medium">{reminderPreview?.phone}</span>
            </div>
            <div className="rounded-md border border-border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
              {reminderPreview?.message}
            </div>
            <Textarea
              placeholder="Notiz (optional)…"
              value={mailboxNote}
              onChange={(e) => setMailboxNote(e.target.value)}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">Die Erinnerung wird gesendet und der Status auf „Mailbox“ gesetzt.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setReminderPreview(null); setMailboxNote(""); }}>Abbrechen</Button>
            <Button className="shadow-sm hover:shadow-md transition-all" onClick={handleConfirmReminder} disabled={sendingReminder === reminderPreview?.item?.id}>
              Senden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={!!failTarget} onOpenChange={(open) => { if (!open) setFailTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grund für Fehlschlagen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Bitte geben Sie den Grund ein, warum das Gespräch von{" "}
              <span className="font-medium text-foreground">{failTarget?.applications?.first_name} {failTarget?.applications?.last_name}</span>{" "}
              fehlgeschlagen ist.
            </p>
            <Textarea
              placeholder="Grund eingeben..."
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFailTarget(null)}>Abbrechen</Button>
            <Button
              variant="destructive"
              disabled={!failReason.trim()}
              onClick={async () => {
                const item = failTarget;
                const app = item.applications;
                const reason = failReason.trim();
                await handleStatusUpdate(item, "fehlgeschlagen");
                if (app?.branding_id) {
                  const { data: userData } = await supabase.auth.getUser();
                  const authorEmail = userData.user?.email ?? "unbekannt";
                  await supabase.from("branding_notes").insert({
                    branding_id: app.branding_id,
                    page_context: "bewerbungsgespraeche",
                    content: `${app.first_name} ${app.last_name} — Fehlgeschlagen: ${reason}`,
                    author_email: authorEmail,
                  });
                  queryClient.invalidateQueries({ queryKey: ["branding-notes"] });
                  queryClient.invalidateQueries({ queryKey: ["interview-notes"] });
                }
                setFailTarget(null);
                setFailReason("");
              }}
            >
              Bestätigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!successTarget} onOpenChange={(open) => { if (!open) { setSuccessTarget(null); setSuccessNote(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gespräch erfolgreich</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Das Gespräch von{" "}
              <span className="font-medium text-foreground">{successTarget?.applications?.first_name} {successTarget?.applications?.last_name}</span>{" "}
              wird als erfolgreich markiert. Optional können Sie eine Notiz hinterlegen.
            </p>
            <Textarea
              placeholder="Notiz (optional)…"
              value={successNote}
              onChange={(e) => setSuccessNote(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setSuccessTarget(null); setSuccessNote(""); }}>Abbrechen</Button>
            <Button
              onClick={async () => {
                const item = successTarget;
                const app = item?.applications;
                const note = successNote.trim();
                await handleStatusUpdate(item, "erfolgreich");
                if (note && app?.branding_id) {
                  const { data: userData } = await supabase.auth.getUser();
                  const authorEmail = userData.user?.email ?? "unbekannt";
                  await supabase.from("branding_notes").insert({
                    branding_id: app.branding_id,
                    page_context: "bewerbungsgespraeche",
                    content: `${app.first_name} ${app.last_name} — Erfolgreich: ${note}`,
                    author_email: authorEmail,
                  });
                  queryClient.invalidateQueries({ queryKey: ["branding-notes"] });
                  queryClient.invalidateQueries({ queryKey: ["interview-notes"] });
                }
                setSuccessTarget(null);
                setSuccessNote("");
              }}
            >
              Bestätigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Termin löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Bewerbungsgespräch-Termin von {deleteTarget?.name} wird unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                const { error } = await supabase.from("interview_appointments").delete().eq("id", deleteTarget!.id);
                if (error) { toast.error("Fehler beim Löschen."); }
                else { toast.success("Termin gelöscht."); queryClient.invalidateQueries({ queryKey: ["interview-appointments"] }); }
                setDeleteTarget(null);
              }}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
