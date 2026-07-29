import { useEffect, useState } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { sendTelegram } from "@/lib/sendTelegram";
import { buildTelegramMessage, renderStars, formatDateLong, quoteText } from "@/lib/telegramMessage";
import { toast } from "sonner";

interface ContextType {
  contract: { id: string; first_name: string | null; last_name?: string | null; phone?: string | null; branding_id?: string | null; application_id: string } | null;
  branding?: { company_name?: string | null } | null;
  loading: boolean;
}

interface ReviewAnswer {
  rating: number;
  comment: string;
}

const StarRating = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star === value ? 0 : star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={`h-7 w-7 transition-colors ${
              star <= (hover || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
      <span className="ml-2 text-sm text-muted-foreground font-medium">
        {value}/5 Sterne
      </span>
    </div>
  );
};

const Bewertung = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { contract, loading: layoutLoading } = useOutletContext<ContextType>();

  const [order, setOrder] = useState<{ id: string; title: string; review_questions: unknown; required_attachments: unknown } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<ReviewAnswer[]>([]);

  const contractId = contract?.id;

  useEffect(() => {
    if (!contractId || !id) { setLoading(false); return; }

    // Already loaded for this order? Don't re-fetch and wipe answers
    if (order?.id === id) return;

    const fetchOrder = async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, title, review_questions, required_attachments")
        .eq("id", id)
        .maybeSingle();

      if (!data) { setLoading(false); return; }
      setOrder(data);

      const qs = parseQuestions(data.review_questions);
      setAnswers(qs.map(() => ({ rating: 0, comment: "" })));
      setLoading(false);
    };
    fetchOrder();
  }, [contractId, id]);

  const parseQuestions = (raw: unknown): string[] => {
    if (!raw) return [];
    try {
      const parsed = Array.isArray(raw) ? raw : JSON.parse(String(raw));
      return Array.isArray(parsed) ? parsed.filter((q): q is string => typeof q === "string") : [];
    } catch { return []; }
  };

  const questions = order ? parseQuestions(order.review_questions) : [];

  const updateAnswer = (idx: number, patch: Partial<ReviewAnswer>) => {
    setAnswers((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  const isValid = answers.length > 0 && answers.every((a) => a.rating >= 1 && a.comment.trim().length > 0);

  const handleSubmit = async () => {
    if (!isValid || !contract || !order) return;
    setSubmitting(true);

    // Delete old reviews if re-evaluating
    await supabase
      .from("order_reviews")
      .delete()
      .eq("order_id", order.id)
      .eq("contract_id", contract.id);

    const rows = questions.map((q, i) => ({
      order_id: order.id,
      contract_id: contract.id,
      question: q,
      rating: answers[i].rating,
      comment: answers[i].comment.trim(),
    }));

    const { error } = await supabase.from("order_reviews").insert(rows);

    if (error) {
      toast.error("Fehler beim Absenden der Bewertung.");
      setSubmitting(false);
      return;
    }

    // Check if required attachments exist
    const reqAtts = Array.isArray(order.required_attachments) ? order.required_attachments : [];
    const hasPendingAttachments = reqAtts.length > 0;

    if (!hasPendingAttachments) {
      // No attachments needed → set to in_pruefung as before
      await supabase
        .from("order_assignments")
        .update({ status: "in_pruefung" })
        .eq("order_id", order.id)
        .eq("contract_id", contract.id);
    }

    // Telegram notification
    const empName = contract.first_name || "Mitarbeiter";
    await sendTelegram("bewertung_eingereicht", `⭐ Bewertung eingereicht\n\nMitarbeiter: ${empName}\nAuftrag: ${order.title}`);

    toast.success("Bewertung erfolgreich abgeschickt!");

    if (hasPendingAttachments) {
      toast.info("Bitte lade jetzt die erforderlichen Anhänge hoch.");
      navigate(`/mitarbeiter/auftragdetails/${order.id}`);
    } else {
      navigate("/mitarbeiter");
    }
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

  if (!order || questions.length === 0) {
    return (
      <div className="max-w-3xl space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Zurück
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Keine Bewertungsfragen vorhanden.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Zurück
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <Card className="border border-border/60 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-yellow-400/80 to-yellow-500/40" />
          <CardHeader>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              Bewertung: {order.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Bitte bewerte jede Frage mit Sternen und einem Kommentar.
            </p>
          </CardHeader>
        </Card>
      </motion.div>

      {questions.map((q, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
        >
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground">
                Frage {i + 1}/{questions.length}: {q}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StarRating
                value={answers[i]?.rating ?? 0}
                onChange={(v) => updateAnswer(i, { rating: v })}
              />
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Dein Kommentar (Pflicht)
                </Label>
                <Textarea
                  placeholder="Beschreibe deine Erfahrung..."
                  value={answers[i]?.comment ?? ""}
                  onChange={(e) => updateAnswer(i, { comment: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
          {i < questions.length - 1 && <Separator className="my-2" />}
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 + questions.length * 0.05 }}
      >
        <Button
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          size="lg"
          className="w-full gap-2"
        >
          <Send className="h-4 w-4" />
          {submitting ? "Wird abgeschickt..." : "Bewertung abschicken"}
        </Button>
      </motion.div>
    </div>
  );
};

export default Bewertung;
