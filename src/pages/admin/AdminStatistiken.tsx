import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, subDays, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComp } from "@/components/ui/calendar";
import { BarChart3, FileText, CalendarDays, Briefcase, UserPlus, FileCheck, CalendarRange } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

/* ---------- helpers ---------- */

const d = (v: Date) => format(v, "yyyy-MM-dd");
const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0);
const fmtPct = (n: number, total: number) => `${pct(n, total).toLocaleString("de-DE")}%`;

type RangeKey = "today" | "yesterday" | "7d" | "30d" | "month" | "lastMonth" | "custom";

const RANGE_LABELS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Heute" },
  { key: "yesterday", label: "Gestern" },
  { key: "7d", label: "Letzte 7 Tage" },
  { key: "30d", label: "Letzte 30 Tage" },
  { key: "month", label: "Dieser Monat" },
  { key: "lastMonth", label: "Letzter Monat" },
];

function resolveRange(key: RangeKey, custom: { from?: Date; to?: Date }): { from: Date; to: Date } {
  const now = new Date();
  switch (key) {
    case "today":
      return { from: now, to: now };
    case "yesterday":
      return { from: subDays(now, 1), to: subDays(now, 1) };
    case "7d":
      return { from: subDays(now, 6), to: now };
    case "30d":
      return { from: subDays(now, 29), to: now };
    case "month":
      return { from: startOfMonth(now), to: now };
    case "lastMonth":
      return { from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) };
    case "custom":
      return { from: custom.from ?? subDays(now, 6), to: custom.to ?? custom.from ?? now };
  }
}

/** Fetch all rows in batches to bypass the 1000-row limit */
async function fetchAll<T>(build: (from: number, to: number) => any): Promise<T[]> {
  const size = 1000;
  let page = 0;
  const out: T[] = [];
  // hard safety cap: 50k rows
  while (page < 50) {
    const { data, error } = await build(page * size, page * size + size - 1);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < size) break;
    page++;
  }
  return out;
}

const ACCEPTED_EXCLUDED = ["neu", "abgelehnt"];

/* ---------- page ---------- */

