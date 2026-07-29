import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { publicSupabase as supabase } from "@/integrations/supabase/publicClient";
import { sendTelegram } from "@/lib/sendTelegram";
import { buildTelegramMessage, renderStars, formatDateLong, quoteText } from "@/lib/telegramMessage";
import { sendEmail } from "@/lib/sendEmail";
import { sendSms } from "@/lib/sendSms";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertCircle, Briefcase, Check, CheckCircle2, Pencil, Phone, User, CalendarDays, Clock, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isBefore, startOfDay, isToday } from "date-fns";
import { toast } from "sonner";
import { de } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ContactCard } from "@/components/ContactCard";

function generateTimeSlots(start: string, end: string, interval: number) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const slots: string[] = [];
  for (let m = startMin; m < endMin; m += interval) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }
  return slots;
}

export default function Bewerbungsgespraech() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [booked, setBooked] = useState(false);
  const [bookedDate, setBookedDate] = useState<string>("");
  const [bookedTime, setBookedTime] = useState<string>("");
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editedPhone, setEditedPhone] = useState("");
  const [isRebooking, setIsRebooking] = useState(false);

  const { data: application, isLoading, error } = useQuery({
    queryKey: ["application-public", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, brandings(company_name, logo_url, brand_color, favicon_url, recruiter_name, recruiter_title, recruiter_image_url), interview_appointments(id, appointment_date, appointment_time)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    const faviconUrl = (application as any)?.brandings?.favicon_url;
    const el = document.getElementById("app-favicon") as HTMLLinkElement | null;
    if (el) el.href = faviconUrl || "/favicon.png";
  }, [application]);

  const brandingId = application?.branding_id;

  const { data: scheduleSettings } = useQuery({
    queryKey: ["branding-schedule-settings-public", brandingId, "interview"],
    enabled: !!brandingId,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("branding_schedule_settings")
        .select("*")
        .eq("branding_id", brandingId!) as any)
        .eq("schedule_type", "interview")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: bookedSlots } = useQuery({
    queryKey: ["booked-slots", brandingId],
    enabled: !!brandingId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("interview_booked_slots_for_branding" as any, {
        _branding_id: brandingId!,
      });
      if (error) throw error;
      return (data || []) as Array<{ appointment_date: string; appointment_time: string }>;
    },
  });

  const { data: blockedSlotsData } = useQuery({
    queryKey: ["schedule-blocked-slots-public", brandingId],
    enabled: !!brandingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_blocked_slots")
        .select("blocked_date, blocked_time")
        .eq("branding_id", brandingId!);
      if (error) throw error;
      return data || [];
    },
  });

  const scheduleStart = scheduleSettings?.start_time?.slice(0, 5) ?? "08:00";
  const scheduleEnd = scheduleSettings?.end_time?.slice(0, 5) ?? "18:00";
  const scheduleInterval = scheduleSettings?.slot_interval_minutes ?? 20;
  const availableDays = scheduleSettings?.available_days ?? [1, 2, 3, 4, 5, 6];
  const weekendStart = scheduleSettings?.weekend_start_time?.slice(0, 5) || null;
  const weekendEnd = scheduleSettings?.weekend_end_time?.slice(0, 5) || null;

  const TIME_SLOTS = useMemo(() => {
    if (!selectedDate) return generateTimeSlots(scheduleStart, scheduleEnd, scheduleInterval);
    const dayOfWeek = selectedDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const effectiveStart = isWeekend && weekendStart ? weekendStart : scheduleStart;
    const effectiveEnd = isWeekend && weekendEnd ? weekendEnd : scheduleEnd;
    return generateTimeSlots(effectiveStart, effectiveEnd, scheduleInterval);
  }, [selectedDate, scheduleStart, scheduleEnd, scheduleInterval, weekendStart, weekendEnd]);

  const brandColor = application?.brandings?.brand_color || "#3B82F6";
  const logoUrl = application?.brandings?.logo_url;
  const companyName = application?.brandings?.company_name;
  const interviewData = application?.interview_appointments;
  const existingAppointment = Array.isArray(interviewData) ? interviewData[0] : interviewData;
  const applicantName = application ? `${application.first_name} ${application.last_name}` : "";
  const applicantPhone = application?.phone;
  const employmentType = application?.employment_type;

  const employmentLabels: Record<string, string> = {
    minijob: "Minijob",
    teilzeit: "Teilzeit",
    vollzeit: "Vollzeit",
  };

  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return TIME_SLOTS;
    const now = new Date();
    const cutoff = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    return TIME_SLOTS.filter((time) => {
      const [h, m] = time.split(":").map(Number);
      const slotDate = new Date(selectedDate);
      slotDate.setHours(h, m, 0, 0);
      return slotDate > cutoff;
    });
  }, [selectedDate, TIME_SLOTS]);

  const slotsPerTime = Math.max(1, (scheduleSettings as any)?.interview_slots_per_time ?? 1);

  const bookedTimesForDate = useMemo(() => {
    if (!selectedDate) return new Set<string>();
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const counts = new Map<string, number>();
    (bookedSlots || [])
      .filter((s: any) => s.appointment_date === dateStr)
      .forEach((s: any) => {
        const t = s.appointment_time?.slice(0, 5);
        if (t) counts.set(t, (counts.get(t) || 0) + 1);
      });
    const fullyBooked = Array.from(counts.entries())
      .filter(([, count]) => count >= slotsPerTime)
      .map(([t]) => t);
    const blocked = (blockedSlotsData || [])
      .filter((s: any) => s.blocked_date === dateStr)
      .map((s: any) => s.blocked_time?.slice(0, 5));
    return new Set([...fullyBooked, ...blocked]);
  }, [selectedDate, bookedSlots, blockedSlotsData, slotsPerTime]);

  const bookMutation = useMutation({
    mutationFn: async () => {
      const dateStr = format(selectedDate!, "yyyy-MM-dd");
      const timeStr = selectedTime! + ":00";

      // If rebooking, delete old appointment first
      if (existingAppointment?.id) {
        const { error: delError } = await supabase
          .from("interview_appointments")
          .delete()
          .eq("id", existingAppointment.id);
        if (delError) throw delError;
      }

      const { data: appData } = await supabase
        .from("applications")
        .select("created_by")
        .eq("id", id!)
        .maybeSingle();
      const { error: insertError } = await supabase
        .from("interview_appointments")
        .insert({ application_id: id!, appointment_date: dateStr, appointment_time: timeStr, created_by: appData?.created_by || null });
      if (insertError) throw insertError;
      const { error: rpcError } = await supabase.rpc("update_application_status", {
        _application_id: id!, _status: "termin_gebucht",
      });
      if (rpcError) throw rpcError;

      const formattedDate = format(selectedDate!, "dd.MM.yyyy");
      const formattedDateLong = format(selectedDate!, "dd. MMMM yyyy", { locale: de });
      await sendTelegram(
        "gespraech_gebucht",
        buildTelegramMessage({
          icon: "📅",
          title: isRebooking ? "Bewerbungsgespräch umgebucht" : "Bewerbungsgespräch gebucht",
          fields: [
            { icon: "👤", label: "Name", value: applicantName, bold: true },
            { icon: "📱", label: "Telefon", value: application?.phone },
            { icon: "✉️", label: "E-Mail", value: application?.email },
            { icon: "🗓", label: "Termin", value: formatDateLong(selectedDate!) },
            { icon: "⏰", label: "Uhrzeit", value: `${selectedTime} Uhr` },
          ],
          brandingName: companyName,
        }),
        application?.branding_id
      );


      if (application?.email) {
        await sendEmail({
          to: application.email,
          recipient_name: applicantName,
          subject: `Ihr Bewerbungsgespräch am ${formattedDateLong}`,
          body_title: "Terminbestätigung – Bewerbungsgespräch",
          body_lines: [
            `Hallo ${application.first_name},`,
            `Ihr Bewerbungsgespräch wurde erfolgreich ${isRebooking ? "umgebucht" : "gebucht"}.`,
            `Datum: ${formattedDateLong}`,
            `Uhrzeit: ${selectedTime} Uhr`,
            `Wir freuen uns auf das Gespräch mit Ihnen!`,
          ],
          event_type: "gespraech_bestaetigung",
          branding_id: application.branding_id,
        });
      }

      if (application?.phone) {
        const { data: tpl } = await supabase
          .from("sms_templates" as any)
          .select("message")
          .eq("event_type", "gespraech_bestaetigung")
          .single();
        const smsText = (tpl as any)?.message
          ? ((tpl as any).message as string).replace("{name}", application.first_name).replace("{datum}", formattedDate).replace("{uhrzeit}", selectedTime!)
          : `Hallo ${application.first_name}, Ihr Bewerbungsgespräch ist bestätigt: ${formattedDate} um ${selectedTime} Uhr. Wir freuen uns auf Sie!`;
        let smsSender: string | undefined;
        if (application.branding_id) {
          const { data: branding } = await supabase
            .from("brandings")
            .select("sms_sender_name")
            .eq("id", application.branding_id)
            .single();
          smsSender = (branding as any)?.sms_sender_name || undefined;
        }
        await sendSms({
          to: application.phone,
          text: smsText,
          event_type: "gespraech_bestaetigung",
          recipient_name: applicantName,
          from: smsSender,
          branding_id: application.branding_id,
        });
      }
    },
    onSuccess: () => {
      setBookedDate(format(selectedDate!, "dd. MMMM yyyy", { locale: de }));
      setBookedTime(selectedTime!);
      setBooked(true);
      setConfirmOpen(false);
      setIsRebooking(false);
      queryClient.invalidateQueries({ queryKey: ["application-public", id] });
      queryClient.invalidateQueries({ queryKey: ["booked-slots"] });
    },
    onError: (error: any) => {
      console.error("Booking failed:", error);
      toast.error(error?.message || "Termin konnte nicht gespeichert werden");
      setConfirmOpen(false);
    },
  });

  // --- Error state ---
  if (!isLoading && (error || !application)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-0 shadow-xl overflow-hidden">
            <div className="h-1.5" style={{ background: `linear-gradient(135deg, #EF4444, #F97316)` }} />
            <div className="p-8 text-center">
              <div className="h-14 w-14 rounded-2xl bg-red-50 mx-auto flex items-center justify-center mb-4">
                <AlertCircle className="h-7 w-7 text-red-500" />
              </div>
              <h2 className="text-lg font-semibold mb-2">Ungültiger Link</h2>
              <p className="text-sm text-muted-foreground">
                Dieser Bewerbungslink ist ungültig oder nicht mehr aktiv.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- Loading ---
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 p-4 md:p-8">
        <div className="max-w-2xl w-full mt-8 md:mt-16 space-y-6">
          <Skeleton className="h-12 w-32 mx-auto rounded-xl" />
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden">
            <Skeleton className="h-1.5 w-full" />
            <div className="p-6 space-y-4">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-72" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-28 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-full" />
              </div>
            </div>
            <div className="p-6 grid md:grid-cols-2 gap-6">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Existing appointment card (with rebooking option) ---
  if ((existingAppointment && !isRebooking) || booked) {
    const appDate = booked
      ? bookedDate
      : format(new Date(existingAppointment.appointment_date), "dd. MMMM yyyy", { locale: de });
    const appTime = booked
      ? bookedTime
      : existingAppointment.appointment_time?.slice(0, 5);

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-lg w-full"
        >
          {logoUrl && (
            <motion.img
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              src={logoUrl}
              alt={companyName || "Logo"}
              className="h-12 mx-auto object-contain mb-8 drop-shadow-sm"
            />
          )}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-0 shadow-xl overflow-hidden">
            <div className="h-1.5" style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}99)` }} />
            <div className="p-8 space-y-6">
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
                  className="h-16 w-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: `${brandColor}15` }}
                >
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: "spring" }}>
                    <CheckCircle2 className="h-9 w-9" style={{ color: brandColor }} />
                  </motion.div>
                </motion.div>
                <div>
                  <h2 className="text-xl font-semibold">Termin bestätigt</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {applicantName}, Ihr Bewerbungsgespräch wurde erfolgreich gebucht.
                  </p>
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="rounded-xl bg-slate-50/80 p-4 space-y-2 border-l-4"
                style={{ borderLeftColor: brandColor }}
              >
                <div className="flex items-center gap-2.5">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium text-sm">{appDate}</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium text-sm">{appTime} Uhr</p>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex items-start gap-3 bg-slate-50/80 rounded-xl p-4"
              >
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${brandColor}15` }}
                >
                  <Phone className="h-4 w-4" style={{ color: brandColor }} />
                </div>
                <p className="text-sm text-muted-foreground pt-1">
                  Bitte seien Sie unter <span className="font-semibold text-foreground">{applicantPhone}</span> telefonisch erreichbar. Wir rufen Sie unter dieser Nummer an.
                </p>
              </motion.div>
              {!booked && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl gap-2"
                    onClick={() => {
                      setIsRebooking(true);
                      setSelectedDate(undefined);
                      setSelectedTime(null);
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Termin umbuchen
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
          {companyName && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <div className="h-px w-8 bg-slate-200" />
              <p className="text-xs text-muted-foreground/60">Powered by {companyName}</p>
              <div className="h-px w-8 bg-slate-200" />
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // --- Booking page (also used for rebooking) ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 p-4 md:p-8 flex items-start justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full mt-8 md:mt-16"
      >
        {logoUrl && (
          <motion.img
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            src={logoUrl}
            alt={companyName || "Logo"}
            className="h-12 mx-auto object-contain mb-8 drop-shadow-sm"
          />
        )}

        {application?.brandings?.recruiter_name && (
          <ContactCard
            name={(application.brandings as any).recruiter_name}
            title={(application.brandings as any).recruiter_title}
            imageUrl={(application.brandings as any).recruiter_image_url}
            brandColor={brandColor}
            label="Ihr Ansprechpartner"
          />
        )}

        {/* Show existing appointment card when rebooking */}
        {isRebooking && existingAppointment && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-0 shadow-xl overflow-hidden mb-6">
            <div className="h-1.5" style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}99)` }} />
            <div className="p-6">
              <p className="text-sm font-medium mb-3">Aktueller Termin:</p>
              <div className="rounded-xl bg-slate-50/80 p-4 space-y-2 border-l-4" style={{ borderLeftColor: brandColor }}>
                <div className="flex items-center gap-2.5">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium text-sm">{format(new Date(existingAppointment.appointment_date), "dd. MMMM yyyy", { locale: de })}</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium text-sm">{existingAppointment.appointment_time?.slice(0, 5)} Uhr</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 text-muted-foreground"
                onClick={() => setIsRebooking(false)}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-0 shadow-xl overflow-hidden">
          <div className="h-1.5" style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}99)` }} />

          <div className="p-6 pb-0 space-y-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {isRebooking ? "Termin umbuchen" : "Termin buchen"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isRebooking
                  ? "Wählen Sie einen neuen Termin für Ihr Bewerbungsgespräch."
                  : `Wählen Sie einen passenden Termin für Ihr Bewerbungsgespräch${companyName ? ` bei ${companyName}` : ""}.`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border font-medium text-foreground"
                style={{ backgroundColor: `${brandColor}08`, borderColor: `${brandColor}25` }}
              >
                <User className="h-3.5 w-3.5" style={{ color: brandColor }} />
                {applicantName}
              </span>
              {applicantPhone && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border"
                  style={{ backgroundColor: `${brandColor}08`, borderColor: `${brandColor}25` }}
                >
                  <Phone className="h-3.5 w-3.5" style={{ color: brandColor }} />
                  {isEditingPhone ? (
                    <>
                      <Input
                        type="tel"
                        value={editedPhone}
                        onChange={(e) => setEditedPhone(e.target.value)}
                        className="h-7 w-40 text-sm"
                        autoFocus
                      />
                      <button
                        onClick={async () => {
                          if (!editedPhone.trim()) return;
                          await supabase.rpc("update_application_phone", {
                            _application_id: id!,
                            _phone: editedPhone.trim(),
                          });
                          queryClient.invalidateQueries({ queryKey: ["application-public", id] });
                          setIsEditingPhone(false);
                        }}
                        className="hover:text-foreground transition-colors"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground">{applicantPhone}</span>
                      <button
                        onClick={() => {
                          setEditedPhone(applicantPhone || "");
                          setIsEditingPhone(true);
                        }}
                        className="hover:text-foreground transition-colors text-muted-foreground"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </span>
              )}
              {employmentType && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border text-muted-foreground"
                  style={{ backgroundColor: `${brandColor}08`, borderColor: `${brandColor}25` }}
                >
                  <Briefcase className="h-3.5 w-3.5" style={{ color: brandColor }} />
                  {employmentLabels[employmentType] || employmentType}
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200/60 mx-6 mt-5" />

          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200/60">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="h-4 w-4" style={{ color: brandColor }} />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Datum</p>
              </div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => {
                  setSelectedDate(d);
                  setSelectedTime(null);
                }}
                disabled={(date) => {
                  const dow = date.getDay();
                  const isoDay = dow === 0 ? 7 : dow;
                  return !availableDays.includes(isoDay) || isBefore(date, startOfDay(new Date()));
                }}
                locale={de}
                className="pointer-events-auto"
                classNames={{ day_selected: "!text-white" }}
                modifiersStyles={{ selected: { backgroundColor: brandColor, color: "white" } }}
              />
            </div>

            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4" style={{ color: brandColor }} />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Uhrzeit</p>
              </div>
              {!selectedDate ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${brandColor}10` }}>
                    <CalendarDays className="h-5 w-5" style={{ color: `${brandColor}80` }} />
                  </div>
                  <p className="text-sm text-muted-foreground">Bitte wählen Sie zuerst ein Datum.</p>
                </div>
              ) : (
                <div
                  className="brand-scrollbar grid grid-cols-2 gap-1.5 max-h-[340px] overflow-y-auto pr-1"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: `${brandColor}66 transparent` }}
                >
                  <style>{`
                    .brand-scrollbar::-webkit-scrollbar { width: 5px; }
                    .brand-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .brand-scrollbar::-webkit-scrollbar-thumb { background-color: ${brandColor}66; border-radius: 10px; }
                    .brand-scrollbar::-webkit-scrollbar-thumb:hover { background-color: ${brandColor}99; }
                  `}</style>
                  {availableTimeSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground col-span-2 py-8 text-center">Keine verfügbaren Zeiten.</p>
                  ) : availableTimeSlots.map((time, idx) => {
                    const isBooked = bookedTimesForDate.has(time);
                    const isSelected = selectedTime === time;
                    return (
                      <motion.button
                        key={time}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02, duration: 0.2 }}
                        disabled={isBooked}
                        onClick={() => setSelectedTime(time)}
                        className={cn(
                          "py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 border",
                          isBooked
                            ? "bg-slate-50 text-slate-300 cursor-not-allowed border-transparent"
                            : isSelected
                            ? "text-white border-transparent shadow-md scale-[1.03]"
                            : "bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-sm hover:scale-[1.02] text-foreground"
                        )}
                        style={isSelected && !isBooked ? { backgroundColor: brandColor, boxShadow: `0 4px 14px -3px ${brandColor}50` } : undefined}
                      >
                        {time}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <AnimatePresence>
            {selectedDate && selectedTime && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
                className="p-6 pt-0"
              >
                <div className="border-t border-slate-200/60 pt-5">
                  <Button
                    className="w-full text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all duration-200 h-12 text-sm font-semibold"
                    style={{
                      background: `linear-gradient(135deg, ${brandColor}, ${brandColor}DD)`,
                      boxShadow: `0 8px 24px -6px ${brandColor}40`,
                    }}
                    onClick={() => setConfirmOpen(true)}
                  >
                    {isRebooking ? "Termin umbuchen" : "Termin buchen"}: {format(selectedDate, "dd.MM.yyyy")} um {selectedTime} Uhr
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {companyName && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <div className="h-px w-8 bg-slate-200" />
            <p className="text-xs text-muted-foreground/60">Powered by {companyName}</p>
            <div className="h-px w-8 bg-slate-200" />
          </div>
        )}
      </motion.div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle>{isRebooking ? "Termin umbuchen" : "Termin bestätigen"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {isRebooking
                ? "Möchten Sie Ihren Termin auf folgenden Zeitpunkt umbuchen?"
                : "Möchten Sie folgenden Termin verbindlich buchen?"}
            </p>
            <div className="rounded-xl bg-slate-50/80 p-4 space-y-2 border-l-4" style={{ borderLeftColor: brandColor }}>
              <div className="flex items-center gap-2.5">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium text-sm">{selectedDate && format(selectedDate, "EEEE, dd. MMMM yyyy", { locale: de })}</p>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium text-sm">{selectedTime} Uhr</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} className="rounded-xl">Abbrechen</Button>
            <Button
              onClick={() => bookMutation.mutate()}
              disabled={bookMutation.isPending}
              className="text-white rounded-xl"
              style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}DD)` }}
            >
              {bookMutation.isPending ? "Wird gebucht..." : "Bestätigen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
