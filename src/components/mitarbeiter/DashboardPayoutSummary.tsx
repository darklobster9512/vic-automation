import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarDays, Euro, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { computeNextPayout } from "@/lib/computeNextPayout";

interface Props {
  balance: number;
  isFixedSalary?: boolean;
  startDate?: string | null;
  firstWorkdayDate?: string | null;
  desiredStartDate?: string | null;
}

const DashboardPayoutSummary = ({ balance, isFixedSalary, startDate, firstWorkdayDate, desiredStartDate }: Props) => {
  const navigate = useNavigate();
  const nextPayout = computeNextPayout({
    firstWorkdayDate,
    desiredStartDate,
    submittedAt: startDate,
  });


  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.78, ease: "easeOut" }}
    >
      <Card className="bg-white border border-border/40 shadow-md rounded-2xl hover:shadow-lg transition-all duration-200 h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-foreground">Gehaltsauszahlung</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/mitarbeiter/meine-daten")}
            >
              Details
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div className="flex items-center gap-3 py-2 border-b border-border/20">
              <div className="w-8 h-8 rounded-lg bg-primary shadow-md shadow-primary/20 flex items-center justify-center shrink-0">
                <CalendarDays className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Nächste Auszahlung</p>
                <p className="text-sm font-medium text-foreground">
                  {format(nextPayout, "d. MMMM yyyy", { locale: de })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-2">
              <div className="w-8 h-8 rounded-lg bg-primary shadow-md shadow-primary/20 flex items-center justify-center shrink-0">
                <Euro className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{balance > 0 ? (isFixedSalary ? "Festgehalt" : "Voraussichtlicher Betrag") : "Noch kein Vertrag zugewiesen"}</p>
                <p className="text-lg font-bold text-primary">{balance > 0 ? `${balance.toFixed(2)} €` : "–"}</p>

              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DashboardPayoutSummary;
