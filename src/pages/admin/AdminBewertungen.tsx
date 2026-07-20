import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, CheckCircle, XCircle, Eye, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { sendEmail } from "@/lib/sendEmail";
import { sendSms } from "@/lib/sendSms";
import { resolveContractBranding } from "@/lib/resolveContractBranding";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";

interface GroupedReview {
  order_id: string;
  contract_id: string;
  order_title: string;
  order_reward: string;
  order_type: string;
  employee_name: string;
  avg_rating: number;
  date: string;
  assignment_status: string;
  details: { question: string; rating: number; comment: string }[];
}

const Stars = ({ count }: { count: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        className={`h-4 w-4 ${s <= Math.round(count) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
      />
    ))}
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "in_pruefung":
      return <Badge variant="outline" className="text-[11px] text-yellow-600 border-yellow-300 bg-yellow-50">In Überprüfung</Badge>;
    case "erfolgreich":
      return <Badge variant="outline" className="text-[11px] text-green-600 border-green-300 bg-green-50">Genehmigt</Badge>;
    case "fehlgeschlagen":
      return <Badge variant="outline" className="text-[11px] text-destructive border-destructive/30 bg-destructive/5">Abgelehnt</Badge>;
    default:
      return <Badge variant="outline" className="text-[11px]">Offen</Badge>;
  }
};

const AdminBewertungen = () => {
  const [selected, setSelected] = useState<GroupedReview | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const queryClient = useQueryClient();
  const { activeBrandingId, ready } = useBrandingFilter();

  const { data: grouped = [], isLoading } = useQuery({
    queryKey: ["admin-bewertungen", activeBrandingId],
    enabled: ready,
    queryFn: async () => {
      // Step 1: Get contract IDs for the active branding
      let contractQuery = supabase.from("employment_contracts").select("id, first_name, last_name");
      if (activeBrandingId) {
        contractQuery = contractQuery.eq("branding_id", activeBrandingId);
      }
      const { data: contracts } = await contractQuery;
      if (!contracts?.length) return [];

      const contractIds = contracts.map((c) => c.id);
      const contractMap = Object.fromEntries(
        contracts.map((c) => [c.id, [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unbekannt"])
      );

      // Step 2: Get reviews for those contracts (paginated to avoid 1000-row limit)
      const BATCH = 1000;
      let reviews: { order_id: string; contract_id: string; question: string; rating: number; comment: string; created_at: string }[] = [];
      let from = 0;
      while (true) {
        const { data: batch, error } = await supabase
          .from("order_reviews")
          .select("order_id, contract_id, question, rating, comment, created_at")
          .in("contract_id", contractIds)
          .range(from, from + BATCH - 1);
        if (error || !batch?.length) break;
        reviews = reviews.concat(batch);
        if (batch.length < BATCH) break;
        from += BATCH;
      }

      if (!reviews.length) return [];

      const orderIds = [...new Set(reviews.map((r) => r.order_id))];

      // Fetch orders
      const { data: orders } = await supabase.from("orders").select("id, title, reward, order_type").in("id", orderIds);

      // Fetch assignments (paginated)
      let assignments: { order_id: string; contract_id: string; status: string }[] = [];
      from = 0;
      while (true) {
        const { data: batch } = await supabase
          .from("order_assignments")
          .select("order_id, contract_id, status")
          .in("contract_id", contractIds)
          .in("order_id", orderIds)
          .range(from, from + BATCH - 1);
        if (!batch?.length) break;
        assignments = assignments.concat(batch);
        if (batch.length < BATCH) break;
        from += BATCH;
      }

      const orderMap = Object.fromEntries((orders ?? []).map((o) => [o.id, o]));
      const statusMap = Object.fromEntries(
        (assignments ?? []).map((a) => [`${a.order_id}_${a.contract_id}`, a.status ?? "offen"])
      );

      const map = new Map<string, GroupedReview>();
      for (const r of reviews) {
        const key = `${r.order_id}_${r.contract_id}`;
        if (!map.has(key)) {
          const o = orderMap[r.order_id];
          map.set(key, {
            order_id: r.order_id,
            contract_id: r.contract_id,
            order_title: o?.title ?? "Unbekannt",
            order_reward: o?.reward ?? "0€",
            order_type: o?.order_type ?? "",
            employee_name: contractMap[r.contract_id] ?? "Unbekannt",
            avg_rating: 0,
            date: r.created_at,
            assignment_status: statusMap[key] ?? "offen",
            details: [],
          });
        }
        map.get(key)!.details.push({ question: r.question, rating: r.rating, comment: r.comment });
      }

      for (const g of map.values()) {
        g.avg_rating = g.details.reduce((sum, d) => sum + d.rating, 0) / g.details.length;
      }

      return [...map.values()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    refetchInterval: 30000,
  });

  const parseReward = (reward: string): number => {
    const num = parseFloat(reward.replace(/[^0-9.,]/g, "").replace(",", "."));
    return isNaN(num) ? 0 : num;
  };

  const handleApprove = async (g: GroupedReview) => {
    const key = `${g.order_id}_${g.contract_id}`;
    setProcessing(key);

    const reward = parseReward(g.order_reward);

    // Check if order has required attachments and if they're all approved
    const { data: order } = await supabase
      .from("orders")
      .select("required_attachments")
      .eq("id", g.order_id)
      .single();

    const requiredAttachments = (order as any)?.required_attachments ?? [];
    const hasRequiredAttachments = Array.isArray(requiredAttachments) && requiredAttachments.length > 0;

    let allAttachmentsApproved = true;
    if (hasRequiredAttachments) {
      const { data: attachments } = await supabase
        .from("order_attachments")
        .select("status")
        .eq("order_id", g.order_id)
        .eq("contract_id", g.contract_id);

      const approvedCount = (attachments ?? []).filter((a) => a.status === "genehmigt").length;
      allAttachmentsApproved = approvedCount >= requiredAttachments.length;
    }

    const finalStatus = allAttachmentsApproved ? "erfolgreich" : "in_pruefung";

    const { error: statusErr } = await supabase
      .from("order_assignments")
      .update({ status: finalStatus })
      .eq("order_id", g.order_id)
      .eq("contract_id", g.contract_id);

    if (statusErr) {
      toast.error("Fehler beim Genehmigen.");
      setProcessing(null);
      return;
    }

    // Only credit reward and send notifications if fully completed
    if (finalStatus === "erfolgreich") {
      const { data: contract } = await supabase
        .from("employment_contracts")
        .select("balance, email, first_name, last_name, phone")
        .eq("id", g.contract_id)
        .single();

      const brandingId = await resolveContractBranding(g.contract_id);

      // Credit reward if per_order model
      let isPerOrder = true;
      if (brandingId) {
        const { data: branding } = await supabase.from("brandings").select("payment_model, sms_sender_name").eq("id", brandingId).single();
        isPerOrder = branding?.payment_model !== "fixed_salary";
      }

      if (isPerOrder && reward > 0) {
        const currentBalance = Number(contract?.balance ?? 0);
        await supabase
          .from("employment_contracts")
          .update({ balance: currentBalance + reward })
          .eq("id", g.contract_id);
      }

      let smsSender: string | undefined;
      if (brandingId) {
        const { data: branding } = await supabase.from("brandings").select("sms_sender_name" as any).eq("id", brandingId).single();
        smsSender = (branding as any)?.sms_sender_name || undefined;
      }

      // E-Mail-Versand für "auftrag_erfolgreich" deaktiviert — nur SMS

      // SMS "bewertung_genehmigt" deaktiviert — kein Versand mehr

    }

    if (finalStatus === "erfolgreich") {
      toast.success("Bewertung genehmigt und Prämie gutgeschrieben!");
    } else {
      toast.success("Bewertung genehmigt. Anhänge stehen noch aus.");
    }
    queryClient.invalidateQueries({ queryKey: ["admin-bewertungen"] });
    setProcessing(null);
    setSelected(null);
  };

  const handleReject = async (g: GroupedReview) => {
    const key = `${g.order_id}_${g.contract_id}`;
    setProcessing(key);

    const { error: statusErr } = await supabase
      .from("order_assignments")
      .update({ status: "fehlgeschlagen" })
      .eq("order_id", g.order_id)
      .eq("contract_id", g.contract_id);

    if (statusErr) {
      toast.error("Fehler beim Ablehnen.");
      setProcessing(null);
      return;
    }

    await supabase
      .from("order_reviews")
      .delete()
      .eq("order_id", g.order_id)
      .eq("contract_id", g.contract_id);

    const { data: contract } = await supabase
      .from("employment_contracts")
      .select("email, first_name, last_name, phone")
      .eq("id", g.contract_id)
      .single();

    let smsSender: string | undefined;
    const brandingId = await resolveContractBranding(g.contract_id);
    if (brandingId) {
      const { data: branding } = await supabase.from("brandings").select("sms_sender_name" as any).eq("id", brandingId).single();
      smsSender = (branding as any)?.sms_sender_name || undefined;
    }

    // E-Mail-Versand für "bewertung_abgelehnt" deaktiviert — nur SMS

    if (contract?.phone) {
      const name = `${contract.first_name || ""} ${contract.last_name || ""}`.trim();
      const { data: tpl } = await supabase.from("sms_templates" as any).select("message").eq("event_type", "bewertung_abgelehnt").single();
      const smsText = (tpl as any)?.message
        ? (tpl as any).message.replace("{name}", name).replace("{auftrag}", g.order_title)
        : `Hallo ${name}, Ihre Bewertung für "${g.order_title}" wurde leider abgelehnt.`;
      await sendSms({ to: contract.phone, text: smsText, event_type: "bewertung_abgelehnt", recipient_name: name, from: smsSender, branding_id: brandingId || null });
    }

    toast.success("Bewertung abgelehnt. Mitarbeiter kann erneut bewerten.");
    queryClient.invalidateQueries({ queryKey: ["admin-bewertungen"] });
    setProcessing(null);
    setSelected(null);
  };

  const handleApproveAllSilent = async (items: GroupedReview[]) => {
    if (!items.length) return;
    if (!confirm(`${items.length} Bewertungen ohne SMS genehmigen?`)) return;
    setProcessing("__bulk__");
    const toastId = "bulk-approve";
    toast.loading(`0 / ${items.length} bearbeitet…`, { id: toastId });

    let ok = 0;
    let partial = 0;
    let failed = 0;
    let done = 0;

    // Prefetch: branding-map & payment_model-map
    const contractIds = Array.from(new Set(items.map((i) => i.contract_id)));
    const orderIds = Array.from(new Set(items.map((i) => i.order_id)));

    const { data: contractsPrefetch } = await supabase
      .from("employment_contracts")
      .select("id, user_id, branding_id, balance")
      .in("id", contractIds);
    const contractMap = new Map<string, { user_id: string | null; branding_id: string | null; balance: number | null }>();
    (contractsPrefetch ?? []).forEach((c: any) =>
      contractMap.set(c.id, { user_id: c.user_id, branding_id: c.branding_id, balance: c.balance })
    );

    const userIds = Array.from(new Set((contractsPrefetch ?? []).map((c: any) => c.user_id).filter(Boolean)));
    const profileMap = new Map<string, string | null>();
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, branding_id")
        .in("id", userIds);
      (profiles ?? []).forEach((p: any) => profileMap.set(p.id, p.branding_id));
    }

    const effectiveBrandingId = (contractId: string): string | null => {
      const c = contractMap.get(contractId);
      if (!c) return null;
      const pb = c.user_id ? profileMap.get(c.user_id) ?? null : null;
      return pb ?? c.branding_id ?? null;
    };

    const brandingIds = Array.from(new Set(contractIds.map(effectiveBrandingId).filter((x): x is string => !!x)));
    const paymentModelMap = new Map<string, string | null>();
    if (brandingIds.length) {
      const { data: brandings } = await supabase
        .from("brandings")
        .select("id, payment_model")
        .in("id", brandingIds);
      (brandings ?? []).forEach((b: any) => paymentModelMap.set(b.id, b.payment_model));
    }

    const { data: ordersPrefetch } = await supabase
      .from("orders")
      .select("id, required_attachments")
      .in("id", orderIds);
    const orderReqMap = new Map<string, any[]>();
    (ordersPrefetch ?? []).forEach((o: any) =>
      orderReqMap.set(o.id, Array.isArray(o.required_attachments) ? o.required_attachments : [])
    );

    // Pending-balance-Deltas pro contract sammeln, um Race-Conditions bei parallelem update zu vermeiden
    const balanceDelta = new Map<string, number>();

    const processOne = async (g: GroupedReview) => {
      try {
        const reward = parseReward(g.order_reward);
        const requiredAttachments = orderReqMap.get(g.order_id) ?? [];
        const hasRequiredAttachments = requiredAttachments.length > 0;

        let allAttachmentsApproved = true;
        if (hasRequiredAttachments) {
          const { data: attachments } = await supabase
            .from("order_attachments")
            .select("status")
            .eq("order_id", g.order_id)
            .eq("contract_id", g.contract_id);
          const approvedCount = (attachments ?? []).filter((a) => a.status === "genehmigt").length;
          allAttachmentsApproved = approvedCount >= requiredAttachments.length;
        }

        const finalStatus = allAttachmentsApproved ? "erfolgreich" : "in_pruefung";
        const { data: updated, error: statusErr } = await supabase
          .from("order_assignments")
          .update({ status: finalStatus })
          .eq("order_id", g.order_id)
          .eq("contract_id", g.contract_id)
          .select("id");

        if (statusErr || !updated || updated.length === 0) {
          failed++;
          console.error("bulk approve failed", { order_id: g.order_id, contract_id: g.contract_id, statusErr, updated });
          return;
        }

        if (finalStatus === "erfolgreich") {
          const bid = effectiveBrandingId(g.contract_id);
          const isPerOrder = bid ? paymentModelMap.get(bid) !== "fixed_salary" : true;
          if (isPerOrder && reward > 0) {
            balanceDelta.set(g.contract_id, (balanceDelta.get(g.contract_id) ?? 0) + reward);
          }
          ok++;
        } else {
          partial++;
        }
      } catch (e) {
        failed++;
        console.error("bulk approve error", { order_id: g.order_id, contract_id: g.contract_id, e });
      } finally {
        done++;
        if (done % 5 === 0 || done === items.length) {
          toast.loading(`${done} / ${items.length} bearbeitet…`, { id: toastId });
        }
      }
    };

    // Concurrency-Pool mit 8 parallel
    const CONCURRENCY = 8;
    for (let i = 0; i < items.length; i += CONCURRENCY) {
      const chunk = items.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(processOne));
    }

    // Balance-Updates jetzt sequentiell pro contract (aggregiert)
    for (const [contractId, delta] of balanceDelta.entries()) {
      const current = Number(contractMap.get(contractId)?.balance ?? 0);
      const { error: balErr } = await supabase
        .from("employment_contracts")
        .update({ balance: current + delta })
        .eq("id", contractId);
      if (balErr) {
        console.error("bulk balance update failed", { contractId, delta, balErr });
      }
    }

    queryClient.invalidateQueries({ queryKey: ["admin-bewertungen"] });
    setProcessing(null);

    const parts: string[] = [];
    parts.push(`${ok} genehmigt`);
    if (partial) parts.push(`${partial} teilweise (Anhänge offen)`);
    if (failed) parts.push(`${failed} FEHLGESCHLAGEN`);
    const summary = parts.join(", ") + " — keine SMS versendet.";
    if (failed) {
      toast.error(summary, { id: toastId, duration: 10000 });
    } else {
      toast.success(summary, { id: toastId });
    }
  };


  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Bewertungen</h1>
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-md" />)}
      </div>
    );
  }

  const searchLower = search.trim().toLowerCase();
  const filteredGrouped = grouped
    .filter((g) => !searchLower || g.employee_name.toLowerCase().includes(searchLower))
    .filter((g) => {
      if (orderTypeFilter === "all") return true;
      if (orderTypeFilter === "andere") return !["bankdrop", "exchanger", "platzhalter"].includes(g.order_type);
      return g.order_type === orderTypeFilter;
    });
  const pendingReviews = filteredGrouped.filter((g) => !["erfolgreich", "fehlgeschlagen"].includes(g.assignment_status));
  const approvedReviews = filteredGrouped.filter((g) => g.assignment_status === "erfolgreich");
  const rejectedReviews = filteredGrouped.filter((g) => g.assignment_status === "fehlgeschlagen");

  const renderTable = (items: GroupedReview[], showActions: boolean) => {
    if (items.length === 0) {
      return <p className="text-muted-foreground text-sm py-4">Keine Bewertungen vorhanden.</p>;
    }
    return (
      <div className="premium-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mitarbeiter</TableHead>
              <TableHead>Auftrag</TableHead>
              <TableHead>Durchschnitt</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead className="text-right">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((g) => {
              const key = `${g.order_id}_${g.contract_id}`;
              const isProcessing = processing === key;
              return (
                <TableRow key={key}>
                  <TableCell className="font-medium">{g.employee_name}</TableCell>
                  <TableCell>{g.order_title}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Stars count={g.avg_rating} />
                      <span className="text-sm text-muted-foreground">
                        {g.avg_rating.toFixed(1)} / 5
                      </span>
                    </div>
                  </TableCell>
                  <TableCell><StatusBadge status={g.assignment_status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(g.date), "dd.MM.yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" onClick={() => setSelected(g)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Details</TooltipContent>
                      </Tooltip>
                      {showActions && !["erfolgreich", "fehlgeschlagen"].includes(g.assignment_status) && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                className="bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md transition-all"
                                disabled={isProcessing}
                                onClick={() => handleApprove(g)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Genehmigen</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="destructive"
                                className="shadow-sm hover:shadow-md transition-all"
                                disabled={isProcessing}
                                onClick={() => handleReject(g)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ablehnen</TooltipContent>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <TooltipProvider>
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight text-foreground">Bewertungen</h2>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Name suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Alle Typen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            <SelectItem value="bankdrop">Bankdrop</SelectItem>
            <SelectItem value="exchanger">Exchanger</SelectItem>
            <SelectItem value="platzhalter">Platzhalter</SelectItem>
            <SelectItem value="andere">Andere</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="in-review" className="w-full">
        <TabsList>
          <TabsTrigger value="in-review">In Überprüfung ({pendingReviews.length})</TabsTrigger>
          <TabsTrigger value="approved">Genehmigt ({approvedReviews.length})</TabsTrigger>
          <TabsTrigger value="rejected">Abgelehnt ({rejectedReviews.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="in-review">
          {(() => {
            const placeholderReviews = pendingReviews.filter((r) => r.order_type === "platzhalter");
            return placeholderReviews.length > 0 ? (
              <div className="flex justify-end mb-3">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={processing === "__bulk__"}
                  onClick={() => handleApproveAllSilent(placeholderReviews)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {processing === "__bulk__" ? "Genehmige..." : `Alle Platzhalter genehmigen (ohne SMS) · ${placeholderReviews.length}`}
                </Button>
              </div>
            ) : null;
          })()}

          {renderTable(pendingReviews, true)}
        </TabsContent>
        <TabsContent value="approved">
          {renderTable(approvedReviews, false)}
        </TabsContent>
        <TabsContent value="rejected">
          {renderTable(rejectedReviews, false)}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Bewertung — {selected?.employee_name} → {selected?.order_title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {selected?.details.map((d, i) => (
              <div key={i} className="space-y-2">
                <p className="text-sm font-semibold text-foreground">{d.question}</p>
                <div className="flex items-center gap-2">
                  <Stars count={d.rating} />
                  <span className="text-sm text-muted-foreground">{d.rating}/5</span>
                </div>
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                  {d.comment}
                </p>
                {i < (selected?.details.length ?? 0) - 1 && <Separator />}
              </div>
            ))}
          </div>
          {selected && !["erfolgreich", "fehlgeschlagen"].includes(selected.assignment_status) && (
            <>
              <Separator className="my-2" />
              <div className="flex gap-2 justify-end">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      className="bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md transition-all"
                      disabled={!!processing}
                      onClick={() => selected && handleApprove(selected)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Genehmigen</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="shadow-sm hover:shadow-md transition-all"
                      disabled={!!processing}
                      onClick={() => selected && handleReject(selected)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ablehnen</TooltipContent>
                </Tooltip>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
};

export default AdminBewertungen;
