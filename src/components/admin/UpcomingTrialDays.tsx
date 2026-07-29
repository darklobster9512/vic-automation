import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  ausstehend: { label: "Ausstehend", className: "text-amber-600 border-amber-300 bg-amber-50" },
  neu: { label: "Neu", className: "text-blue-600 border-blue-300 bg-blue-50" },
  erschienen: { label: "Erschienen", className: "text-green-600 border-green-300 bg-green-50" },
  nicht_erschienen: { label: "Nicht erschienen", className: "text-red-600 border-red-300 bg-red-50" },
  erfolgreich: { label: "Erfolgreich", className: "text-emerald-600 border-emerald-300 bg-emerald-50" },
  abgelehnt: { label: "Abgelehnt", className: "text-red-600 border-red-300 bg-red-50" },
};

export default function UpcomingTrialDays() {
  const today = new Date().toISOString().split("T")[0];
  const { activeBrandingId, ready } = useBrandingFilter();

  const { data: upcoming } = useQuery({
    queryKey: ["upcoming-trial-days", today, activeBrandingId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trial_day_appointments")
        .select("id, appointment_date, appointment_time, status, applications!inner(first_name, last_name, branding_id)")
        .eq("applications.branding_id", activeBrandingId!)
        .gte("appointment_date", today)
        .order("appointment_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.35 }}
      className="mb-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">Anstehende Probetag-Termine</h3>
      </div>

      {!upcoming?.length ? (
        <p className="text-sm text-muted-foreground">Keine anstehenden Probetag-Termine.</p>
      ) : (
        <ScrollArea className="max-h-[220px]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3 pb-3">
            {upcoming.map((item: any) => {
              const style = STATUS_STYLES[item.status] ?? STATUS_STYLES.ausstehend;
              return (
                <Card key={item.id}>
                  <CardContent className="p-4 space-y-1.5">
                    <p className="font-medium text-sm text-foreground leading-tight">
                      {item.applications?.first_name} {item.applications?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(item.appointment_date), "dd. MMMM yyyy", { locale: de })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.appointment_time?.slice(0, 5)} Uhr
                    </p>
                    <Badge variant="outline" className={style.className}>
                      {style.label}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </motion.div>
  );
}