export default function AdminStatistiken() {
  const { activeBrandingId, ready } = useBrandingFilter();
  const [rangeKey, setRangeKey] = useState<RangeKey>("7d");
  const [custom, setCustom] = useState<{ from?: Date; to?: Date }>({});

  const { from, to } = resolveRange(rangeKey, custom);
  const fromStr = d(from);
  const toStr = d(to);
  const days = useMemo(
    () => eachDayOfInterval({ start: parseISO(fromStr), end: parseISO(toStr) }).map(d),
    [fromStr, toStr]
  );

  const enabled = ready && !!activeBrandingId;
  const qk = [activeBrandingId, fromStr, toStr];

  /* --- Bewerbungen --- */
  const appsQ = useQuery({
    queryKey: ["stats-apps", ...qk],
    enabled,
    queryFn: async () => {
      const rows = await fetchAll<{ id: string; created_at: string; status: string }>((f, t) =>
        supabase
          .from("applications")
          .select("id, created_at, status")
          .eq("branding_id", activeBrandingId!)
          .gte("created_at", `${fromStr}T00:00:00`)
          .lte("created_at", `${toStr}T23:59:59.999`)
          .order("created_at", { ascending: true })
          .range(f, t)
      );
      return rows;
    },
  });

  /* --- Akzeptierte Bewerbungen (nach Akzeptier-Datum) --- */
  const acceptedQ = useQuery({
    queryKey: ["stats-accepted", ...qk],
    enabled,
    queryFn: async () => {
      const rows = await fetchAll<{ id: string; accepted_at: string }>((f, t) =>
        supabase
          .from("applications")
          .select("id, accepted_at")
          .eq("branding_id", activeBrandingId!)
          .not("accepted_at", "is", null)
          .neq("status", "abgelehnt")
          .gte("accepted_at", `${fromStr}T00:00:00`)
          .lte("accepted_at", `${toStr}T23:59:59.999`)
          .range(f, t)
      );
      return rows;
    },
  });

  /* --- Gebuchte Termine (nach Buchungsdatum) --- */
  const bookedQ = useQuery({
    queryKey: ["stats-booked", ...qk],
    enabled,
    queryFn: async () => {
      const rows = await fetchAll<{ id: string; created_at: string }>((f, t) =>
        supabase
          .from("interview_appointments")
          .select("id, created_at, applications!inner(branding_id)")
          .eq("applications.branding_id", activeBrandingId!)
          .gte("created_at", `${fromStr}T00:00:00`)
          .lte("created_at", `${toStr}T23:59:59.999`)
          .range(f, t)
      );
      return rows;
    },
  });

  /* --- Bewerbungsgespräche --- */
  const interviewsQ = useQuery({
    queryKey: ["stats-interviews", ...qk],
    enabled,
    queryFn: async () => {
      const rows = await fetchAll<{ id: string; appointment_date: string; status: string; slot_index: number | null }>(
        (f, t) =>
          supabase
            .from("interview_appointments")
            .select("id, appointment_date, status, slot_index, applications!inner(branding_id)")
            .eq("applications.branding_id", activeBrandingId!)
            .gte("appointment_date", fromStr)
            .lte("appointment_date", toStr)
            .order("appointment_date", { ascending: true })
            .range(f, t)
      );
      const { data: resolved } = await supabase.rpc("resolved_interview_slots_for_branding" as any, {
        _branding_id: activeBrandingId!,
      });
      const slotMap = new Map<string, number | null>();
      ((resolved ?? []) as any[]).forEach((r) => slotMap.set(r.appointment_id, r.slot_index));
      return rows.map((r) => ({ ...r, slot: slotMap.get(r.id) ?? r.slot_index ?? null }));
    },
  });

  /* --- 1. Arbeitstag --- */
  const firstWorkdayQ = useQuery({
    queryKey: ["stats-firstworkday", ...qk],
    enabled,
    queryFn: async () => {
      const rows = await fetchAll<{ id: string; appointment_date: string; status: string }>((f, t) =>
        supabase
          .from("first_workday_appointments")
          .select("id, appointment_date, status, employment_contracts!inner(branding_id)")
          .eq("employment_contracts.branding_id", activeBrandingId!)
          .gte("appointment_date", fromStr)
          .lte("appointment_date", toStr)
          .range(f, t)
      );
      return rows;
    },
  });

  /* --- Accounts --- */
  const accountsQ = useQuery({
    queryKey: ["stats-accounts", ...qk],
    enabled,
    queryFn: async () => {
      const rows = await fetchAll<{ id: string; created_at: string }>((f, t) =>
        supabase
          .from("profiles")
          .select("id, created_at")
          .eq("branding_id", activeBrandingId!)
          .gte("created_at", `${fromStr}T00:00:00`)
          .lte("created_at", `${toStr}T23:59:59.999`)
          .range(f, t)
      );
      return rows;
    },
  });

  /* --- Arbeitsverträge --- */
  const contractsQ = useQuery({
    queryKey: ["stats-contracts", ...qk],
    enabled,
    queryFn: async () => {
      const rows = await fetchAll<{ id: string; submitted_at: string }>((f, t) =>
        supabase
          .from("employment_contracts")
          .select("id, submitted_at")
          .eq("branding_id", activeBrandingId!)
          .not("submitted_at", "is", null)
          .gte("submitted_at", `${fromStr}T00:00:00`)
          .lte("submitted_at", `${toStr}T23:59:59.999`)
          .range(f, t)
      );
      return rows;
    },
  });

  const loading =
    appsQ.isLoading || acceptedQ.isLoading || bookedQ.isLoading || interviewsQ.isLoading || firstWorkdayQ.isLoading || accountsQ.isLoading || contractsQ.isLoading;

  /* ---------- aggregation ---------- */

  const apps = appsQ.data ?? [];
  const accepted = acceptedQ.data ?? [];
  const booked = bookedQ.data ?? [];
  const interviews = interviewsQ.data ?? [];
  const workdays = firstWorkdayQ.data ?? [];
  const accounts = accountsQ.data ?? [];
  const contracts = contractsQ.data ?? [];

  const appsByDay = useMemo(() => {
    const m = new Map<string, { total: number; accepted: number; booked: number }>();
    days.forEach((day) => m.set(day, { total: 0, accepted: 0, booked: 0 }));
    const bump = (day: string, key: "total" | "accepted" | "booked") => {
      const e = m.get(day) ?? { total: 0, accepted: 0, booked: 0 };
      e[key]++;
      m.set(day, e);
    };
    apps.forEach((a) => bump(a.created_at.slice(0, 10), "total"));
    accepted.forEach((a) => bump(a.accepted_at.slice(0, 10), "accepted"));
    booked.forEach((b) => bump(b.created_at.slice(0, 10), "booked"));
    return days.map((day) => ({ day, ...(m.get(day) ?? { total: 0, accepted: 0, booked: 0 }) }));
  }, [apps, accepted, booked, days]);

  const interviewsByDay = useMemo(() => {
    const m = new Map<string, { total: number; ok: number; fail: number; mailbox: number; open: number }>();
    days.forEach((day) => m.set(day, { total: 0, ok: 0, fail: 0, mailbox: 0, open: 0 }));
    interviews.forEach((i) => {
      const e = m.get(i.appointment_date) ?? { total: 0, ok: 0, fail: 0, mailbox: 0, open: 0 };
      e.total++;
      if (i.status === "erfolgreich") e.ok++;
      else if (i.status === "fehlgeschlagen") e.fail++;
      else if (i.status === "mailbox") e.mailbox++;
      else e.open++;
      m.set(i.appointment_date, e);
    });
    return days.map((day) => ({ day, ...(m.get(day) ?? { total: 0, ok: 0, fail: 0, mailbox: 0, open: 0 }) }));
  }, [interviews, days]);

  const slotStats = useMemo(() => {
    const m = new Map<string, { total: number; ok: number; fail: number; mailbox: number; open: number }>();
    interviews.forEach((i) => {
      const key = i.slot ? String(i.slot) : "—";
      const e = m.get(key) ?? { total: 0, ok: 0, fail: 0, mailbox: 0, open: 0 };
      e.total++;
      if (i.status === "erfolgreich") e.ok++;
      else if (i.status === "fehlgeschlagen") e.fail++;
      else if (i.status === "mailbox") e.mailbox++;
      else e.open++;
      m.set(key, e);
    });
    return Array.from(m.entries())
      .sort((a, b) => (a[0] === "—" ? 1 : b[0] === "—" ? -1 : Number(a[0]) - Number(b[0])))
      .map(([slot, v]) => ({ slot, ...v }));
  }, [interviews]);

  const slotKeys = slotStats.map((s) => s.slot);

  const slotByDay = useMemo(() => {
    const m = new Map<string, Record<string, { total: number; ok: number }>>();
    days.forEach((day) => m.set(day, {}));
    interviews.forEach((i) => {
      const key = i.slot ? String(i.slot) : "—";
      const row = m.get(i.appointment_date) ?? {};
      const cell = row[key] ?? { total: 0, ok: 0 };
      cell.total++;
      if (i.status === "erfolgreich") cell.ok++;
      row[key] = cell;
      m.set(i.appointment_date, row);
    });
    return days.map((day) => ({ day, cells: m.get(day) ?? {} }));
  }, [interviews, days]);

  const workdaysByDay = useMemo(() => {
    const m = new Map<string, { total: number; ok: number; fail: number; open: number }>();
    days.forEach((day) => m.set(day, { total: 0, ok: 0, fail: 0, open: 0 }));
    workdays.forEach((w) => {
      const e = m.get(w.appointment_date) ?? { total: 0, ok: 0, fail: 0, open: 0 };
      e.total++;
      if (w.status === "erfolgreich") e.ok++;
      else if (w.status === "fehlgeschlagen") e.fail++;
      else e.open++;
      m.set(w.appointment_date, e);
    });
    return days.map((day) => ({ day, ...(m.get(day) ?? { total: 0, ok: 0, fail: 0, open: 0 }) }));
  }, [workdays, days]);

  const accountsContractsByDay = useMemo(() => {
    const acc = new Map<string, number>();
    const con = new Map<string, number>();
    accounts.forEach((a) => acc.set(a.created_at.slice(0, 10), (acc.get(a.created_at.slice(0, 10)) ?? 0) + 1));
    contracts.forEach((c) => con.set(c.submitted_at.slice(0, 10), (con.get(c.submitted_at.slice(0, 10)) ?? 0) + 1));
    return days.map((day) => ({ day, accounts: acc.get(day) ?? 0, contracts: con.get(day) ?? 0 }));
  }, [accounts, contracts, days]);

  const totals = useMemo(() => {
    const appsTotal = apps.length;
    const acceptedTotal = accepted.length;
    const bookedTotal = booked.length;
    const ivTotal = interviews.length;
    const ivOk = interviews.filter((i) => i.status === "erfolgreich").length;
    const ivFail = interviews.filter((i) => i.status === "fehlgeschlagen").length;
    const fwTotal = workdays.length;
    const fwOk = workdays.filter((w) => w.status === "erfolgreich").length;
    return {
      appsTotal,
      accepted: acceptedTotal,
      bookedTotal,
      ivTotal,
      ivOk,
      ivFail,
      fwTotal,
      fwOk,
      accounts: accounts.length,
      contracts: contracts.length,
    };
  }, [apps, accepted, booked, interviews, workdays, accounts, contracts]);

  const kpis = [
    { label: "Bewerbungen", value: totals.appsTotal, sub: `${totals.accepted} akzeptiert (${fmtPct(totals.accepted, totals.appsTotal)})`, icon: FileText, accent: "text-blue-600 bg-blue-50" },
    { label: "Termin gebucht", value: totals.bookedTotal, sub: `${fmtPct(totals.bookedTotal, totals.accepted)} der akzeptierten`, icon: CalendarDays, accent: "text-emerald-600 bg-emerald-50" },
    { label: "Gespräche", value: totals.ivTotal, sub: `${totals.ivOk} erfolgreich (${fmtPct(totals.ivOk, totals.ivTotal)}) · ${totals.ivFail} fehlgeschl.`, icon: BarChart3, accent: "text-violet-600 bg-violet-50" },
    { label: "1. Arbeitstag", value: totals.fwTotal, sub: `${totals.fwOk} erfolgreich (${fmtPct(totals.fwOk, totals.fwTotal)})`, icon: Briefcase, accent: "text-orange-600 bg-orange-50" },
    { label: "Neue Accounts", value: totals.accounts, sub: `${fmtPct(totals.accounts, totals.ivOk)} der erfolgr. Gespräche`, icon: UserPlus, accent: "text-cyan-600 bg-cyan-50" },
    { label: "Verträge eingereicht", value: totals.contracts, sub: `${fmtPct(totals.contracts, totals.accounts)} der Accounts`, icon: FileCheck, accent: "text-rose-600 bg-rose-50" },
  ];

  const funnel = [
    { label: "Bewerbungen", value: totals.appsTotal, base: totals.appsTotal },
    { label: "Akzeptiert", value: totals.accepted, base: totals.appsTotal },
    { label: "Termin gebucht", value: totals.bookedTotal, base: totals.accepted },
    { label: "Gespräch erfolgreich", value: totals.ivOk, base: totals.ivTotal },
    { label: "Account erstellt", value: totals.accounts, base: totals.ivOk },
    { label: "Vertrag eingereicht", value: totals.contracts, base: totals.accounts },
  ];

  const label = (day: string) => format(parseISO(day), "dd.MM.", { locale: de });

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h2 className="text-2xl font-bold tracking-tight text-foreground mb-0.5">Statistiken</h2>
        <p className="text-muted-foreground text-sm">
          Auswertung für {format(from, "dd.MM.yyyy", { locale: de })} – {format(to, "dd.MM.yyyy", { locale: de })}
        </p>
      </motion.div>

      {/* Zeitraum */}
      <div className="flex flex-wrap items-center gap-2">
        {RANGE_LABELS.map((r) => (
          <Button
            key={r.key}
            size="sm"
            variant={rangeKey === r.key ? "default" : "outline"}
            onClick={() => setRangeKey(r.key)}
          >
            {r.label}
          </Button>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant={rangeKey === "custom" ? "default" : "outline"}>
              <CalendarRange className="h-4 w-4 mr-1.5" />
              Benutzerdefiniert
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComp
              mode="range"
              selected={{ from: custom.from, to: custom.to } as any}
              onSelect={(v: any) => {
                setCustom({ from: v?.from, to: v?.to });
                if (v?.from) setRangeKey("custom");
              }}
              locale={de}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.05 }}>
            <Card className="shadow-sm hover:shadow-md transition-shadow h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">{k.label}</CardTitle>
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${k.accent}`}>
                  <k.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-foreground">{k.value.toLocaleString("de-DE")}</div>
                    <p className="text-[11px] text-muted-foreground mt-1">{k.sub}</p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Funnel */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Funnel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {funnel.map((f) => (
            <div key={f.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{f.label}</span>
                <span className="font-medium">
                  {f.value.toLocaleString("de-DE")}{" "}
                  <span className="text-muted-foreground text-xs">({fmtPct(f.value, f.base)})</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, pct(f.value, totals.appsTotal || f.base || 1))}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Bewerbungen pro Tag */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Bewerbungen pro Tag</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={appsByDay.map((r) => ({ ...r, name: label(r.day) }))}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <RTooltip />
                <Legend />
                <Bar dataKey="total" name="Eingegangen" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="accepted" name="Akzeptiert" fill="hsl(160 84% 39%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="booked" name="Termin gebucht" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead className="text-right">Eingegangen</TableHead>
                <TableHead className="text-right">Akzeptiert</TableHead>
                <TableHead className="text-right">Quote</TableHead>
                <TableHead className="text-right">Termin gebucht</TableHead>
                <TableHead className="text-right">Buchungsquote</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appsByDay.map((r) => (
                <TableRow key={r.day}>
                  <TableCell className="font-medium">{format(parseISO(r.day), "EEE, dd.MM.yyyy", { locale: de })}</TableCell>
                  <TableCell className="text-right">{r.total}</TableCell>
                  <TableCell className="text-right">{r.accepted}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{fmtPct(r.accepted, r.total)}</TableCell>
                  <TableCell className="text-right">{r.booked}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{fmtPct(r.booked, r.accepted)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Gespräche pro Tag */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Bewerbungsgespräche pro Tag</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={interviewsByDay.map((r) => ({ ...r, name: label(r.day) }))}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <RTooltip />
                <Legend />
                <Bar dataKey="ok" name="Erfolgreich" stackId="a" fill="hsl(160 84% 39%)" />
                <Bar dataKey="fail" name="Fehlgeschlagen" stackId="a" fill="hsl(0 72% 51%)" />
                <Bar dataKey="mailbox" name="Mailbox" stackId="a" fill="hsl(38 92% 50%)" />
                <Bar dataKey="open" name="Offen" stackId="a" fill="hsl(215 20% 65%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead className="text-right">Gesamt</TableHead>
                <TableHead className="text-right">Erfolgreich</TableHead>
                <TableHead className="text-right">Fehlgeschlagen</TableHead>
                <TableHead className="text-right">Mailbox</TableHead>
                <TableHead className="text-right">Offen</TableHead>
                <TableHead className="text-right">Erfolgsquote</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interviewsByDay.map((r) => (
                <TableRow key={r.day}>
                  <TableCell className="font-medium">{format(parseISO(r.day), "EEE, dd.MM.yyyy", { locale: de })}</TableCell>
                  <TableCell className="text-right">{r.total}</TableCell>
                  <TableCell className="text-right text-emerald-600">{r.ok}</TableCell>
                  <TableCell className="text-right text-red-600">{r.fail}</TableCell>
                  <TableCell className="text-right text-amber-600">{r.mailbox}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{r.open}</TableCell>
                  <TableCell className="text-right font-medium">{fmtPct(r.ok, r.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Slot-Vergleich */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Slot-Vergleich (Caller-Performance)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {slotStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Gespräche im Zeitraum.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Slot</TableHead>
                    <TableHead className="text-right">Termine</TableHead>
                    <TableHead className="text-right">Anteil</TableHead>
                    <TableHead className="text-right">Erfolgreich</TableHead>
                    <TableHead className="text-right">Fehlgeschlagen</TableHead>
                    <TableHead className="text-right">Mailbox</TableHead>
                    <TableHead className="text-right">Offen</TableHead>
                    <TableHead className="text-right">Erfolgsquote</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slotStats.map((s) => (
                    <TableRow key={s.slot}>
                      <TableCell>
                        <Badge variant="outline">Slot {s.slot}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{s.total}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{fmtPct(s.total, totals.ivTotal)}</TableCell>
                      <TableCell className="text-right text-emerald-600">{s.ok}</TableCell>
                      <TableCell className="text-right text-red-600">{s.fail}</TableCell>
                      <TableCell className="text-right text-amber-600">{s.mailbox}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{s.open}</TableCell>
                      <TableCell className="text-right font-semibold">{fmtPct(s.ok, s.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={slotByDay.map((r) => {
                      const row: Record<string, any> = { name: label(r.day) };
                      slotKeys.forEach((k) => {
                        const c = r.cells[k];
                        row[`slot${k}`] = c && c.total > 0 ? pct(c.ok, c.total) : null;
                      });
                      return row;
                    })}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={11} unit="%" domain={[0, 100]} />
                    <RTooltip formatter={(v: any) => `${v}%`} />
                    <Legend />
                    {slotKeys.map((k, i) => (
                      <Line
                        key={k}
                        type="monotone"
                        dataKey={`slot${k}`}
                        name={`Slot ${k}`}
                        stroke={["hsl(217 91% 60%)", "hsl(160 84% 39%)", "hsl(38 92% 50%)", "hsl(280 70% 55%)", "hsl(0 72% 51%)"][i % 5]}
                        strokeWidth={2}
                        connectNulls
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      {slotKeys.map((k) => (
                        <TableHead key={k} className="text-right">Slot {k}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slotByDay.map((r) => (
                      <TableRow key={r.day}>
                        <TableCell className="font-medium">{format(parseISO(r.day), "EEE, dd.MM.", { locale: de })}</TableCell>
                        {slotKeys.map((k) => {
                          const c = r.cells[k];
                          return (
                            <TableCell key={k} className="text-right">
                              {c ? (
                                <span>
                                  {c.ok}/{c.total}{" "}
                                  <span className="text-muted-foreground text-xs">({fmtPct(c.ok, c.total)})</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">–</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 1. Arbeitstag */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">1. Arbeitstag-Termine pro Tag</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead className="text-right">Termine</TableHead>
                <TableHead className="text-right">Erfolgreich</TableHead>
                <TableHead className="text-right">Fehlgeschlagen</TableHead>
                <TableHead className="text-right">Offen</TableHead>
                <TableHead className="text-right">Erfolgsquote</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workdaysByDay.map((r) => (
                <TableRow key={r.day}>
                  <TableCell className="font-medium">{format(parseISO(r.day), "EEE, dd.MM.yyyy", { locale: de })}</TableCell>
                  <TableCell className="text-right">{r.total}</TableCell>
                  <TableCell className="text-right text-emerald-600">{r.ok}</TableCell>
                  <TableCell className="text-right text-red-600">{r.fail}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{r.open}</TableCell>
                  <TableCell className="text-right font-medium">{fmtPct(r.ok, r.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Accounts & Verträge */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Accounts & Arbeitsverträge pro Tag</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accountsContractsByDay.map((r) => ({ ...r, name: label(r.day) }))}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <RTooltip />
                <Legend />
                <Bar dataKey="accounts" name="Neue Accounts" fill="hsl(190 90% 40%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="contracts" name="Verträge eingereicht" fill="hsl(340 75% 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead className="text-right">Neue Accounts</TableHead>
                <TableHead className="text-right">Verträge eingereicht</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accountsContractsByDay.map((r) => (
                <TableRow key={r.day}>
                  <TableCell className="font-medium">{format(parseISO(r.day), "EEE, dd.MM.yyyy", { locale: de })}</TableCell>
                  <TableCell className="text-right">{r.accounts}</TableCell>
                  <TableCell className="text-right">{r.contracts}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Hinweis: „Akzeptiert" und „Termin gebucht" beziehen sich auf die an dem jeweiligen Tag eingegangenen Bewerbungen
        (Kohortensicht), da für die Annahme kein eigener Zeitstempel gespeichert wird.
      </p>
    </div>
  );
}
