import { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, ExternalLink, Clock, CheckCircle, XCircle, RefreshCw, Paperclip, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import StarterJobBadge from "@/components/mitarbeiter/StarterJobBadge";

interface ContextType {
  contract: { id: string; first_name: string | null; application_id: string } | null;
  branding: { payment_model?: string; hourly_rate_enabled?: boolean; hourly_rate_minijob?: number | null; hourly_rate_teilzeit?: number | null; hourly_rate_vollzeit?: number | null } | null;
  loading: boolean;
}

interface Assignment {
  order_id: string;
  status: string;
  assigned_at: string;
  order_number: string;
  title: string;
  provider: string;
  reward: string;
  description: string | null;
  hasRequiredAttachments: boolean;
  attachmentsPending: boolean;
  attachmentsSubmitted: boolean;
  hasIdentSession: boolean;
  hasReviewSubmitted: boolean;
  estimated_hours: string | null;
  is_starter_job: boolean;
}

const truncateText = (text: string, maxLen: number): string => {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLen) return normalized;
  const cut = normalized.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut) + "...";
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  offen: { label: "Offen", color: "text-blue-600 border-blue-300 bg-blue-50", icon: ExternalLink },
  in_pruefung: { label: "In Überprüfung", color: "text-yellow-600 border-yellow-300 bg-yellow-50", icon: Clock },
  erfolgreich: { label: "Erfolgreich", color: "text-green-600 border-green-300 bg-green-50", icon: CheckCircle },
  fehlgeschlagen: { label: "Fehlgeschlagen", color: "text-destructive border-destructive/30 bg-destructive/5", icon: XCircle },
};

const filterOptions = [
  { value: "alle", label: "Alle Status" },
  { value: "offen", label: "Offen" },
  { value: "in_pruefung", label: "In Überprüfung" },
  { value: "erfolgreich", label: "Erfolgreich" },
  { value: "fehlgeschlagen", label: "Fehlgeschlagen" },
];

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = statusConfig[status] ?? statusConfig.offen;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`text-[11px] rounded-full ${cfg.color}`}>
      <Icon className="h-3 w-3 mr-1" />
      {cfg.label}
    </Badge>
  );
};

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

