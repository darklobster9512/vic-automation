import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock } from "lucide-react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  offen: { label: "Offen", className: "text-muted-foreground border-border" },
  eingereicht: { label: "Eingereicht", className: "text-blue-600 border-blue-300 bg-blue-50" },
  genehmigt: { label: "Genehmigt", className: "text-orange-600 border-orange-300 bg-orange-50" },
  unterzeichnet: { label: "Unterzeichnet", className: "text-green-600 border-green-300 bg-green-50" },
};

export default function UpcomingStartDates() {
  const today = new Date().toISOString().split("T")[0];
  const { activeBrandingId, ready } = useBrandingFilter();

  const { data: upcoming } = useQuery({
    queryKey: ["upcoming-start-dates", today, activeBrandingId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employment_contracts")
        .select("id, first_name, last_name, status, desired_start_date, application_id, branding_id")
        .eq("branding_id", activeBrandingId!)
        .gte("desired_start_date", today)
        .order("desired_start_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.35 }}
      className="mb-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">Anstehende Startdaten</h3>
      </div>

      {!upcoming?.length ? (
        <p className="text-sm text-muted-foreground">Keine anstehenden Startdaten.</p>
      ) : (
        <ScrollArea className="max-h-[220px]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3 pb-3">
            {upcoming.map((item: any) => {
              const style = STATUS_STYLES[item.status] ?? STATUS_STYLES.offen;
              const branding = (item as any).applications?.brandings?.company_name;
              return (
                <Card key={item.id}>
                  <CardContent className="p-4 space-y-1.5">
                    <p className="font-medium text-sm text-foreground leading-tight">
                      {item.first_name} {item.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(item.desired_start_date), "dd. MMMM yyyy", { locale: de })}
                    </p>
                    <Badge variant="outline" className={style.className}>
                      {style.label}
                    </Badge>
                    {branding && (
                      <p className="text-xs text-muted-foreground truncate">{branding}</p>
                    )}
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
