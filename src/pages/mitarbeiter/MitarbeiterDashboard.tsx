import { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Smartphone, Euro, ClipboardList, Star, ExternalLink, Play, Package, Clock, CheckCircle, XCircle, RefreshCw, FileText, Paperclip } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import DashboardReviewsSummary from "@/components/mitarbeiter/DashboardReviewsSummary";
import DashboardPayoutSummary from "@/components/mitarbeiter/DashboardPayoutSummary";
import StarterJobBadge from "@/components/mitarbeiter/StarterJobBadge";
import StarterJobNotice, { StarterJobPhase } from "@/components/mitarbeiter/StarterJobNotice";

const truncateText = (text: string, maxLen: number): string => {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLen) return normalized;
  const cut = normalized.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut) + "...";
};

interface ContextType {
  contract: { id: string; first_name: string | null; application_id: string | null; employment_type?: string | null } | null;
  branding: { logo_url: string | null; company_name: string; brand_color: string | null; payment_model?: string | null; salary_minijob?: number | null; salary_teilzeit?: number | null; salary_vollzeit?: number | null; hourly_rate_enabled?: boolean; hourly_rate_minijob?: number | null; hourly_rate_teilzeit?: number | null; hourly_rate_vollzeit?: number | null; estimated_salary_minijob?: number | null; estimated_salary_teilzeit?: number | null; estimated_salary_vollzeit?: number | null } | null;
  loading: boolean;
}

interface Order {
  id: string;
  order_number: string;
  title: string;
  provider: string;
  reward: string;
  is_placeholder: boolean;
  description: string | null;
  appstore_url: string | null;
  playstore_url: string | null;
  project_goal: string | null;
  is_starter_job?: boolean;
}

interface OrderWithStatus extends Order {
  assignment_status: string;
  hasIdentSession: boolean;
  hasReviewSubmitted: boolean;
  attachmentsPending: boolean;
  attachmentsSubmitted: boolean;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Guten Morgen";
  if (hour < 18) return "Guten Tag";
  return "Guten Abend";
}

const StatusButton = ({ status, orderId, navigate, hasIdentSession, hasReviewSubmitted, attachmentsPending, attachmentsSubmitted }: { 
  status: string; orderId: string; navigate: (path: string) => void; hasIdentSession?: boolean; hasReviewSubmitted?: boolean; attachmentsPending?: boolean; attachmentsSubmitted?: boolean
}) => {
  // Attachments submitted but not yet approved → show "In Überprüfung" (only after review)
  if (hasReviewSubmitted && attachmentsSubmitted && status !== "erfolgreich") {
    return (
      <Button className="w-full mt-2 rounded-xl" size="sm" disabled variant="outline">
        <Clock className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
        In Überprüfung
      </Button>
    );
  }

  // Attachments pending takes priority over regular status (only after review submitted)
  if (hasReviewSubmitted && attachmentsPending && status !== "erfolgreich") {
    return (
      <Button
        variant="outline"
        className="w-full mt-2 rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50"
        size="sm"
        onClick={() => navigate(`/mitarbeiter/auftragdetails/${orderId}`)}
      >
        <Paperclip className="h-3.5 w-3.5 mr-1.5" />
        Anhänge einreichen
      </Button>
    );
  }

  switch (status) {
    case "in_pruefung":
      return (
        <Button className="w-full mt-2 rounded-xl" size="sm" disabled variant="outline">
          <Clock className="h-3.5 w-3.5 mr-1.5 text-yellow-500" />
          In Überprüfung
        </Button>
      );
    case "erfolgreich":
      return (
        <Button className="w-full mt-2 rounded-xl" size="sm" disabled variant="outline">
          <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-green-500" />
          Erfolgreich
        </Button>
      );
    case "fehlgeschlagen":
      return (
        <Button
          className="w-full mt-2 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10"
          size="sm"
          variant="outline"
          onClick={() => navigate(`/mitarbeiter/auftragdetails/${orderId}`)}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Erneut bewerten
        </Button>
      );
    default:
      return (
        <Button
          className="w-full mt-2 rounded-xl group/btn bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          size="sm"
          onClick={() => navigate(`/mitarbeiter/auftragdetails/${orderId}`)}
        >
          {hasIdentSession ? "Auftrag fortführen" : "Auftrag starten"}
          {hasIdentSession 
            ? <Play className="h-3.5 w-3.5 ml-1.5 opacity-60 group-hover/btn:opacity-100 transition-opacity" />
            : <ExternalLink className="h-3.5 w-3.5 ml-1.5 opacity-60 group-hover/btn:opacity-100 transition-opacity" />
          }
        </Button>
      );
  }
};

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "in_pruefung":
      return <Badge variant="outline" className="text-[11px] text-yellow-600 border-yellow-300 bg-yellow-50">In Überprüfung</Badge>;
    case "erfolgreich":
      return <Badge variant="outline" className="text-[11px] text-green-600 border-green-300 bg-green-50">Erfolgreich</Badge>;
    case "fehlgeschlagen":
      return <Badge variant="outline" className="text-[11px] text-destructive border-destructive/30 bg-destructive/5">Fehlgeschlagen</Badge>;
    default:
      return null;
  }
};

