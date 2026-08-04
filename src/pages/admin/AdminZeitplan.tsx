import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Trash2, Ban, Check, CalendarOff, ClipboardList, Coffee } from "lucide-react";
import { Switch } from "@/components/ui/switch";


import TrialDayBlocker from "@/components/admin/TrialDayBlocker";
import FirstWorkdayBlocker from "@/components/admin/FirstWorkdayBlocker";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";

const WEEKDAYS = [
  { value: 1, label: "Mo" },
  { value: 2, label: "Di" },
  { value: 3, label: "Mi" },
  { value: 4, label: "Do" },
  { value: 5, label: "Fr" },
  { value: 6, label: "Sa" },
  { value: 7, label: "So" },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = (i % 2) * 30;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

function generateTimeSlots(start: string, end: string, interval: number) {
  const slots: string[] = [];
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  for (let m = startMin; m < endMin; m += interval) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }
  return slots;
}

const DEFAULT_START = "08:00";
const DEFAULT_END = "18:00";
const DEFAULT_INTERVAL = 20;
const DEFAULT_DAYS = [1, 2, 3, 4, 5, 6];

export default function AdminZeitplan() {
  const queryClient = useQueryClient();
  const { activeBrandingId, ready } = useBrandingFilter();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [blockReason, setBlockReason] = useState("");
  const [activeSlot, setActiveSlot] = useState(1);

  // Load branding-specific settings for interview (all slots)
  const { data: interviewSettings } = useQuery({
    queryKey: ["branding-schedule-settings", activeBrandingId, "interview"],
    enabled: ready && !!activeBrandingId,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("branding_schedule_settings")
        .select("*")
        .eq("branding_id", activeBrandingId!) as any)
        .eq("schedule_type", "interview")
        .order("slot_index", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const primarySetting = useMemo(
    () => (interviewSettings || []).find((s: any) => s.slot_index === 1) ?? (interviewSettings || [])[0] ?? null,
    [interviewSettings]
  );
  const slotCount = Math.max(1, primarySetting?.interview_slots_per_time ?? 1);
  const slotSetting = useMemo(
    () => (interviewSettings || []).find((s: any) => s.slot_index === activeSlot) ?? null,
    [interviewSettings, activeSlot]
  );
  const effectiveSlot = Math.min(activeSlot, slotCount);

  // Load blocked slots for active branding + auto-delete past ones
  const { data: blockedSlots } = useQuery({
    queryKey: ["schedule-blocked-slots", activeBrandingId],
    enabled: ready && !!activeBrandingId,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("schedule_blocked_slots")
        .select("*") as any)
        .eq("branding_id", activeBrandingId!)
        .order("blocked_date", { ascending: true });
      if (error) throw error;
      const today = format(new Date(), "yyyy-MM-dd");
      const rows = (data || []) as any[];
      const past = rows.filter((s) => s.blocked_date < today);
      const current = rows.filter((s) => s.blocked_date >= today);
      if (past.length > 0) {
        supabase.from("schedule_blocked_slots").delete().in("id", past.map((s) => s.id)).then(() => {});
      }
      return current;
    },
  });

  // Save branding-specific settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (params: { start_time: string; end_time: string; slot_interval_minutes: number; available_days: number[]; schedule_type: string; weekend_start_time?: string | null; weekend_end_time?: string | null; interview_slots_per_time?: number; min_lead_time_hours?: number; slot_index?: number; lunch_break_enabled?: boolean; lunch_break_start?: string | null; lunch_break_end?: string | null }) => {
      const upsertData: any = {
        branding_id: activeBrandingId!,
        start_time: params.start_time + ":00",
        end_time: params.end_time + ":00",
        slot_interval_minutes: params.slot_interval_minutes,
        available_days: params.available_days,
        schedule_type: params.schedule_type,
        slot_index: params.slot_index ?? 1,
      };
      if (params.weekend_start_time !== undefined) {
        upsertData.weekend_start_time = params.weekend_start_time ? params.weekend_start_time + ":00" : null;
      }
      if (params.weekend_end_time !== undefined) {
        upsertData.weekend_end_time = params.weekend_end_time ? params.weekend_end_time + ":00" : null;
      }
      if (params.interview_slots_per_time !== undefined) {
        upsertData.interview_slots_per_time = params.interview_slots_per_time;
      }
      if (params.min_lead_time_hours !== undefined) {
        upsertData.min_lead_time_hours = params.min_lead_time_hours;
      }
      if (params.lunch_break_enabled !== undefined) {
        upsertData.lunch_break_enabled = params.lunch_break_enabled;
        upsertData.lunch_break_start = params.lunch_break_start ? params.lunch_break_start + ":00" : null;
        upsertData.lunch_break_end = params.lunch_break_end ? params.lunch_break_end + ":00" : null;
      }

      const { error } = await supabase
        .from("branding_schedule_settings")
        .upsert(upsertData, { onConflict: "branding_id,schedule_type,slot_index" as any });
      if (error) throw error;

      if (params.schedule_type === "interview") {
        const isPrimary = (params.slot_index ?? 1) === 1;
        // Interval is global; slots-per-time & lead time only propagate from slot 1
        const sync: any = { slot_interval_minutes: params.slot_interval_minutes };
        if (isPrimary && params.interview_slots_per_time !== undefined) sync.interview_slots_per_time = params.interview_slots_per_time;
        if (isPrimary && params.min_lead_time_hours !== undefined) sync.min_lead_time_hours = params.min_lead_time_hours;
        await (supabase
          .from("branding_schedule_settings")
          .update(sync) as any)
          .eq("branding_id", activeBrandingId!)
          .eq("schedule_type", "interview");

        // Ensure a config row exists for every slot (2..N), cloned from slot 1
        if (isPrimary && params.interview_slots_per_time && params.interview_slots_per_time > 1) {
          const existingIdx = new Set((interviewSettings || []).map((s: any) => s.slot_index));
          const missing: any[] = [];
          for (let i = 2; i <= params.interview_slots_per_time; i++) {
            if (existingIdx.has(i)) continue;
            missing.push({
              ...upsertData,
              slot_index: i,
              interview_slots_per_time: params.interview_slots_per_time,
              min_lead_time_hours: params.min_lead_time_hours ?? 12,
            });
          }
          if (missing.length) {
            const { error: mErr } = await supabase
              .from("branding_schedule_settings")
              .upsert(missing, { onConflict: "branding_id,schedule_type,slot_index" as any });
            if (mErr) throw mErr;
          }
        }
      }
    },
    onSuccess: () => {
      toast({ title: "Einstellungen gespeichert" });
      queryClient.invalidateQueries({ queryKey: ["branding-schedule-settings"] });
    },
    onError: () => toast({ title: "Fehler beim Speichern", variant: "destructive" }),
  });

  // Block slot mutation
  const blockMutation = useMutation({
    mutationFn: async (time: string) => {
      if (!selectedDate) return;
      const { error } = await supabase
        .from("schedule_blocked_slots")
        .insert({
          blocked_date: format(selectedDate, "yyyy-MM-dd"),
          blocked_time: time + ":00",
          reason: blockReason || null,
          branding_id: activeBrandingId,
          slot_index: effectiveSlot,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-blocked-slots"] });
      setBlockReason("");
    },
    onError: () => toast({ title: "Fehler beim Blockieren", variant: "destructive" }),
  });

  // Unblock slot mutation
  const unblockMutation = useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase.from("schedule_blocked_slots").delete().eq("id", slotId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedule-blocked-slots"] }),
    onError: () => toast({ title: "Fehler beim Freigeben", variant: "destructive" }),
  });

  const blockViewStart = (slotSetting ?? primarySetting)?.start_time?.slice(0, 5) ?? DEFAULT_START;
  const blockViewEnd = (slotSetting ?? primarySetting)?.end_time?.slice(0, 5) ?? DEFAULT_END;
  const blockViewInterval = primarySetting?.slot_interval_minutes ?? DEFAULT_INTERVAL;

  const timeSlots = useMemo(
    () => generateTimeSlots(blockViewStart, blockViewEnd, blockViewInterval),
    [blockViewStart, blockViewEnd, blockViewInterval]
  );

  // Lunch break of the currently selected slot
  const currentSlotRow = slotSetting ?? (effectiveSlot === 1 ? primarySetting : null);
  const lunchEnabled = !!currentSlotRow?.lunch_break_enabled;
  const lunchStart = currentSlotRow?.lunch_break_start?.slice(0, 5) || "12:00";
  const lunchEnd = currentSlotRow?.lunch_break_end?.slice(0, 5) || "13:00";

  const lunchTimes = useMemo(() => {
    if (!lunchEnabled) return new Set<string>();
    return new Set(timeSlots.filter((t) => t >= lunchStart && t < lunchEnd));
  }, [lunchEnabled, lunchStart, lunchEnd, timeSlots]);

  const saveLunch = (enabled: boolean, start: string, end: string) => {
    if (enabled && start >= end) {
      toast({ title: "Startzeit muss vor Endzeit liegen", variant: "destructive" });
      return;
    }
    const base = currentSlotRow ?? primarySetting;
    saveSettingsMutation.mutate({
      schedule_type: "interview",
      slot_index: effectiveSlot,
      start_time: base?.start_time?.slice(0, 5) ?? DEFAULT_START,
      end_time: base?.end_time?.slice(0, 5) ?? DEFAULT_END,
      slot_interval_minutes: primarySetting?.slot_interval_minutes ?? DEFAULT_INTERVAL,
      available_days: base?.available_days ?? DEFAULT_DAYS,
      weekend_start_time: base?.weekend_start_time?.slice(0, 5) ?? null,
      weekend_end_time: base?.weekend_end_time?.slice(0, 5) ?? null,
      lunch_break_enabled: enabled,
      lunch_break_start: enabled ? start : null,
      lunch_break_end: enabled ? end : null,
    });
  };


  // Blocked slots relevant for the currently selected slot (own + global/legacy)
  const slotBlockedSlots = useMemo(
    () => (blockedSlots || []).filter((s: any) => s.slot_index == null || s.slot_index === effectiveSlot),
    [blockedSlots, effectiveSlot]
  );

  const blockedForDate = useMemo(() => {
    if (!selectedDate) return new Map<string, string>();
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const map = new Map<string, string>();
    slotBlockedSlots.filter((s: any) => s.blocked_date === dateStr).forEach((s: any) => map.set(s.blocked_time?.slice(0, 5), s.id));
    return map;
  }, [selectedDate, slotBlockedSlots]);

  const blockedByDate = useMemo(() => {
    const groups = new Map<string, any[]>();
    slotBlockedSlots.forEach((s: any) => {
      const arr = groups.get(s.blocked_date) || [];
      arr.push(s);
      groups.set(s.blocked_date, arr);
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, slots]) => ({ date, slots }));
  }, [slotBlockedSlots]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Zeitplan</h2>
        <p className="text-muted-foreground text-sm">
          Verfügbare Zeiten und Blockierungen konfigurieren
        </p>
      </div>

      <Tabs defaultValue="interviews">
        <TabsList>
          <TabsTrigger value="interviews" className="gap-1.5">
            <CalendarOff className="h-4 w-4" />
            Bewerbungsgespräche
          </TabsTrigger>
          <TabsTrigger value="trials" className="gap-1.5">
            <ClipboardList className="h-4 w-4" />
            Probetag & 1. Arbeitstag
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Bewerbungsgespräche */}
        <TabsContent value="interviews" className="space-y-6">
          {slotCount > 1 && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: slotCount }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setActiveSlot(n)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium border transition-all",
                      effectiveSlot === n
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:bg-muted text-foreground"
                    )}
                  >
                    Slot {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                „Slots pro Uhrzeit" und „Vorlaufzeit" gelten brandingweit und werden unter Slot 1 eingestellt.
              </p>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Zeiteinstellungen{slotCount > 1 ? ` – Slot ${effectiveSlot}` : ""}</CardTitle>
              <CardDescription>
                Zeitspanne und verfügbare Wochentage für diesen Slot. Intervall, „Slots pro Uhrzeit" und Vorlaufzeit gelten für alle Slots.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BrandingScheduleForm
                key={`interview-${effectiveSlot}-${slotSetting?.id || "new"}`}
                existing={slotSetting ?? (effectiveSlot === 1 ? primarySetting ?? undefined : { ...(primarySetting || {}), id: undefined } as any) ?? undefined}
                onSave={(params) => saveSettingsMutation.mutate({ ...params, schedule_type: "interview", slot_index: effectiveSlot })}
                isSaving={saveSettingsMutation.isPending}
                showSlotsPerTime={effectiveSlot === 1}
                slotsPerTimeValue={slotCount}
                leadTimeValue={primarySetting?.min_lead_time_hours ?? 12}
              />
            </CardContent>
          </Card>


          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Zeiten blockieren{slotCount > 1 ? ` – Slot ${effectiveSlot}` : ""}</CardTitle>
              <CardDescription>Wählen Sie ein Datum und blockieren Sie einzelne Zeitfenster für diesen Slot.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <LunchBreakForm
                key={`lunch-${effectiveSlot}-${currentSlotRow?.id || "new"}-${lunchEnabled}-${lunchStart}-${lunchEnd}`}
                enabled={lunchEnabled}
                start={lunchStart}
                end={lunchEnd}
                onSave={saveLunch}
                isSaving={saveSettingsMutation.isPending}
              />

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} locale={de} className="pointer-events-auto" />
                  <div className="mt-4 space-y-2">
                    <Label>Grund (optional)</Label>
                    <Input placeholder="z.B. Arzttermin" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} />
                  </div>
                </div>
                <div>
                  {!selectedDate ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Wählen Sie ein Datum aus dem Kalender.</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium mb-3">{format(selectedDate, "EEEE, dd. MMMM yyyy", { locale: de })}</p>
                      <div className="grid grid-cols-3 gap-1.5 max-h-[340px] overflow-y-auto">
                        {timeSlots.map((time) => {
                          const isLunch = lunchTimes.has(time);
                          const isBlocked = blockedForDate.has(time);
                          return (
                            <button
                              key={time}
                              disabled={isLunch}
                              title={isLunch ? "Mittagspause" : undefined}
                              onClick={() => isBlocked ? unblockMutation.mutate(blockedForDate.get(time)!) : blockMutation.mutate(time)}
                              className={cn(
                                "py-2 px-2 rounded-lg text-sm font-medium transition-all border flex items-center justify-center gap-1",
                                isLunch
                                  ? "bg-muted text-muted-foreground border-border cursor-not-allowed opacity-70"
                                  : isBlocked
                                    ? "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                                    : "bg-card border-border hover:bg-muted text-foreground"
                              )}
                            >
                              {isLunch ? <Coffee className="h-3 w-3" /> : isBlocked ? <Ban className="h-3 w-3" /> : <Check className="h-3 w-3 text-muted-foreground" />}
                              {time}
                            </button>
                          );
                        })}

                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {blockedByDate.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Blockierte Zeitfenster{slotCount > 1 ? ` – Slot ${effectiveSlot}` : ""}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {blockedByDate.map(({ date, slots }) => (
                  <div key={date}>
                    <p className="text-sm font-medium mb-2">{format(new Date(date), "EEEE, dd. MMMM yyyy", { locale: de })}</p>
                    <div className="flex flex-wrap gap-2">
                      {slots.map((s: any) => (
                        <Badge key={s.id} variant="secondary" className="gap-1.5 pr-1">
                          {s.blocked_time?.slice(0, 5)} Uhr
                          {s.slot_index == null && <span className="text-muted-foreground">(alle Slots)</span>}
                          {s.reason && <span className="text-muted-foreground">({s.reason})</span>}
                          <button onClick={() => unblockMutation.mutate(s.id)} className="ml-1 hover:text-destructive transition-colors">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Probetag & 1. Arbeitstag (shared schedule) */}
        <TabsContent value="trials" className="space-y-6">
          {activeBrandingId && (
            <TrialDayBlocker
              brandingId={activeBrandingId}
              onSaveSettings={(params) => saveSettingsMutation.mutate({ ...params, schedule_type: "trial" })}
              isSavingSettings={saveSettingsMutation.isPending}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}


// Sub-component for schedule settings
function BrandingScheduleForm({
  existing,
  onSave,
  isSaving,
  showSlotsPerTime = false,
  slotsPerTimeValue,
  leadTimeValue,
}: {
  existing?: { start_time: string; end_time: string; slot_interval_minutes: number; available_days: number[]; weekend_start_time?: string | null; weekend_end_time?: string | null; interview_slots_per_time?: number; min_lead_time_hours?: number };
  onSave: (params: { start_time: string; end_time: string; slot_interval_minutes: number; available_days: number[]; weekend_start_time?: string | null; weekend_end_time?: string | null; interview_slots_per_time?: number; min_lead_time_hours?: number }) => void;
  isSaving: boolean;
  showSlotsPerTime?: boolean;
  slotsPerTimeValue?: number;
  leadTimeValue?: number;
}) {
  const [st, setSt] = useState(existing?.start_time?.slice(0, 5) || DEFAULT_START);
  const [et, setEt] = useState(existing?.end_time?.slice(0, 5) || DEFAULT_END);
  const [iv, setIv] = useState(existing?.slot_interval_minutes || DEFAULT_INTERVAL);
  const [ds, setDs] = useState<number[]>(existing?.available_days || DEFAULT_DAYS);
  const [wst, setWst] = useState(existing?.weekend_start_time?.slice(0, 5) || "");
  const [wet, setWet] = useState(existing?.weekend_end_time?.slice(0, 5) || "");
  const [slotsPerTime, setSlotsPerTime] = useState<number>(existing?.interview_slots_per_time ?? 1);
  const [leadTime, setLeadTime] = useState<number>(existing?.min_lead_time_hours ?? 12);

  const hasWeekend = ds.includes(6) || ds.includes(7);

  const toggleDay = (day: number) => {
    setDs((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort());
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Startzeit</Label>
          <Select value={st} onValueChange={setSt}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t} Uhr</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Endzeit</Label>
          <Select value={et} onValueChange={setEt}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t} Uhr</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Intervall</Label>
          <Select value={String(iv)} onValueChange={(v) => setIv(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 Min</SelectItem>
              <SelectItem value="20">20 Min</SelectItem>
              <SelectItem value="30">30 Min</SelectItem>
              <SelectItem value="60">60 Min</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Verfügbare Wochentage</Label>
        <div className="flex flex-wrap gap-3">
          {WEEKDAYS.map((wd) => (
            <label key={wd.value} className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={ds.includes(wd.value)} onCheckedChange={() => toggleDay(wd.value)} />
              <span className="text-sm">{wd.label}</span>
            </label>
          ))}
        </div>
      </div>
      {hasWeekend && (
        <div className="space-y-2 rounded-lg border border-border p-4">
          <Label className="text-sm font-medium">Wochenendzeiten (Sa & So)</Label>
          <p className="text-xs text-muted-foreground">Abweichende Zeiten für Samstag und Sonntag. Leer lassen = gleiche Zeiten wie unter der Woche.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div className="space-y-2">
              <Label className="text-xs">Startzeit Wochenende</Label>
              <Select value={wst} onValueChange={setWst}>
                <SelectTrigger><SelectValue placeholder="Wie Wochentage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="reset">Wie Wochentage</SelectItem>
                  {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t} Uhr</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Endzeit Wochenende</Label>
              <Select value={wet} onValueChange={setWet}>
                <SelectTrigger><SelectValue placeholder="Wie Wochentage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="reset">Wie Wochentage</SelectItem>
                  {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t} Uhr</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
      {showSlotsPerTime && (
        <div className="space-y-2 rounded-lg border border-border p-4">
          <Label className="text-sm font-medium">Slots pro Uhrzeit</Label>
          <p className="text-xs text-muted-foreground">
            Wie viele Bewerber dürfen denselben Zeitslot buchen? Standard: 1. Bei z.B. 3 ist jeder Termin (z.B. 10:30 Uhr) 3x buchbar.
          </p>
          <Input
            type="number"
            min={1}
            max={10}
            value={slotsPerTime}
            onChange={(e) => setSlotsPerTime(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
            className="w-32 mt-2"
          />
        </div>
      )}
      {showSlotsPerTime && (
        <div className="space-y-2 rounded-lg border border-border p-4">
          <Label className="text-sm font-medium">Vorlaufzeit (Stunden)</Label>
          <p className="text-xs text-muted-foreground">
            Wie weit im Voraus muss ein Termin mindestens gebucht werden? Standard: 12 Stunden. Bei 0 sind alle künftigen Zeiten sofort buchbar. Gilt für alle Slots dieses Brandings.
          </p>
          <Input
            type="number"
            min={0}
            max={168}
            value={leadTime}
            onChange={(e) => setLeadTime(Math.max(0, Math.min(168, Number(e.target.value) || 0)))}
            className="w-32 mt-2"
          />
        </div>
      )}
      <Button onClick={() => onSave({
        start_time: st, end_time: et, slot_interval_minutes: iv, available_days: ds,
        weekend_start_time: wst && wst !== "reset" ? wst : null,
        weekend_end_time: wet && wet !== "reset" ? wet : null,
        ...(showSlotsPerTime ? { interview_slots_per_time: slotsPerTime, min_lead_time_hours: leadTime } : {}),
      })} disabled={isSaving}>

        {isSaving ? "Speichern..." : "Einstellungen speichern"}
      </Button>
    </div>
  );
}

// Lunch break settings for the active slot
function LunchBreakForm({
  enabled,
  start,
  end,
  onSave,
  isSaving,
}: {
  enabled: boolean;
  start: string;
  end: string;
  onSave: (enabled: boolean, start: string, end: string) => void;
  isSaving: boolean;
}) {
  const [on, setOn] = useState(enabled);
  const [from, setFrom] = useState(start);
  const [to, setTo] = useState(end);

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label className="text-sm font-medium">Mittagspause aktivieren</Label>
          <p className="text-xs text-muted-foreground">
            Alle Zeitfenster im Pausenzeitraum werden für diesen Slot dauerhaft blockiert.
          </p>
        </div>
        <Switch checked={on} onCheckedChange={setOn} />
      </div>
      {on && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Von</Label>
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t} Uhr</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Bis</Label>
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t} Uhr</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      <Button variant="outline" size="sm" onClick={() => onSave(on, from, to)} disabled={isSaving}>
        {isSaving ? "Speichern..." : "Mittagspause speichern"}
      </Button>
    </div>
  );
}