const MitarbeiterAuftraege = () => {
  const navigate = useNavigate();
  const { contract, branding, loading: layoutLoading } = useOutletContext<ContextType>();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("alle");
  const [employmentType, setEmploymentType] = useState<string | null>(null);

  const isFixedSalary = branding?.payment_model === "fixed_salary";
  const isHourlyRate = isFixedSalary && branding?.hourly_rate_enabled === true;

  const getHourlyRate = () => {
    if (!branding) return 0;
    switch (employmentType?.toLowerCase()) {
      case "minijob": return Number(branding.hourly_rate_minijob) || 0;
      case "teilzeit": return Number(branding.hourly_rate_teilzeit) || 0;
      case "vollzeit": return Number(branding.hourly_rate_vollzeit) || 0;
      default: return 0;
    }
  };

  useEffect(() => {
    if (!contract) { setLoading(false); return; }

    const fetchData = async () => {
      // Get employment type for hourly rate
      if (isHourlyRate) {
        const { data: ec } = await supabase
          .from("employment_contracts")
          .select("employment_type")
          .eq("id", contract.id)
          .maybeSingle();
        if (ec) setEmploymentType(ec.employment_type);
      }
      const { data: rawAssignments } = await supabase
        .from("order_assignments")
        .select("order_id, status, assigned_at")
        .eq("contract_id", contract.id)
        .order("assigned_at", { ascending: false });

      if (!rawAssignments?.length) { setLoading(false); return; }

      const orderIds = rawAssignments.map((a) => a.order_id);
      const { data: orders } = await supabase
        .from("orders")
        .select("id, order_number, title, provider, reward, is_placeholder, required_attachments, description, estimated_hours, is_starter_job")
        .in("id", orderIds);


      // Load attachments for this contract
      const { data: attachments } = await supabase
        .from("order_attachments")
        .select("order_id, attachment_index, status")
        .eq("contract_id", contract.id);

      // Load ident sessions to detect "fortführen" state
      const { data: identSessions } = await supabase
        .from("ident_sessions")
        .select("order_id")
        .eq("contract_id", contract.id)
        .in("order_id", orderIds);

      // Load reviews to detect "bewertung abgeschickt" state
      const { data: reviews } = await supabase
        .from("order_reviews")
        .select("order_id")
        .eq("contract_id", contract.id)
        .in("order_id", orderIds);

      const orderIdsWithSession = new Set((identSessions ?? []).map(s => s.order_id));
      const orderIdsWithReview = new Set((reviews ?? []).map(r => r.order_id));

      const orderMap = Object.fromEntries((orders ?? []).map((o) => [o.id, o]));

      // Group attachments by order_id
      const attachmentsByOrder: Record<string, Array<{ attachment_index: number; status: string }>> = {};
      for (const att of attachments ?? []) {
        if (!attachmentsByOrder[att.order_id]) attachmentsByOrder[att.order_id] = [];
        attachmentsByOrder[att.order_id].push(att);
      }

      setAssignments(
        rawAssignments
          .filter((a) => orderMap[a.order_id])
          .map((a) => {
            const order = orderMap[a.order_id];
            const reqAtts = (order.required_attachments as any[] | null) ?? [];
            const hasReq = reqAtts.length > 0;
            const orderAtts = attachmentsByOrder[a.order_id] ?? [];
            const allApproved = hasReq && reqAtts.every((_: any, i: number) =>
              orderAtts.some((att) => att.attachment_index === i && att.status === "genehmigt")
            );
            const allSubmitted = hasReq && reqAtts.every((_: any, i: number) =>
              orderAtts.some((att) => att.attachment_index === i && (att.status === "eingereicht" || att.status === "genehmigt"))
            );
            return {
              order_id: a.order_id,
              status: a.status ?? "offen",
              assigned_at: a.assigned_at,
              order_number: order.order_number,
              title: order.title,
              provider: order.provider,
              reward: order.reward,
              description: order.description ?? null,
              estimated_hours: order.estimated_hours ?? null,
              is_starter_job: (order as any).is_starter_job ?? false,
              hasRequiredAttachments: hasReq,
              attachmentsPending: hasReq && !allSubmitted,
              attachmentsSubmitted: allSubmitted && !allApproved,
              hasIdentSession: orderIdsWithSession.has(a.order_id),
              hasReviewSubmitted: orderIdsWithReview.has(a.order_id),
            };
          })
      );
      setLoading(false);
    };
    fetchData();
  }, [contract]);

  const statusOrder: Record<string, number> = { offen: 0, in_pruefung: 1, fehlgeschlagen: 2, erfolgreich: 3 };
  const filtered = filter === "alle" ? assignments : assignments.filter((a) => a.status === filter);
  const sorted = [...filtered].sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99));

  if (layoutLoading || loading) {
    return (
      <div className="space-y-8 max-w-7xl">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
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
      {/* Header with filter */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Aufträge</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {assignments.length} {assignments.length === 1 ? "Auftrag" : "Aufträge"} insgesamt
          </p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px] rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Cards Grid */}
      {sorted.length === 0 ? (
        <Card className="border-dashed border-2 border-border/40 rounded-xl">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-base font-medium text-foreground mb-1">Keine Aufträge</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Keine Aufträge in dieser Kategorie gefunden.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {sorted.map((a, i) => (
            <motion.div
              key={a.order_id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: "easeOut" }}
            >
              <Card className="bg-white border border-border/40 shadow-md rounded-2xl hover:shadow-lg transition-all duration-200 flex flex-col h-full border-l-4 border-l-primary">

                <CardHeader className="pb-3 pt-5">
                    <div className="flex items-center justify-between mb-2">
                      {a.order_number ? (
                        <Badge variant="secondary" className="text-[11px] font-medium px-2.5 py-0.5 bg-muted rounded-full">
                          #{a.order_number}
                        </Badge>
                      ) : <span />}
                      <div className="flex items-center gap-1.5">
                        {a.is_starter_job && <StarterJobBadge />}
                        {a.hasReviewSubmitted && a.attachmentsPending && a.status !== "erfolgreich" && (
                          <Badge variant="outline" className="text-[11px] rounded-full text-amber-600 border-amber-300 bg-amber-50">
                            <Paperclip className="h-3 w-3 mr-1" />
                            Anhänge erforderlich
                          </Badge>
                        )}
                        <StatusBadge status={a.status} />
                      </div>
                    </div>
                  <CardTitle className="text-base font-semibold leading-snug text-foreground line-clamp-2">
                    {a.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col justify-between gap-4 pt-0">
                  <div className="space-y-3">
                    {a.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed pb-3 border-b border-border/30 break-words">
                        {truncateText(a.description, 120)}
                      </p>
                    )}
                    {(() => {
                      if (isHourlyRate && a.status === "erfolgreich") {
                        const hours = parseFloat(a.estimated_hours || "0");
                        if (isNaN(hours) || hours <= 0) return null;
                        const earnings = hours * getHourlyRate();
                        if (earnings <= 0) return null;
                        return (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Verdienst ({hours.toFixed(1)} Std.)</span>
                            <span className="font-semibold text-primary">{earnings.toFixed(2)} €</span>
                          </div>
                        );
                      }
                      if (isFixedSalary) return null;
                      if (a.reward && !["0", "0€", "0 €"].includes(a.reward.trim())) {
                        return (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Prämie</span>
                            <span className="font-semibold text-primary">{a.reward}{a.reward.includes("€") ? "" : " €"}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}

                  </div>

                  <StatusButton 
                    status={a.status} 
                    orderId={a.order_id} 
                    navigate={navigate}
                    hasIdentSession={a.hasIdentSession}
                    hasReviewSubmitted={a.hasReviewSubmitted}
                    attachmentsPending={a.attachmentsPending}
                    attachmentsSubmitted={a.attachmentsSubmitted}
                  />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MitarbeiterAuftraege;