const MitarbeiterDashboard = () => {
  const navigate = useNavigate();
  const { contract, branding, loading: layoutLoading } = useOutletContext<ContextType>();
  const [orders, setOrders] = useState<OrderWithStatus[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [balance, setBalance] = useState<number>(0);
  const [employmentType, setEmploymentType] = useState<string | null>(null);
  const [contractSubmittedAt, setContractSubmittedAt] = useState<string | null>(null);
  const [contractStatus, setContractStatus] = useState<string | null>(null);
  const [contractDismissed, setContractDismissed] = useState(false);
  const [desiredStartDate, setDesiredStartDate] = useState<string | null>(null);
  const [firstWorkdayDate, setFirstWorkdayDate] = useState<string | null>(null);
  const [templateSalary, setTemplateSalary] = useState<number | null>(null);
  const [starterPhase, setStarterPhase] = useState<StarterJobPhase | null>(null);




  const isFixedSalary = branding?.payment_model === "fixed_salary";
  const isHourlyRate = isFixedSalary && branding?.hourly_rate_enabled === true;

  const getFixedSalary = () => {
    if (!branding) return 0;
    switch (employmentType?.toLowerCase()) {
      case "minijob": return Number(branding.salary_minijob) || 0;
      case "teilzeit": return Number(branding.salary_teilzeit) || 0;
      case "vollzeit": return Number(branding.salary_vollzeit) || 0;
      default: return 0;
    }
  };

  const getHourlyRate = () => {
    if (!branding) return 0;
    switch (employmentType?.toLowerCase()) {
      case "minijob": return Number(branding.hourly_rate_minijob) || 0;
      case "teilzeit": return Number(branding.hourly_rate_teilzeit) || 0;
      case "vollzeit": return Number(branding.hourly_rate_vollzeit) || 0;
      default: return 0;
    }
  };

  const [hourlyEarnings, setHourlyEarnings] = useState<number>(0);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [recentReviews, setRecentReviews] = useState<{order_title: string; avg: number; date: string}[]>([]);
  

  useEffect(() => {
    if (!contract) {
      setDataLoading(false);
      return;
    }

    const fetchData = async () => {
      // Fetch contract details (balance, profile)
      const { data: contractDetails } = await supabase
        .from("employment_contracts")
        .select("balance, first_name, last_name, email, iban, employment_type, submitted_at, status, contract_dismissed, desired_start_date, template_id")
        .eq("id", contract.id)
        .maybeSingle();

      if (contractDetails) {
        setBalance(Number(contractDetails.balance) || 0);
        setEmploymentType(contractDetails.employment_type || null);
        setContractSubmittedAt(contractDetails.submitted_at || null);
        setContractStatus(contractDetails.status || null);
        setContractDismissed((contractDetails as any).contract_dismissed || false);
        setDesiredStartDate((contractDetails as any).desired_start_date || null);

        const tplId = (contractDetails as any).template_id;
        if (tplId) {
          const { data: tpl } = await supabase
            .from("contract_templates" as any)
            .select("salary")
            .eq("id", tplId)
            .maybeSingle();
          const tplSal = Number((tpl as any)?.salary);
          setTemplateSalary(!isNaN(tplSal) && tplSal > 0 ? tplSal : null);
        } else {
          setTemplateSalary(null);
        }
      }

      // Fetch first workday appointment for payout base date
      const { data: fwa } = await supabase
        .from("first_workday_appointments")
        .select("appointment_date")
        .eq("contract_id", contract.id)
        .order("appointment_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      setFirstWorkdayDate((fwa as any)?.appointment_date ?? null);




      // Fetch assignments
      const { data: assignments } = await supabase
        .from("order_assignments")
        .select("order_id, status")
        .eq("contract_id", contract.id);

      if (!assignments?.length) {
        setDataLoading(false);
        return;
      }

      const orderIds = assignments.map((a) => a.order_id);
      const statusMap = Object.fromEntries(assignments.map((a) => [a.order_id, a.status ?? "offen"]));

      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .in("id", orderIds);

      // Load ident sessions to detect "fortführen" state
      const { data: identSessions } = await supabase
        .from("ident_sessions")
        .select("order_id")
        .eq("contract_id", contract.id)
        .in("order_id", orderIds);

      const orderIdsWithSession = new Set((identSessions ?? []).map(s => s.order_id));

      if (ordersData) {
        // Load attachments and reviews for attachment-pending detection
        const { data: attachments } = await supabase
          .from("order_attachments")
          .select("order_id, attachment_index, status")
          .eq("contract_id", contract.id);

        const { data: reviewsForOrders } = await supabase
          .from("order_reviews")
          .select("order_id")
          .eq("contract_id", contract.id)
          .in("order_id", orderIds);

        const orderIdsWithReview = new Set((reviewsForOrders ?? []).map(r => r.order_id));

        // Group attachments by order_id
        const attachmentsByOrder: Record<string, Array<{ attachment_index: number; status: string }>> = {};
        for (const att of attachments ?? []) {
          if (!attachmentsByOrder[att.order_id]) attachmentsByOrder[att.order_id] = [];
          attachmentsByOrder[att.order_id].push(att);
        }

        setOrders(ordersData.map((o) => {
          const reqAtts = (o.required_attachments as any[] | null) ?? [];
          const hasReq = reqAtts.length > 0;
          const orderAtts = attachmentsByOrder[o.id] ?? [];
          const allSubmitted = hasReq && reqAtts.every((_: any, i: number) =>
            orderAtts.some((att) => att.attachment_index === i && (att.status === "eingereicht" || att.status === "genehmigt"))
          );
          const allApproved = hasReq && reqAtts.every((_: any, i: number) =>
            orderAtts.some((att) => att.attachment_index === i && att.status === "genehmigt")
          );
          return {
            ...o, 
            assignment_status: statusMap[o.id] ?? "offen",
            hasIdentSession: orderIdsWithSession.has(o.id),
            hasReviewSubmitted: orderIdsWithReview.has(o.id),
            attachmentsPending: hasReq && !allSubmitted,
            attachmentsSubmitted: allSubmitted && !allApproved,
          };
        }));

        // Starter job notice phase
        const starterOrders = ordersData.filter((o) => (o as any).is_starter_job);
        if (starterOrders.length > 0) {
          const allReviewed = starterOrders.every((o) => orderIdsWithReview.has(o.id));
          const allApprovedStarter = starterOrders.every((o) => (statusMap[o.id] ?? "offen") === "erfolgreich");
          const cStatus = (contractDetails as any)?.status ?? null;
          const cSubmitted = (contractDetails as any)?.submitted_at ?? null;
          if (!allReviewed) setStarterPhase("todo");
          else if (!allApprovedStarter) setStarterPhase("review_pending");
          else if (cStatus === "genehmigt") setStarterPhase("done");
          else if (!cSubmitted) setStarterPhase("contract_todo");
          else setStarterPhase("contract_pending");
        } else {
          setStarterPhase(null);
        }
      }

      // Fetch reviews with order titles
      const { data: reviews } = await supabase
        .from("order_reviews")
        .select("rating, order_id, created_at, question")
        .eq("contract_id", contract.id);

      if (reviews?.length) {
        const allRatings = reviews.map((r) => r.rating);
        const avg = allRatings.reduce((s, r) => s + r, 0) / allRatings.length;
        setAvgRating(avg);

        // Group by order_id
        const grouped: Record<string, { ratings: number[]; date: string }> = {};
        for (const r of reviews) {
          if (!grouped[r.order_id]) grouped[r.order_id] = { ratings: [], date: r.created_at };
          grouped[r.order_id].ratings.push(r.rating);
          if (r.created_at > grouped[r.order_id].date) grouped[r.order_id].date = r.created_at;
        }

        const uniqueOrderIds = Object.keys(grouped);
        setReviewCount(uniqueOrderIds.length);

        // Get order titles for recent reviews
        const { data: reviewOrders } = await supabase
          .from("orders")
          .select("id, title")
          .in("id", uniqueOrderIds);

        const titleMap = Object.fromEntries((reviewOrders ?? []).map((o) => [o.id, o.title]));

        const recent = uniqueOrderIds
          .map((oid) => ({
            order_title: titleMap[oid] || "Unbekannt",
            avg: grouped[oid].ratings.reduce((s, r) => s + r, 0) / grouped[oid].ratings.length,
            date: grouped[oid].date,
          }))
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 3);

        setRecentReviews(recent);
      }

      // Calculate hourly earnings from successful assignments
      if (isHourlyRate) {
        const { data: successAssignments } = await supabase
          .from("order_assignments")
          .select("order_id")
          .eq("contract_id", contract.id)
          .eq("status", "erfolgreich");

        if (successAssignments?.length) {
          const successOrderIds = successAssignments.map(a => a.order_id);
          const { data: successOrders } = await supabase
            .from("orders")
            .select("estimated_hours")
            .in("id", successOrderIds);

          let totalHours = 0;
          for (const o of successOrders ?? []) {
            const h = parseFloat(o.estimated_hours || "0");
            if (!isNaN(h)) totalHours += h;
          }
          setHourlyEarnings(totalHours * getHourlyRate());
        }
      }

      setDataLoading(false);
    };

    fetchData();
  }, [contract]);

  const isLoading = layoutLoading || dataLoading;

  const fixedSalary = getFixedSalary();

  const getEstimatedMonthlySalary = () => {
    if (templateSalary && templateSalary > 0) return templateSalary;
    if (!branding) return 0;
    switch (employmentType?.toLowerCase()) {
      case "minijob": return Number(branding.estimated_salary_minijob) || 0;
      case "teilzeit": return Number(branding.estimated_salary_teilzeit) || 0;
      case "vollzeit": return Number(branding.estimated_salary_vollzeit) || 0;
      default: return 0;
    }
  };


  const stats = [
    { label: "Zugewiesene Tests", value: orders.length.toString(), icon: Smartphone, detail: orders.length === 1 ? "1 Test" : `${orders.length} Tests` },
    isHourlyRate
      ? null
      : isFixedSalary
        ? { label: "Festgehalt", value: `${fixedSalary.toFixed(2)} €`, icon: Euro, detail: employmentType ? employmentType.charAt(0).toUpperCase() + employmentType.slice(1) : "Festgehalt" }
        : { label: "Guthaben", value: `${balance.toFixed(2)} €`, icon: Euro, detail: "Aktueller Kontostand" },
    { label: "Offene Aufträge", value: orders.filter((o) => o.assignment_status === "offen" || o.assignment_status === "fehlgeschlagen").length.toString(), icon: ClipboardList, detail: "Handlungsbedarf" },
    { label: "Bewertung", value: avgRating > 0 ? avgRating.toFixed(1) : "—", icon: Star, detail: reviewCount > 0 ? `${reviewCount} Bewertung${reviewCount !== 1 ? "en" : ""}` : "Noch keine" },
  ].filter(Boolean) as { label: string; value: string; icon: typeof Smartphone; detail: string }[];


  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
          {getGreeting()}, {contract?.first_name || "Tester"} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Hier ist deine aktuelle Übersicht.
        </p>
      </motion.div>

      {/* Contract data hint */}
      {contract && !contractSubmittedAt && starterPhase !== "todo" && starterPhase !== "review_pending" && starterPhase !== "contract_todo" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card className="border-l-4 border-l-amber-500 bg-background shadow-md rounded-2xl">
            <CardContent className="py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 shrink-0">
                  <FileText className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Arbeitsvertragsdaten ausfüllen</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Fülle deine persönlichen Daten aus, damit wir deinen Arbeitsvertrag erstellen können.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="rounded-xl shrink-0"
                onClick={() => navigate("/mitarbeiter/arbeitsvertrag")}
              >
                Jetzt ausfüllen
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Contract approved card */}
      {contract && contractStatus === "genehmigt" && !contractDismissed && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
          <Card className="border-l-4 border-l-green-500 bg-background shadow-md rounded-2xl">
            <CardContent className="py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-100 shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Arbeitsvertrag genehmigt</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Dein Arbeitsvertrag wurde genehmigt. Du kannst ihn unter "Meine Daten" einsehen.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0" onClick={async () => {
                await supabase.from("employment_contracts").update({ contract_dismissed: true } as any).eq("id", contract.id);
                setContractDismissed(true);
              }}>
                <XCircle className="h-5 w-5 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 + i * 0.08, ease: "easeOut" }}
          >
            <Card className="bg-white border border-border/40 shadow-md rounded-2xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary shadow-md shadow-primary/20">
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tracking-tight text-foreground">
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">{stat.detail}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Orders Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        {(() => {
          const dashboardOrders = orders.filter(o => o.assignment_status === "offen" || o.assignment_status === "fehlgeschlagen" || o.assignment_status === "in_pruefung");
          return (
            <>
              {starterPhase && <StarterJobNotice phase={starterPhase} />}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Deine Aufträge</h2>
                  <p className="text-sm text-muted-foreground">
                    {dashboardOrders.length
                      ? `${dashboardOrders.length} ${dashboardOrders.length === 1 ? "Auftrag" : "Aufträge"} mit Handlungsbedarf`
                      : "Keine offenen Aufträge"}
                  </p>
                </div>
              </div>

              {dashboardOrders.length === 0 ? (
                <Card className="border-dashed border-2 border-border/40 rounded-xl">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center mb-4">
                      <Package className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-base font-medium text-foreground mb-1">
                      Noch keine Aufträge
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Sobald dir Aufträge zugewiesen werden, erscheinen sie hier. Du wirst benachrichtigt.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {dashboardOrders.map((order, i) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.55 + i * 0.08, ease: "easeOut" }}
                    >
                      <Card className="bg-white border border-border/40 shadow-md rounded-2xl hover:shadow-lg transition-all duration-200 flex flex-col h-full border-l-4 border-l-primary">

                        <CardHeader className="pb-3 pt-5">
                          <div className="flex items-center justify-between mb-2">
                            {order.order_number ? (
                              <Badge variant="secondary" className="text-[11px] font-medium px-2.5 py-0.5 bg-muted rounded-full">
                                #{order.order_number}
                              </Badge>
                            ) : <span />}
                            <div className="flex items-center gap-1.5">
                              {order.is_starter_job && <StarterJobBadge />}
                              {order.hasReviewSubmitted && order.attachmentsPending && order.assignment_status !== "erfolgreich" && (
                                <Badge variant="outline" className="text-[11px] rounded-full text-amber-600 border-amber-300 bg-amber-50">
                                  <Paperclip className="h-3 w-3 mr-1" />
                                  Anhänge erforderlich
                                </Badge>
                              )}
                              <StatusBadge status={order.assignment_status} />
                            </div>
                          </div>
                          <CardTitle className="text-base font-semibold leading-snug text-foreground line-clamp-2">
                            {order.title}
                          </CardTitle>
                        </CardHeader>

                        <CardContent className="flex-1 flex flex-col justify-between gap-4 pt-0">
                          <div className="space-y-3">
                            {order.description && (
                              <p className="text-sm text-muted-foreground leading-relaxed pb-3 border-b border-border/30 break-words">{truncateText(order.description, 120)}</p>
                            )}
                            {!isFixedSalary && order.reward && !["0", "0€", "0 €"].includes(order.reward.trim()) && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Prämie</span>
                                <span className="font-semibold text-primary">{order.reward}{order.reward.includes("€") ? "" : " €"}</span>
                              </div>
                            )}


                          </div>

                        <StatusButton 
                            status={order.assignment_status} 
                            orderId={order.id} 
                            navigate={navigate}
                            hasIdentSession={order.hasIdentSession}
                            hasReviewSubmitted={order.hasReviewSubmitted}
                            attachmentsPending={order.attachmentsPending}
                            attachmentsSubmitted={order.attachmentsSubmitted}
                          />
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </motion.div>

      {/* Summary Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <DashboardReviewsSummary recentReviews={recentReviews} />
        <DashboardPayoutSummary balance={isHourlyRate ? getEstimatedMonthlySalary() : isFixedSalary ? fixedSalary : balance} isFixedSalary={isFixedSalary && !isHourlyRate} startDate={contractSubmittedAt} firstWorkdayDate={firstWorkdayDate} desiredStartDate={desiredStartDate} />
      </div>
    </div>
  );
};

export default MitarbeiterDashboard;
