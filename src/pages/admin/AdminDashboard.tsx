import { FileText, Calendar, FileCheck, CalendarClock, MessageCircle, Video, Users, Inbox } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import UpcomingStartDates from "@/components/admin/UpcomingStartDates";
import UpcomingTrialDays from "@/components/admin/UpcomingTrialDays";
import WaitingIdents from "@/components/admin/WaitingIdents";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";
import DashboardSection from "@/components/admin/dashboard/DashboardSection";
import DashboardRow from "@/components/admin/dashboard/DashboardRow";
import MetricList from "@/components/admin/dashboard/MetricList";
import EmptyState from "@/components/admin/dashboard/EmptyState";
import ActionBar from "@/components/admin/dashboard/ActionBar";

const today = () => format(new Date(), "yyyy-MM-dd");

const C = {
  blue: "hsl(var(--stat-blue))",
  green: "hsl(var(--stat-green))",
  orange: "hsl(var(--stat-orange))",
  violet: "hsl(var(--stat-violet))",
  rose: "hsl(var(--stat-rose))",
};

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

  const statusConfig: Record<string, { label: string; className: string }> = {
    neu: { label: "Neu", className: "border-blue-200 bg-blue-50 text-blue-700" },
    eingeladen: { label: "Eingeladen", className: "border-amber-200 bg-amber-50 text-amber-700" },
    bewerbungsgespraech: { label: "Bewerbungsgespräch", className: "border-yellow-200 bg-yellow-50 text-yellow-700" },
    termin_gebucht: { label: "Termin gebucht", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    erfolgreich: { label: "Erfolgreich", className: "border-green-200 bg-green-50 text-green-700" },
    abgelehnt: { label: "Abgelehnt", className: "border-red-200 bg-red-50 text-red-700" },
    ausstehend: { label: "Ausstehend", className: "border-amber-200 bg-amber-50 text-amber-700" },
  };

  const metrics = [
    { label: "Neue Bewerbungen", value: neuCount, loading: l1, link: "/admin/bewerbungen", color: C.blue },
    { label: "Gespräche heute", value: interviewTodayCount, loading: l2, link: "/admin/bewerbungsgespraeche", color: C.green },
    { label: "Offene Verträge", value: contractCount, loading: l3, link: "/admin/arbeitsvertraege", color: C.orange },
    { label: "Termine heute", value: appointmentTodayCount, loading: l4, link: "/admin/auftragstermine", color: C.violet },
    { label: "Ungelesene Chats", value: unreadChatCount, loading: l5, link: "/admin/livechat", color: C.rose },
  ];

  const actions = [
    { label: "neue Bewerbungen", count: neuCount ?? 0, link: "/admin/bewerbungen", icon: FileText, color: C.blue },
    { label: "Verträge prüfen", count: contractCount ?? 0, link: "/admin/arbeitsvertraege", icon: FileCheck, color: C.orange },
    { label: "ungelesene Chats", count: unreadChatCount ?? 0, link: "/admin/livechat", icon: MessageCircle, color: C.rose },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <h2 className="text-2xl font-bold tracking-tight text-foreground mb-0.5">Willkommen zurück</h2>
        <p className="text-muted-foreground text-sm capitalize">
          {format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })}
        </p>
      </motion.div>

      <ActionBar items={actions} />

      {/* Heute + Kennzahlen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <DashboardSection
            title="Heute"
            icon={CalendarClock}
            delay={0.05}
            tabs={[
              {
                id: "gespraeche",
                label: "Gespräche",
                count: todayInterviews?.length,
                link: "/admin/bewerbungsgespraeche",
                content: !todayInterviews?.length ? (
                  <EmptyState icon={Calendar} text="Heute stehen keine Gespräche an." />
                ) : (
                  <ScrollArea className="h-[260px]">
                    {todayInterviews.map((iv: any) => (
                      <DashboardRow
                        key={iv.id}
                        lead={`${iv.appointment_time?.slice(0, 5)}`}
                        title={`${iv.applications?.first_name ?? ""} ${iv.applications?.last_name ?? ""}`.trim() || "–"}
                        trailing={
                          <Badge variant="outline" className={`text-[10px] font-semibold ${statusConfig[iv.status]?.className ?? ""}`}>
                            {statusConfig[iv.status]?.label ?? iv.status}
                          </Badge>
                        }
                        onClick={() => navigate("/admin/bewerbungsgespraeche")}
                      />
                    ))}
                  </ScrollArea>
                ),
              },
              {
                id: "auftragstermine",
                label: "Auftragstermine",
                count: todayOrderAppts?.length,
                link: "/admin/auftragstermine",
                content: !todayOrderAppts?.length ? (
                  <EmptyState icon={CalendarClock} text="Heute stehen keine Auftragstermine an." />
                ) : (
                  <ScrollArea className="h-[260px]">
                    {todayOrderAppts.map((oa: any) => (
                      <DashboardRow
                        key={oa.id}
                        lead={`${oa.appointment_time?.slice(0, 5)}`}
                        title={`${oa.employment_contracts?.first_name ?? ""} ${oa.employment_contracts?.last_name ?? ""}`.trim() || "–"}
                        onClick={() => navigate("/admin/auftragstermine")}
                      />
                    ))}
                  </ScrollArea>
                ),
              },
            ]}
          />
        </div>

        <MetricList metrics={metrics} delay={0.1} />
      </div>

      {/* Zu erledigen + Neueste Bewerbungen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <DashboardSection
          title="Zu erledigen"
          icon={FileCheck}
          delay={0.15}
          tabs={[
            {
              id: "vertraege",
              label: "Verträge",
              count: submittedContracts?.length,
              link: "/admin/arbeitsvertraege",
              content: !submittedContracts?.length ? (
                <EmptyState icon={FileCheck} text="Keine eingereichten Verträge." />
              ) : (
                <ScrollArea className="h-[260px]">
                  {submittedContracts.map((c: any) => (
                    <DashboardRow
                      key={c.id}
                      title={`${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "–"}
                      subtitle="Eingereicht – wartet auf Prüfung"
                      trailing={
                        <span className="text-xs text-muted-foreground">
                          {c.submitted_at ? format(new Date(c.submitted_at), "dd.MM.yy", { locale: de }) : "–"}
                        </span>
                      }
                      onClick={() => navigate("/admin/arbeitsvertraege")}
                    />
                  ))}
                </ScrollArea>
              ),
            },
            {
              id: "idents",
              label: "Idents",
              link: "/admin/idents",
              content: <WaitingIdents embedded />,
            },
          ]}
        />

        <DashboardSection
          title="Neueste Bewerbungen"
          icon={Inbox}
          delay={0.2}
          tabs={[
            {
              id: "apps",
              label: "Bewerbungen",
              link: "/admin/bewerbungen",
              content: !recentApps?.length ? (
                <EmptyState icon={Inbox} text="Keine Bewerbungen vorhanden." />
              ) : (
                <ScrollArea className="h-[260px]">
                  {recentApps.map((a: any) => (
                    <DashboardRow
                      key={a.id}
                      title={`${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "–"}
                      trailing={
                        <>
                          <Badge variant="outline" className={`text-[10px] font-semibold ${statusConfig[a.status]?.className ?? ""}`}>
                            {statusConfig[a.status]?.label ?? a.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(a.created_at), "dd.MM.yy", { locale: de })}
                          </span>
                        </>
                      }
                      onClick={() => navigate("/admin/bewerbungen")}
                    />
                  ))}
                </ScrollArea>
              ),
            },
          ]}
        />
      </div>

      {/* Kommende Termine */}
      <DashboardSection
        title="Kommende Termine"
        icon={Users}
        delay={0.25}
        tabs={[
          {
            id: "startdaten",
            label: "Startdaten",
            link: "/admin/mitarbeiter",
            content: <UpcomingStartDates embedded />,
          },
          {
            id: "probetage",
            label: "Probetage",
            link: "/admin/probetag",
            content: <UpcomingTrialDays embedded />,
          },
        ]}
      />
    </>
  );
}
