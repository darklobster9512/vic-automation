import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Calendar, FileCheck, CalendarClock, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import UpcomingStartDates from "@/components/admin/UpcomingStartDates";
import UpcomingTrialDays from "@/components/admin/UpcomingTrialDays";
import WaitingIdents from "@/components/admin/WaitingIdents";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";

const today = () => format(new Date(), "yyyy-MM-dd");

const STAT_BORDERS = [
  "border-t-[hsl(var(--stat-blue))]",
  "border-t-[hsl(var(--stat-green))]",
  "border-t-[hsl(var(--stat-orange))]",
  "border-t-[hsl(var(--stat-violet))]",
  "border-t-[hsl(var(--stat-rose))]",
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { activeBrandingId, ready } = useBrandingFilter();

  const { data: neuCount, isLoading: l1 } = useQuery({
    queryKey: ["dash-bewerbungen-neu", activeBrandingId],
    queryFn: async () => {
      const { count } = await supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "neu").eq("branding_id", activeBrandingId!);
      return count ?? 0;
    },
    enabled: ready,
    refetchInterval: 30000,
  });

  const { data: interviewTodayCount, isLoading: l2 } = useQuery({
    queryKey: ["dash-gespraeche-heute", activeBrandingId],
    queryFn: async () => {
      const { count } = await supabase.from("interview_appointments").select("*, applications!inner(branding_id)", { count: "exact", head: true }).eq("appointment_date", today()).eq("applications.branding_id", activeBrandingId!);
      return count ?? 0;
    },
    enabled: ready,
    refetchInterval: 30000,
  });

  const { data: contractCount, isLoading: l3 } = useQuery({
    queryKey: ["dash-vertraege-eingereicht", activeBrandingId],
    queryFn: async () => {
      const { count } = await supabase.from("employment_contracts").select("*", { count: "exact", head: true }).eq("status", "eingereicht").eq("branding_id", activeBrandingId!);
      return count ?? 0;
    },
    enabled: ready,
    refetchInterval: 30000,
  });

  const { data: appointmentTodayCount, isLoading: l4 } = useQuery({
    queryKey: ["dash-termine-heute", activeBrandingId],
    queryFn: async () => {
      const { count } = await supabase.from("order_appointments").select("*, orders!inner(branding_id)", { count: "exact", head: true }).eq("appointment_date", today()).eq("orders.branding_id", activeBrandingId!);
      return count ?? 0;
    },
    enabled: ready,
    refetchInterval: 30000,
  });

  const { data: unreadChatCount, isLoading: l5 } = useQuery({
    queryKey: ["dash-chat-unread", activeBrandingId],
    queryFn: async () => {
      const { data: contracts } = await supabase.from("employment_contracts").select("id").eq("branding_id", activeBrandingId!);
      const ids = (contracts ?? []).map((c) => c.id);
      if (!ids.length) return 0;
      const { count } = await supabase.from("chat_messages").select("*", { count: "exact", head: true }).eq("sender_role", "user").eq("read", false).in("contract_id", ids);
      return count ?? 0;
    },
    enabled: ready,
    refetchInterval: 10000,
  });




  const { data: recentApps } = useQuery({
    queryKey: ["dash-recent-apps", activeBrandingId],
    queryFn: async () => {
      const { data } = await supabase.from("applications").select("id, first_name, last_name, status, created_at").eq("branding_id", activeBrandingId!).order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
    enabled: ready,
    refetchInterval: 30000,
  });

  const { data: todayInterviews } = useQuery({
    queryKey: ["dash-today-interviews", activeBrandingId],
    queryFn: async () => {
      const { data } = await supabase.from("interview_appointments").select("id, appointment_time, status, application_id, applications!inner(first_name, last_name, branding_id)").eq("appointment_date", today()).eq("applications.branding_id", activeBrandingId!).order("appointment_time", { ascending: true });
      return data ?? [];
    },
    enabled: ready,
    refetchInterval: 30000,
  });

  const { data: submittedContracts } = useQuery({
    queryKey: ["dash-submitted-contracts", activeBrandingId],
    queryFn: async () => {
      const { data } = await supabase.from("employment_contracts").select("id, first_name, last_name, submitted_at").eq("status", "eingereicht").eq("branding_id", activeBrandingId!).order("submitted_at", { ascending: false }).limit(5);
      return data ?? [];
    },
    enabled: ready,
    refetchInterval: 30000,
  });

  const { data: todayOrderAppts } = useQuery({
    queryKey: ["dash-today-order-appts", activeBrandingId],
    queryFn: async () => {
      const { data } = await supabase.from("order_appointments").select("id, appointment_time, contract_id, orders!inner(branding_id), employment_contracts(first_name, last_name)").eq("appointment_date", today()).eq("orders.branding_id", activeBrandingId!).order("appointment_time", { ascending: true });
      return data ?? [];
    },
    enabled: ready,
    refetchInterval: 30000,
  });

  const stats = [
    { label: "Neue Bewerbungen", value: neuCount, loading: l1, icon: FileText, link: "/admin/bewerbungen", accent: "text-blue-600 bg-blue-50" },
    { label: "Gespräche heute", value: interviewTodayCount, loading: l2, icon: Calendar, link: "/admin/bewerbungsgespraeche", accent: "text-emerald-600 bg-emerald-50" },
    { label: "Offene Verträge", value: contractCount, loading: l3, icon: FileCheck, link: "/admin/arbeitsvertraege", accent: "text-orange-600 bg-orange-50" },
    { label: "Termine heute", value: appointmentTodayCount, loading: l4, icon: CalendarClock, link: "/admin/auftragstermine", accent: "text-violet-600 bg-violet-50" },
    { label: "Ungelesene Chats", value: unreadChatCount, loading: l5, icon: MessageCircle, link: "/admin/livechat", accent: "text-rose-600 bg-rose-50" },
  ];

  const statusConfig: Record<string, { label: string; className: string }> = {
    neu: { label: "Neu", className: "border-blue-200 bg-blue-50 text-blue-700" },
    eingeladen: { label: "Eingeladen", className: "border-amber-200 bg-amber-50 text-amber-700" },
    bewerbungsgespraech: { label: "Bewerbungsgespräch", className: "border-yellow-200 bg-yellow-50 text-yellow-700" },
    termin_gebucht: { label: "Termin gebucht", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    erfolgreich: { label: "Erfolgreich", className: "border-green-200 bg-green-50 text-green-700" },
    abgelehnt: { label: "Abgelehnt", className: "border-red-200 bg-red-50 text-red-700" },
    ausstehend: { label: "Ausstehend", className: "border-amber-200 bg-amber-50 text-amber-700" },
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h2 className="text-2xl font-bold tracking-tight text-foreground mb-0.5">Willkommen zurück</h2>
        <p className="text-muted-foreground text-sm mb-8">Übersicht aller wichtigen Aktivitäten.</p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.07 }}>
            <Card
              className={`cursor-pointer border-t-4 ${STAT_BORDERS[i]} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`}
              onClick={() => navigate(s.link)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{s.label}</CardTitle>
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${s.accent}`}>
                  <s.icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                {s.loading ? (
                  <Skeleton className="h-9 w-14" />
                ) : (
                  <div className="text-3xl font-extrabold text-foreground">{s.value}</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <UpcomingStartDates />
      <UpcomingTrialDays />
      <WaitingIdents />

      {/* Detail Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Neueste Bewerbungen</CardTitle>
            </CardHeader>
            <CardContent>
              {!recentApps?.length ? (
                <p className="text-sm text-muted-foreground">Keine Bewerbungen vorhanden.</p>
              ) : (
                <div className="space-y-3">
                  {recentApps.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{a.first_name} {a.last_name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] font-semibold ${statusConfig[a.status]?.className ?? ""}`}>{statusConfig[a.status]?.label ?? a.status}</Badge>
                        <span className="text-muted-foreground text-xs">{format(new Date(a.created_at), "dd.MM.yy", { locale: de })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Heutige Gespräche</CardTitle>
            </CardHeader>
            <CardContent>
              {!todayInterviews?.length ? (
                <p className="text-sm text-muted-foreground">Keine Gespräche heute.</p>
              ) : (
                <div className="space-y-3">
                  {todayInterviews.map((iv: any) => (
                    <div key={iv.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">
                        {iv.applications?.first_name} {iv.applications?.last_name}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] font-semibold ${statusConfig[iv.status]?.className ?? ""}`}>{statusConfig[iv.status]?.label ?? iv.status}</Badge>
                        <span className="text-muted-foreground text-xs">{iv.appointment_time?.slice(0, 5)} Uhr</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Eingereichte Verträge</CardTitle>
            </CardHeader>
            <CardContent>
              {!submittedContracts?.length ? (
                <p className="text-sm text-muted-foreground">Keine eingereichten Verträge.</p>
              ) : (
                <div className="space-y-3">
                  {submittedContracts.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{c.first_name} {c.last_name}</span>
                      <span className="text-muted-foreground text-xs">
                        {c.submitted_at ? format(new Date(c.submitted_at), "dd.MM.yy", { locale: de }) : "–"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Heutige Auftragstermine</CardTitle>
            </CardHeader>
            <CardContent>
              {!todayOrderAppts?.length ? (
                <p className="text-sm text-muted-foreground">Keine Auftragstermine heute.</p>
              ) : (
                <div className="space-y-3">
                  {todayOrderAppts.map((oa: any) => (
                    <div key={oa.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">
                        {oa.employment_contracts?.first_name} {oa.employment_contracts?.last_name}
                      </span>
                      <span className="text-muted-foreground text-xs">{oa.appointment_time?.slice(0, 5)} Uhr</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
