import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Trash2, Ban, Check } from "lucide-react";

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

const DEFAULT_START = "08:00";
const DEFAULT_END = "18:00";
const DEFAULT_INTERVAL = 30;
const DEFAULT_DAYS = [1, 2, 3, 4, 5, 6];

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

interface TrialDayBlockerProps {
  brandingId: string;
  onSaveSettings: (params: { start_time: string; end_time: string; slot_interval_minutes: number; available_days: number[]; weekend_start_time?: string | null; weekend_end_time?: string | null; min_lead_time_hours?: number }) => void;
  isSavingSettings: boolean;
}

export default function TrialDayBlocker({ brandingId, onSaveSettings, isSavingSettings }: TrialDayBlockerProps) {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [blockReason, setBlockReason] = useState("");

  // Load trial-specific settings
  const { data: trialSetting } = useQuery({
    queryKey: ["branding-schedule-settings", brandingId, "trial"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("branding_schedule_settings")
        .select("*")
        .eq("branding_id", brandingId) as any)
        .eq("schedule_type", "trial")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: blockedSlots } = useQuery({
    queryKey: ["trial-day-blocked-slots", brandingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trial_day_blocked_slots" as any)
        .select("*")
        .eq("branding_id", brandingId)
        .order("blocked_date", { ascending: true });
      if (error) throw error;
      const allSlots = (data || []) as unknown as Array<{
        id: string; blocked_date: string; blocked_time: string; reason: string | null; branding_id: string | null;
      }>;
      const today = format(new Date(), "yyyy-MM-dd");
      const past = allSlots.filter((s) => s.blocked_date < today);
      const current = allSlots.filter((s) => s.blocked_date >= today);
      if (past.length > 0) {
        supabase.from("trial_day_blocked_slots" as any).delete().in("id", past.map((s) => s.id)).then(() => {});
      }
      return current;
    },
  });

  const blockMutation = useMutation({
    mutationFn: async (time: string) => {
      if (!selectedDate) return;
      const { error } = await supabase
        .from("trial_day_blocked_slots" as any)
        .insert({
          blocked_date: format(selectedDate, "yyyy-MM-dd"),
          blocked_time: time + ":00",
          reason: blockReason || null,
          branding_id: brandingId,
        });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["trial-day-blocked-slots"] }); setBlockReason(""); },
    onError: () => toast({ title: "Fehler beim Blockieren", variant: "destructive" }),
  });

  const unblockMutation = useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase.from("trial_day_blocked_slots" as any).delete().eq("id", slotId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trial-day-blocked-slots"] }),
    onError: () => toast({ title: "Fehler beim Freigeben", variant: "destructive" }),
  });

  const settingStart = trialSetting?.start_time?.slice(0, 5) ?? DEFAULT_START;
  const settingEnd = trialSetting?.end_time?.slice(0, 5) ?? DEFAULT_END;
  const settingInterval = trialSetting?.slot_interval_minutes ?? DEFAULT_INTERVAL;

  const timeSlots = useMemo(
    () => generateTimeSlots(settingStart, settingEnd, settingInterval),
    [settingStart, settingEnd, settingInterval]
  );

  const blockedForDate = useMemo(() => {
    if (!selectedDate || !blockedSlots) return new Map<string, string>();
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const map = new Map<string, string>();
    blockedSlots.filter((s) => s.blocked_date === dateStr).forEach((s) => map.set(s.blocked_time?.slice(0, 5), s.id));
    return map;
  }, [selectedDate, blockedSlots]);

  const blockedByDate = useMemo(() => {
    if (!blockedSlots) return [];
    const groups = new Map<string, typeof blockedSlots>();
    blockedSlots.forEach((s) => { const arr = groups.get(s.blocked_date) || []; arr.push(s); groups.set(s.blocked_date, arr); });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, slots]) => ({ date, slots }));
  }, [blockedSlots]);

  // Settings form state
  const [st, setSt] = useState(trialSetting?.start_time?.slice(0, 5) || DEFAULT_START);
  const [et, setEt] = useState(trialSetting?.end_time?.slice(0, 5) || DEFAULT_END);
  const [iv, setIv] = useState(trialSetting?.slot_interval_minutes || DEFAULT_INTERVAL);
  const [ds, setDs] = useState<number[]>(trialSetting?.available_days || DEFAULT_DAYS);
  const [wst, setWst] = useState(trialSetting?.weekend_start_time?.slice(0, 5) || "");
  const [wet, setWet] = useState(trialSetting?.weekend_end_time?.slice(0, 5) || "");
  const [leadTime, setLeadTime] = useState<number>(trialSetting?.min_lead_time_hours ?? 12);

  const hasWeekend = ds.includes(6) || ds.includes(7);

  // Sync state when trialSetting loads
  useMemo(() => {
    if (trialSetting) {
      setSt(trialSetting.start_time?.slice(0, 5) || DEFAULT_START);
      setEt(trialSetting.end_time?.slice(0, 5) || DEFAULT_END);
      setIv(trialSetting.slot_interval_minutes || DEFAULT_INTERVAL);
      setDs(trialSetting.available_days || DEFAULT_DAYS);
      setWst(trialSetting.weekend_start_time?.slice(0, 5) || "");
      setWet(trialSetting.weekend_end_time?.slice(0, 5) || "");
      setLeadTime(trialSetting.min_lead_time_hours ?? 12);
    }
  }, [trialSetting]);

  const toggleDay = (day: number) => {
    setDs((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort());
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Zeiteinstellungen</CardTitle>
          <CardDescription>Zeitspanne, Intervall und verfügbare Wochentage für Probetage.</CardDescription>
        </CardHeader>
        <CardContent>
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
            <div className="space-y-2 rounded-lg border border-border p-4">
              <Label className="text-sm font-medium">Vorlaufzeit (Stunden)</Label>
              <p className="text-xs text-muted-foreground">
                Wie viele Stunden im Voraus muss ein Termin mindestens gebucht werden? Gilt für Probetag und 1. Arbeitstag. Standard: 12.
              </p>
              <Input
                type="number"
                min={0}
                max={168}
                value={leadTime}
                onChange={(e) => setLeadTime(Math.max(0, Math.min(168, Number(e.target.value) || 0)))}
                className="w-32"
              />
            </div>
            <Button
              onClick={() => onSaveSettings({
                start_time: st, end_time: et, slot_interval_minutes: iv, available_days: ds,
                weekend_start_time: wst && wst !== "reset" ? wst : null,
                weekend_end_time: wet && wet !== "reset" ? wet : null,
                min_lead_time_hours: leadTime,
              })}
              disabled={isSavingSettings}
            >
              {isSavingSettings ? "Speichern..." : "Einstellungen speichern"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Probetag-Termine blockieren</CardTitle>
          <CardDescription>Wählen Sie ein Datum und blockieren Sie einzelne Zeitfenster für Probetage.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} locale={de} className="pointer-events-auto" />
              <div className="mt-4 space-y-2">
                <Label>Grund (optional)</Label>
                <Input placeholder="z.B. Feiertag" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} />
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
                      const isBlocked = blockedForDate.has(time);
                      return (
                        <button
                          key={time}
                          onClick={() => isBlocked ? unblockMutation.mutate(blockedForDate.get(time)!) : blockMutation.mutate(time)}
                          className={cn(
                            "py-2 px-2 rounded-lg text-sm font-medium transition-all border flex items-center justify-center gap-1",
                            isBlocked ? "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20" : "bg-card border-border hover:bg-muted text-foreground"
                          )}
                        >
                          {isBlocked ? <Ban className="h-3 w-3" /> : <Check className="h-3 w-3 text-muted-foreground" />}
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
          <CardHeader><CardTitle className="text-lg">Blockierte Probetag-Zeitfenster</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {blockedByDate.map(({ date, slots }) => (
              <div key={date}>
                <p className="text-sm font-medium mb-2">{format(new Date(date), "EEEE, dd. MMMM yyyy", { locale: de })}</p>
                <div className="flex flex-wrap gap-2">
                  {slots.map((s) => (
                    <Badge key={s.id} variant="secondary" className="gap-1.5 pr-1">
                      {s.blocked_time?.slice(0, 5)} Uhr
                      {s.reason && <span className="text-muted-foreground">({s.reason})</span>}
                      <button onClick={() => unblockMutation.mutate(s.id)} className="ml-1 hover:text-destructive transition-colors"><Trash2 className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}
