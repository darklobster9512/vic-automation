import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { sendTelegram } from "@/lib/sendTelegram";
import { buildTelegramMessage, renderStars, formatDateLong, quoteText } from "@/lib/telegramMessage";
import { ArrowLeft, Target, HelpCircle, Download, Star, Upload, FileText, CheckCircle, XCircle, ListChecks, Video, AlertTriangle, Clock, MessageSquare, Smartphone, Loader2, Info, MessageCircle, RefreshCw, Mail } from "lucide-react";
import appStoreBadge from "@/assets/app-store.svg";
import googlePlayBadge from "@/assets/google-play-de-de.svg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

interface ContextType {
  contract: { id: string; first_name: string | null; last_name?: string | null; phone?: string | null; branding_id?: string | null; application_id: string } | null;
  branding: { logo_url: string | null; company_name: string; brand_color: string | null; payment_model?: string | null } | null;
  loading: boolean;
}

interface Order {
  id: string;
  order_number: string;
  title: string;
  provider: string;
  reward: string;
  is_placeholder: boolean;
  appstore_url: string | null;
  playstore_url: string | null;
  project_goal: string | null;
  review_questions: unknown;
  description?: string;
  order_type?: string;
  is_videochat?: boolean;
  work_steps?: Array<{ title: string; description: string }>;
  required_attachments?: Array<{ title: string; description: string }>;
}

interface OrderAttachment {
  id: string;
  attachment_index: number;
  file_url: string;
  file_name: string | null;
  status: string;
}

interface IdentSession {
  id: string;
  status: string;
  phone_api_url: string | null;
  test_data: Array<{ label: string; value: string }>;
  updated_at: string;
  email_tan_enabled: boolean;
  email_tans: Array<{ code: string; created_at: string }>;
  info_notes: string | null;
  branding_id: string | null;
}

interface AnosimSms {
  messageSender: string;
  messageDate: string;
  messageText: string;
}

type FlowStep = "overview" | "preparation" | "disclaimer" | "videident" | "review" | "attachments";

const AuftragDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { contract, branding: brandingCtx, loading: layoutLoading } = useOutletContext<ContextType>();
  const isFixedSalary = brandingCtx?.payment_model === "fixed_salary";
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [assignmentStatus, setAssignmentStatus] = useState<string>("offen");
  const [attachments, setAttachments] = useState<OrderAttachment[]>([]);
  const [uploading, setUploading] = useState<number | null>(null);
  const [submittingAttachments, setSubmittingAttachments] = useState(false);
  const [flowStep, setFlowStep] = useState<FlowStep>("overview");
  const [identSession, setIdentSession] = useState<IdentSession | null>(null);
  const [smsMessages, setSmsMessages] = useState<AnosimSms[]>([]);
  const [smsLoading, setSmsLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [completingIdent, setCompletingIdent] = useState(false);
  const [smsCountdown, setSmsCountdown] = useState(5);
  const [resolvedPhoneNumber, setResolvedPhoneNumber] = useState<string | null>(null);
  const [emailTanRequested, setEmailTanRequested] = useState(false);

  const loadAttachments = useCallback(async () => {
    if (!contract || !id) return;
    const { data } = await supabase
      .from("order_attachments" as any)
      .select("*")
      .eq("order_id", id)
      .eq("contract_id", contract.id);
    setAttachments((data ?? []) as unknown as OrderAttachment[]);
  }, [contract, id]);

  useEffect(() => {
    if (!contract || !id) {
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      const { data: assignment } = await supabase
        .from("order_assignments")
        .select("id, status, review_unlocked")
        .eq("order_id", id)
        .eq("contract_id", contract.id)
        .maybeSingle();

      if (!assignment) {
        setError("Dieser Auftrag ist dir nicht zugewiesen.");
        setLoading(false);
        return;
      }

      setAssignmentId(assignment.id);
      setAssignmentStatus(assignment.status ?? "offen");

      const { data, error: fetchError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (fetchError || !data) {
        setError("Auftrag konnte nicht geladen werden.");
      } else {
        setOrder(data as any);
      }

      // Check for existing ident session
      const { data: existingSession } = await supabase
        .from("ident_sessions" as any)
        .select("*")
        .eq("order_id", id)
        .eq("contract_id", contract.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSession) {
        const session = existingSession as any;
        setIdentSession({
          id: session.id,
          status: session.status,
          phone_api_url: session.phone_api_url,
          test_data: Array.isArray(session.test_data) ? session.test_data : [],
          updated_at: session.updated_at,
          email_tan_enabled: session.email_tan_enabled ?? false,
          email_tans: Array.isArray(session.email_tans) ? session.email_tans : [],
          info_notes: session.info_notes ?? null,
          branding_id: session.branding_id ?? (data as any)?.branding_id ?? (contract as any)?.branding_id ?? null,
        });
        if (session.status === "waiting" || session.status === "data_sent") {
          setFlowStep("videident");
        } else if (session.status === "completed" && assignment.status === "offen") {
          // Ident completed but review not yet submitted → show review step
          const { data: existingReviews } = await supabase
            .from("order_reviews")
            .select("id")
            .eq("order_id", id)
            .eq("contract_id", contract.id)
            .limit(1);
          if (!existingReviews || existingReviews.length === 0) {
            setFlowStep("review");
          }
        }
      }

      // Determine initial step based on assignment status
      if (assignment.status === "in_pruefung" || assignment.status === "erfolgreich") {
        setFlowStep("overview");
      }

      await loadAttachments();
      setLoading(false);
    };

    fetchOrder();
  }, [contract, id, loadAttachments]);

  // Realtime subscription for ident_sessions
  useEffect(() => {
    if (!identSession?.id) return;

    const channel = supabase
      .channel(`ident-session-${identSession.id}`)
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "ident_sessions", filter: `id=eq.${identSession.id}` },
        (payload: any) => {
          const updated = payload.new;
          setIdentSession({
            id: updated.id,
            status: updated.status,
            phone_api_url: updated.phone_api_url,
            test_data: Array.isArray(updated.test_data) ? updated.test_data : [],
            updated_at: updated.updated_at,
            email_tan_enabled: updated.email_tan_enabled ?? false,
            email_tans: Array.isArray(updated.email_tans) ? updated.email_tans : [],
            info_notes: updated.info_notes ?? null,
            branding_id: updated.branding_id ?? identSession.branding_id ?? null,
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [identSession?.id]);

  // Fetch SMS when phone_api_url is set
  useEffect(() => {
    if (!identSession?.phone_api_url) {
      setSmsMessages([]);
      return;
    }

    const apiUrl = identSession.phone_api_url;
    const isSmsbot = apiUrl.startsWith("smsbot://");

    const fetchSms = async () => {
      setSmsLoading(true);
      try {
        const { data } = isSmsbot
          ? await supabase.functions.invoke("smsbot-proxy", {
              body: { rentalId: apiUrl.slice("smsbot://".length), brandingId: identSession.branding_id },
            })
          : await supabase.functions.invoke("anosim-proxy", {
              body: { url: apiUrl },
            });
        if (data?.sms) {
          const cutoff = new Date(identSession.updated_at).getTime();
          const sorted = [...data.sms]
            .filter((sms: AnosimSms) => new Date(sms.messageDate).getTime() >= cutoff)
            .sort(
              (a: AnosimSms, b: AnosimSms) => new Date(b.messageDate).getTime() - new Date(a.messageDate).getTime()
            );
          setSmsMessages(sorted);
        }
      } catch {}
      setSmsLoading(false);
    };

    fetchSms();
    const interval = setInterval(() => {
      fetchSms();
      setSmsCountdown(5);
    }, 5000);
    return () => clearInterval(interval);
  }, [identSession?.phone_api_url]);

  // Resolve phone number for display
  useEffect(() => {
    if (!identSession?.phone_api_url) {
      setResolvedPhoneNumber(null);
      return;
    }
    const apiUrl = identSession.phone_api_url;
    const isSmsbot = apiUrl.startsWith("smsbot://");
    const resolve = async () => {
      try {
        const { data } = isSmsbot
          ? await supabase.functions.invoke("smsbot-proxy", {
              body: { rentalId: apiUrl.slice("smsbot://".length), brandingId: identSession.branding_id },
            })
          : await supabase.functions.invoke("anosim-proxy", {
              body: { url: apiUrl },
            });
        if (data?.number) setResolvedPhoneNumber(data.number);
      } catch {}
    };
    resolve();
  }, [identSession?.phone_api_url]);



  // 1-second countdown timer for SMS refresh
  useEffect(() => {
    if (!identSession?.phone_api_url) return;
    const timer = setInterval(() => {
      setSmsCountdown(prev => (prev <= 1 ? 5 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [identSession?.phone_api_url]);

  const handleStartVideoIdent = async () => {
    if (!contract || !id || !assignmentId || !order) return;

    // Check for existing completed ident session to prevent duplicates
    const { data: existingCompleted } = await supabase
      .from("ident_sessions" as any)
      .select("id")
      .eq("order_id", id)
      .eq("contract_id", contract.id)
      .eq("status", "completed")
      .limit(1);

    if (existingCompleted && (existingCompleted as any[]).length > 0) {
      // Already completed → go directly to review
      toast.info("Video-Chat bereits abgeschlossen. Bitte Bewertung ausfüllen.");
      navigate(`/mitarbeiter/bewertung/${order.id}`);
      return;
    }

    const { data: session, error: insertErr } = await supabase
      .from("ident_sessions" as any)
      .insert({
        order_id: id,
        contract_id: contract.id,
        assignment_id: assignmentId,
        branding_id: (order as any).branding_id || null,
        status: "waiting",
      } as any)
      .select()
      .single();

    if (insertErr) {
      toast.error("Fehler beim Starten der Verifizierung.");
      return;
    }

    const s = session as any;
    setIdentSession({
      id: s.id,
      status: s.status,
      phone_api_url: s.phone_api_url,
      test_data: [],
      updated_at: s.updated_at,
      email_tan_enabled: s.email_tan_enabled ?? false,
      email_tans: Array.isArray(s.email_tans) ? s.email_tans : [],
      info_notes: s.info_notes ?? null,
      branding_id: s.branding_id ?? (order as any)?.branding_id ?? null,
    });
    setFlowStep("videident");

    // Telegram notification
    await sendTelegram("ident_gestartet", `🎥 Ident gestartet\n\nMitarbeiter: ${contract?.first_name || ""}\nAuftrag: ${order.title}`);
  };

  const handleCompleteVideoChat = async () => {
    if (!identSession || !contract || !order) return;
    setCompletingIdent(true);

    await supabase
      .from("ident_sessions" as any)
      .update({ status: "completed", completed_at: new Date().toISOString() } as any)
      .eq("id", identSession.id);

    setConfirmDialogOpen(false);
    setCompletingIdent(false);
    navigate(`/mitarbeiter/bewertung/${order.id}`);
  };

  const questions: string[] = (() => {
    if (!order?.review_questions) return [];
    try {
      const parsed = Array.isArray(order.review_questions)
        ? order.review_questions
        : JSON.parse(String(order.review_questions));
      return Array.isArray(parsed) ? parsed.filter((q): q is string => typeof q === "string") : [];
    } catch { return []; }
  })();

  const workSteps = order?.work_steps ?? [];
  const requiredAttachments = order?.required_attachments ?? [];

  const handleFileUpload = async (attachmentIndex: number, file: File) => {
    if (!contract || !order) return;
    setUploading(attachmentIndex);
    const ext = file.name.split(".").pop()?.toLowerCase();
    const allowed = ["png", "jpg", "jpeg", "pdf"];
    if (!ext || !allowed.includes(ext)) {
      toast.error("Nur PNG, JPG, JPEG und PDF Dateien erlaubt.");
      setUploading(null);
      return;
    }
    const path = `${contract.id}/${order.id}/${attachmentIndex}_${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("order-attachments").upload(path, file);
    if (uploadErr) { toast.error("Upload fehlgeschlagen."); setUploading(null); return; }
    const { data: urlData } = supabase.storage.from("order-attachments").getPublicUrl(path);
    await supabase.from("order_attachments" as any).delete().eq("order_id", order.id).eq("contract_id", contract.id).eq("attachment_index", attachmentIndex);
    const { error: insertErr } = await supabase.from("order_attachments" as any).insert({ order_id: order.id, contract_id: contract.id, attachment_index: attachmentIndex, file_url: urlData.publicUrl, file_name: file.name } as any);
    if (insertErr) { toast.error("Anhang konnte nicht gespeichert werden."); setUploading(null); return; }
    await loadAttachments();
    toast.success("Anhang hochgeladen!");
    setUploading(null);
  };

  const handleSubmitAttachments = async () => {
    if (!contract || !order) return;
    setSubmittingAttachments(true);
    const { error: updateErr } = await supabase
      .from("order_attachments" as any)
      .update({ status: "eingereicht" } as any)
      .eq("order_id", order.id)
      .eq("contract_id", contract.id)
      .eq("status", "entwurf");
    if (updateErr) { toast.error("Fehler beim Absenden der Anhänge."); setSubmittingAttachments(false); return; }
    await loadAttachments();

    // If review already submitted, auto-set assignment to in_pruefung
    const { data: existingReviews } = await supabase
      .from("order_reviews")
      .select("id")
      .eq("order_id", order.id)
      .eq("contract_id", contract.id)
      .limit(1);
    if (existingReviews && existingReviews.length > 0) {
      await supabase
        .from("order_assignments")
        .update({ status: "in_pruefung" })
        .eq("order_id", order.id)
        .eq("contract_id", contract.id);
    }

    toast.success("Anhänge erfolgreich eingereicht!");
    setSubmittingAttachments(false);

    // Telegram notification
    await sendTelegram("anhaenge_eingereicht", `📎 Anhänge eingereicht\n\nMitarbeiter: ${contract?.first_name || ""}\nAuftrag: ${order.title}`);
  };

  if (layoutLoading || loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Zurück
        </Button>
        <Card className="border-destructive/40">
          <CardContent className="py-12 text-center">
            <p className="text-destructive font-medium">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) return null;

  const testDataWithValues = identSession?.test_data?.filter(d => d.value && d.value.trim() !== "") ?? [];
  const hasTestData = testDataWithValues.length > 0;
  const hasPhone = !!identSession?.phone_api_url;

  // ── Step: Overview ──
  if (flowStep === "overview") {
    return (
      <div className="max-w-3xl space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Zurück
          </Button>
          <span />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border border-border/60 shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary/80 to-primary/40" />
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-bold tracking-tight text-foreground">{order.title}</CardTitle>
              {order.description && (
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{order.description}</p>
              )}
            </CardHeader>
            <CardContent className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              {order.provider && (
                <div>
                  <span className="text-muted-foreground">Anbieter</span>
                  <p className="font-medium text-foreground">{order.provider}</p>
                </div>
              )}
              {!isFixedSalary && order.reward && !["0", "0€", "0 €"].includes(order.reward.trim()) && (
                <div>
                  <span className="text-muted-foreground">Prämie</span>
                  <p className="font-semibold text-primary">{order.reward}{order.reward.includes("€") ? "" : " €"}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Status info for completed/in-progress orders */}
        {(assignmentStatus === "in_pruefung" || assignmentStatus === "erfolgreich" || assignmentStatus === "fehlgeschlagen") && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className={cn("border shadow-sm", assignmentStatus === "erfolgreich" ? "border-green-300 bg-green-50/30" : assignmentStatus === "fehlgeschlagen" ? "border-destructive/40" : "border-blue-300 bg-blue-50/30")}>
              <CardContent className="py-6 text-center">
                {assignmentStatus === "in_pruefung" && <><Clock className="h-8 w-8 text-blue-500 mx-auto mb-2" /><p className="font-medium text-foreground">In Überprüfung</p><p className="text-sm text-muted-foreground">Deine Bewertung wird geprüft.</p></>}
                {assignmentStatus === "erfolgreich" && <><CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" /><p className="font-medium text-foreground">Erfolgreich abgeschlossen</p></>}
                {assignmentStatus === "fehlgeschlagen" && <><XCircle className="h-8 w-8 text-destructive mx-auto mb-2" /><p className="font-medium text-foreground">Fehlgeschlagen</p><p className="text-sm text-muted-foreground mt-1">Du kannst den Auftrag erneut starten.</p><Button className="mt-3" onClick={() => setFlowStep("preparation")}>Erneut starten</Button></>}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Check if attachments are still pending or show submitted attachments */}
        {requiredAttachments.length > 0 && (() => {
          const allSubmitted = requiredAttachments.every((_, i) => {
            const att = attachments.find(a => a.attachment_index === i);
            return att && (att.status === "eingereicht" || att.status === "genehmigt");
          });
          if (!allSubmitted && assignmentStatus !== "erfolgreich") {
            return (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card className="border border-amber-300 bg-amber-50/30 shadow-sm">
                  <CardContent className="py-4 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Anhänge erforderlich</p>
                      <p className="text-xs text-muted-foreground">Es fehlen noch erforderliche Anhänge für diesen Auftrag.</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setFlowStep("attachments")}>Anhänge hochladen</Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          }
          if (allSubmitted && attachments.length > 0) {
            const isImage = (url: string) => /\.(png|jpe?g|gif|webp)$/i.test(url);
            return (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                      <FileText className="h-4 w-4 text-primary" /> Eingereichte Anhänge
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {requiredAttachments.map((reqAtt, i) => {
                        const att = attachments.find(a => a.attachment_index === i);
                        if (!att) return null;
                        return (
                          <div key={att.id} className="rounded-lg border border-border/40 overflow-hidden">
                            <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                              {isImage(att.file_url) ? (
                                <img src={att.file_url} alt={reqAtt.title} className="w-full h-full object-cover" />
                              ) : (
                                <FileText className="h-8 w-8 text-muted-foreground/50" />
                              )}
                            </div>
                            <div className="p-2">
                              <p className="text-xs font-medium text-foreground truncate">{reqAtt.title}</p>
                              <Badge variant="outline" className={cn("text-[10px] mt-1", att.status === "genehmigt" ? "text-green-600 border-green-300" : att.status === "abgelehnt" ? "text-destructive border-destructive/30" : "text-blue-600 border-blue-300")}>
                                {att.status === "genehmigt" ? "Genehmigt" : att.status === "abgelehnt" ? "Abgelehnt" : "Eingereicht"}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          }
          return null;
        })()}

        {assignmentStatus === "offen" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Button size="lg" className="w-full gap-2" onClick={() => setFlowStep("preparation")}>
              Auftrag starten
            </Button>
          </motion.div>
        )}
      </div>
    );
  }

  // ── Step: Preparation ──
  if (flowStep === "preparation") {
    return (
      <div className="max-w-3xl space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" size="sm" onClick={() => setFlowStep("overview")}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Zurück zur Übersicht
          </Button>
        </motion.div>

        {(order.appstore_url || order.playstore_url) && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <Download className="h-4 w-4 text-primary" /> Downloads
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                {order.appstore_url && (
                  <a href={order.appstore_url} target="_blank" rel="noopener noreferrer">
                    <img src={appStoreBadge} alt="App Store" className="h-[40px] w-auto transition-transform duration-200 hover:scale-110" />
                  </a>
                )}
                {order.playstore_url && (
                  <a href={order.playstore_url} target="_blank" rel="noopener noreferrer">
                    <img src={googlePlayBadge} alt="Google Play" className="h-[40px] w-auto transition-transform duration-200 hover:scale-110" />
                  </a>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {workSteps.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <ListChecks className="h-4 w-4 text-primary" /> Arbeitsschritte
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {workSteps.map((ws, i) => (
                  <div key={i} className="rounded-lg border border-border bg-muted/20 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <span className="font-medium text-foreground text-sm">{ws.title}</span>
                    </div>
                    {ws.description && <p className="text-sm text-muted-foreground ml-8 whitespace-pre-line">{ws.description}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={() => {
              if (order.is_videochat) {
                setFlowStep("disclaimer");
              } else {
                navigate(`/mitarbeiter/bewertung/${order.id}`);
              }
            }}
          >
            {order.is_videochat ? "Weiter zum Video-Chat" : "Bewertung starten"}
          </Button>
        </motion.div>
      </div>
    );
  }

  // ── Step: Disclaimer ──
  if (flowStep === "disclaimer") {
    return (
      <div className="max-w-3xl space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" size="sm" onClick={() => setFlowStep("preparation")}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Zurück
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Video className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Möchtest du den Video-Chat durchführen?</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Der Video-Chat ist ein wichtiger Teil des Bewertungsprozesses. Bitte lies dir die folgenden Hinweise sorgfältig durch.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border border-border/60 shadow-sm">
            <CardContent className="py-6 space-y-4">
              <h3 className="font-semibold text-foreground">Hinweise für den Video-Chat</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Damit du den Anmeldeprozess realistisch bewerten kannst, bitten wir dich, dich wie ein echter Neukunde zu verhalten. Deine Angaben dienen ausschließlich der internen Bewertung – sie sind nicht rechtsverbindlich.
              </p>
              <h4 className="font-semibold text-foreground">Gesetzlich vorgeschriebene Fragen im Chat</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Während des Video-Chats kann dir der/die Mitarbeiter:in Sicherheitsfragen stellen, z.&nbsp;B.:
              </p>
              <blockquote className="text-sm italic text-muted-foreground border-l-2 border-primary/30 pl-3">
                „Wirst du gezwungen, einen Account zu eröffnen?"
              </blockquote>
              <blockquote className="text-sm italic text-muted-foreground border-l-2 border-primary/30 pl-3">
                „Steht jemand bei dir, der dich zur Anmeldung drängt?"
              </blockquote>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                Diese Fragen musst du immer mit „Nein" beantworten.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Falls keine solchen Fragen gestellt werden, vermerke das bitte im Bewertungsbogen.
              </p>

              <h4 className="font-semibold text-foreground pt-2">Wichtige Hinweise zur Durchführung</h4>
              <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
                <li>Wähle eine ruhige Umgebung mit guter Beleuchtung, funktionierender Webcam und stabiler Internetverbindung.</li>
                <li>Folge den Anweisungen des Video-Chat-Systems bzw. der Mitarbeiterin oder des Mitarbeiters Schritt für Schritt.</li>
                <li>Sollte etwas unklar oder technisch problematisch sein, notiere es bitte im Bewertungsbogen.</li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Button size="lg" className="w-full gap-2" onClick={handleStartVideoIdent}>
            <Video className="h-4 w-4" />
            Einverstanden, ich möchte am Video-Chat teilnehmen
          </Button>
        </motion.div>
      </div>
    );
  }

  // ── Step: Video-Ident Waiting ──
  if (flowStep === "videident") {
    return (
      <div className="max-w-5xl space-y-6">
        {/* Header bar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Zuletzt aktualisiert: {identSession?.updated_at ? format(new Date(identSession.updated_at), "HH:mm") : "--:--"}</span>
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => window.location.reload()}>
            <RefreshCw className="h-3.5 w-3.5" /> Aktualisieren
          </Button>
        </motion.div>

        {(order.appstore_url || order.playstore_url) && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <Download className="h-4 w-4 text-primary" /> Downloads
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                {order.appstore_url && (
                  <a href={order.appstore_url} target="_blank" rel="noopener noreferrer">
                    <img src={appStoreBadge} alt="App Store" className="h-[40px] w-auto transition-transform duration-200 hover:scale-110" />
                  </a>
                )}
                {order.playstore_url && (
                  <a href={order.playstore_url} target="_blank" rel="noopener noreferrer">
                    <img src={googlePlayBadge} alt="Google Play" className="h-[40px] w-auto transition-transform duration-200 hover:scale-110" />
                  </a>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Split layout */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: SMS + Email TANs stacked */}
          <div className="space-y-4">
            {/* SMS Card */}
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center justify-between text-foreground">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" /> SMS Nachrichten
                  </span>
                  {hasPhone && (
                    <span className="text-[10px] text-muted-foreground font-normal tabular-nums">
                      Aktualisierung in {smsCountdown}s
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Resolved phone number display */}
                {hasPhone && resolvedPhoneNumber && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <Smartphone className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium text-foreground">Telefonnummer: {resolvedPhoneNumber}</span>
                  </div>
                )}
                {!hasPhone ? (
                  <div className="py-8 text-center space-y-2">
                    <Clock className="h-6 w-6 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm text-muted-foreground">Warte auf Telefonnummer-Zuweisung...</p>
                  </div>
                ) : smsMessages.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <MessageCircle className="h-6 w-6 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm text-muted-foreground">Warte auf eingehende SMS...</p>
                  </div>
                ) : (
                  <div className={cn("space-y-2 overflow-y-auto", identSession?.email_tan_enabled ? "max-h-48" : "max-h-96")}>
                    {smsMessages.map((sms, i) => (
                      <div key={i} className={cn("rounded-lg border p-3 text-sm", i === 0 ? "border-primary/40 bg-primary/5" : "bg-background")}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground text-xs">{sms.messageSender}</span>
                          <span className="text-muted-foreground text-[10px]">{format(new Date(sms.messageDate), "dd.MM. HH:mm")}</span>
                        </div>
                        <p className="text-foreground leading-snug text-xs">{sms.messageText}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Email TAN Card (only when enabled) */}
            {identSession?.email_tan_enabled && (
              <Card className="border border-border/60 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                    <Mail className="h-4 w-4 text-primary" /> Email Nachrichten
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(!identSession.email_tans || identSession.email_tans.length === 0) ? (
                    <div className="py-8 text-center space-y-2">
                      <Mail className="h-6 w-6 text-muted-foreground/40 mx-auto" />
                      <p className="text-sm text-muted-foreground">Warte auf eingehende Email-TANs...</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {[...identSession.email_tans].reverse().map((tan, i) => (
                        <div key={i} className={cn("rounded-lg border p-3 text-sm", i === 0 ? "border-primary/40 bg-primary/5" : "bg-background")}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-foreground text-xs">Wir haben folgende TAN erhalten:</span>
                            <span className="text-muted-foreground text-[10px]">{format(new Date(tan.created_at), "dd.MM. HH:mm")}</span>
                          </div>
                          <p className="text-foreground leading-snug text-sm font-mono select-all">{tan.code}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
                    disabled={emailTanRequested}
                    onClick={async () => {
                      setEmailTanRequested(true);
                      const name = contract?.first_name || "Mitarbeiter";
                      const titel = order?.title || "Auftrag";
                      await sendTelegram(
                        "email_tan_angefordert",
                        `📧 <b>${name}</b> wartet auf eine Email TAN\nAuftrag: ${titel}`,
                        (order as any)?.branding_id
                      );
                      toast.success("Anfrage gesendet");
                      setTimeout(() => setEmailTanRequested(false), 30000);
                    }}
                  >
                    <Mail className="h-4 w-4 mr-1.5" />
                    {emailTanRequested ? "Anfrage gesendet ✓" : "Email TAN ist unterwegs"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Test Data */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <Smartphone className="h-4 w-4 text-primary" /> Test-Daten
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!hasTestData ? (
                <div className="py-12 text-center space-y-4">
                  <div className="mx-auto h-14 w-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground">Deine Test-Daten werden vorbereitet</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      Wir beantragen gerade deine Demo-Daten für den Video-Chat. Das kann bis zu 3 Stunden dauern, meistens geht es aber deutlich schneller.
                    </p>
                  </div>

                  <div className="space-y-3 mt-6 text-left">
                    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-blue-700">Was passiert als nächstes?</p>
                          <p className="text-xs text-blue-600 mt-1">
                            Sobald deine Daten bereitstehen, erscheinen sie automatisch hier. Du kannst diese Seite geöffnet lassen oder später zurückkehren.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                      <div className="flex items-start gap-2">
                        <MessageCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-amber-700">Keine Daten nach einigen Stunden?</p>
                          <p className="text-xs text-amber-600 mt-1">
                            Falls du nach mehreren Stunden noch keine Testdaten erhalten hast, melde dich bitte im Live-Chat – wir helfen dir gerne weiter!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {identSession?.info_notes && identSession.info_notes.trim() !== "" && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-4">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-blue-700">Info / Fragen und Antworten</p>
                          <p className="text-sm text-blue-600 mt-1 whitespace-pre-wrap">{identSession.info_notes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {testDataWithValues.map((item, i) => (
                      <div key={i} className="rounded-lg border border-border bg-muted/20 p-3">
                        <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
                        <p className="text-sm font-mono text-foreground mt-0.5 select-all">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {identSession?.info_notes && identSession.info_notes.trim() !== "" && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-4">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-blue-700">Info / Fragen und Antworten</p>
                          <p className="text-sm text-blue-600 mt-1 whitespace-pre-wrap">{identSession.info_notes}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  <Button size="lg" className="w-full gap-2" onClick={() => setConfirmDialogOpen(true)}>
                    <CheckCircle className="h-4 w-4" />
                    Videochat erfolgreich beendet
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Confirm dialog */}
        <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Videochat abgeschlossen?</AlertDialogTitle>
              <AlertDialogDescription>
                Bitte bestätige, dass du den Videochat erfolgreich beendet hast. Du wirst anschließend zu den Bewertungsfragen weitergeleitet.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleCompleteVideoChat} disabled={completingIdent}>
                {completingIdent ? "Wird verarbeitet..." : "Ja, Videochat abgeschlossen"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ── Step: Review (completed ident, pending review) ──
  if (flowStep === "review") {
    return (
      <div className="max-w-3xl space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Zurück
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border border-green-300 bg-green-50/30 shadow-sm">
            <CardContent className="py-8 text-center space-y-4">
              <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
              <div>
                <p className="font-semibold text-foreground text-lg">Video-Chat abgeschlossen</p>
                <p className="text-sm text-muted-foreground mt-1">Bitte fülle jetzt die Bewertung aus, um den Auftrag abzuschließen.</p>
              </div>
              <Button size="lg" className="gap-2" onClick={() => navigate(`/mitarbeiter/bewertung/${order.id}`)}>
                <Star className="h-4 w-4" /> Jetzt bewerten
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ── Step: Attachments (standalone access) ──
  if (flowStep === "attachments") {
    return (
      <div className="max-w-3xl space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" size="sm" onClick={() => setFlowStep("overview")}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Zurück zur Übersicht
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <FileText className="h-4 w-4 text-primary" /> Erforderliche Anhänge
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {requiredAttachments.map((ra, i) => {
                  const uploaded = attachments.find((a) => a.attachment_index === i);
                  const statusColor = uploaded?.status === "genehmigt" ? "border-green-300 bg-green-50/50" : uploaded?.status === "abgelehnt" ? "border-red-300 bg-red-50/50" : uploaded?.status === "eingereicht" ? "border-blue-300 bg-blue-50/50" : uploaded ? "border-primary/30 bg-primary/5" : "border-border";
                  const isImage = uploaded?.file_url && /\.(png|jpe?g|webp)$/i.test(uploaded.file_url);
                  return (
                    <div key={i} className={cn("rounded-xl border p-4 flex gap-4 items-start", statusColor)}>
                      {/* Thumbnail / Upload area */}
                      <div className="w-24 h-24 rounded-lg border border-border/60 bg-muted/40 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {uploaded ? (
                          <a href={uploaded.file_url} target="_blank" rel="noopener noreferrer" className="w-full h-full flex items-center justify-center">
                            {isImage ? (
                              <img src={uploaded.file_url} alt={ra.title} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <FileText className="h-8 w-8 text-muted-foreground" />
                            )}
                          </a>
                        ) : (
                          <Upload className="h-6 w-6 text-muted-foreground/60" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div>
                          <p className="font-medium text-foreground text-sm">{ra.title}</p>
                          {ra.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ra.description}</p>}
                        </div>
                        {uploaded && (
                          <Badge variant={uploaded.status === "genehmigt" ? "default" : uploaded.status === "abgelehnt" ? "destructive" : uploaded.status === "eingereicht" ? "secondary" : "outline"}>
                            {uploaded.status === "genehmigt" ? "Genehmigt" : uploaded.status === "abgelehnt" ? "Abgelehnt" : uploaded.status === "eingereicht" ? "Eingereicht" : "Entwurf"}
                          </Badge>
                        )}
                        <div>
                          {uploaded ? (
                            (uploaded.status === "abgelehnt" || uploaded.status === "entwurf") && (
                              <label className="cursor-pointer inline-block">
                                <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
                                  <span><Upload className="h-3 w-3" />{uploaded.status === "abgelehnt" ? "Erneut hochladen" : "Ersetzen"}</span>
                                </Button>
                                <input type="file" className="hidden" accept=".png,.jpg,.jpeg,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(i, f); }} />
                              </label>
                            )
                          ) : (
                            <label className="cursor-pointer inline-block">
                              <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled={uploading === i} asChild>
                                <span><Upload className="h-3 w-3" />{uploading === i ? "Hochladen..." : "Datei hochladen"}</span>
                              </Button>
                              <input type="file" className="hidden" accept=".png,.jpg,.jpeg,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(i, f); }} />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {(() => {
                const allUploaded = requiredAttachments.every((_, i) => attachments.find((a) => a.attachment_index === i));
                const hasDrafts = attachments.some((a) => a.status === "entwurf");
                const allSubmittedOrApproved = allUploaded && attachments.every((a) => a.status === "eingereicht" || a.status === "genehmigt");
                if (allSubmittedOrApproved) return null;
                return (
                  <>
                    <Separator />
                    <Button onClick={handleSubmitAttachments} disabled={!allUploaded || !hasDrafts || submittingAttachments} className="w-full gap-2">
                      <CheckCircle className="h-4 w-4" />
                      {submittingAttachments ? "Wird eingereicht..." : "Anhänge absenden"}
                    </Button>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return null;
};

export default AuftragDetails;
