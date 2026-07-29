import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Rocket, Clock, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type StarterJobPhase =
  | "todo"
  | "review_pending"
  | "contract_todo"
  | "contract_pending"
  | "done";

const StarterJobNotice = ({ phase }: { phase: StarterJobPhase }) => {
  const navigate = useNavigate();

  if (phase === "done") return null;

  const config = {
    todo: {
      accent: "border-l-primary",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      Icon: Rocket,
      title: "Starterjobs",
      lines: [
        "Erledige beide Starterjobs bitte innerhalb der nächsten 48 Stunden, damit wir deine Arbeitsweise und Fähigkeiten kurz einschätzen können. Die Bearbeitung dauert insgesamt ca. 25–35 Minuten.",
        "Nach Abschluss und Prüfung erhältst du von uns per E-Mail oder telefonisch eine Rückmeldung zu den nächsten Schritten.",
        "Bitte stelle sicher, dass wir dich sowohl per E-Mail als auch telefonisch erreichen können.",
      ],
      action: null as null | { label: string; to: string },
    },
    review_pending: {
      accent: "border-l-blue-500",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      Icon: Clock,
      title: "Starterjobs in Prüfung",
      lines: [
        "Vielen Dank – deine Bewertungen zu den Starterjobs sind bei uns eingegangen.",
        "Unser Team prüft deine Ergebnisse jetzt sorgfältig und meldet sich in Kürze bei dir. Bitte halte dich in dieser Zeit per E-Mail und telefonisch erreichbar.",
      ],
      action: null,
    },
    contract_todo: {
      accent: "border-l-amber-500",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      Icon: FileText,
      title: "Starterjobs bestanden – jetzt Vertragsdaten ausfüllen",
      lines: [
        "Herzlichen Glückwunsch, deine Starterjobs wurden erfolgreich geprüft.",
        "Als nächsten Schritt fülle bitte deine Arbeitsvertragsdaten aus, damit wir deinen Arbeitsvertrag erstellen können.",
      ],
      action: { label: "Vertragsdaten ausfüllen", to: "/mitarbeiter/arbeitsvertrag" },
    },
    contract_pending: {
      accent: "border-l-blue-500",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      Icon: Clock,
      title: "Arbeitsvertrag in Prüfung",
      lines: [
        "Deine Vertragsdaten sind bei uns eingegangen und werden aktuell geprüft.",
        "Sobald alles bestätigt ist, informieren wir dich per E-Mail über die nächsten Schritte.",
      ],
      action: null,
    },
  }[phase];

  const { Icon } = config;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-5"
    >
      <Card className={`border-l-4 ${config.accent} bg-background shadow-md rounded-2xl`}>
        <CardContent className="py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${config.iconBg} shrink-0`}>
              <Icon className={`h-5 w-5 ${config.iconColor}`} />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-semibold text-foreground text-sm">{config.title}</h3>
              {config.lines.map((line) => (
                <p key={line} className="text-sm text-muted-foreground leading-relaxed">
                  {line}
                </p>
              ))}
            </div>
          </div>
          {config.action && (
            <Button size="sm" className="rounded-xl shrink-0" onClick={() => navigate(config.action!.to)}>
              {config.action.label}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default StarterJobNotice;
