import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";
import { useNavigate } from "react-router-dom";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  waiting: { label: "Wartet", className: "text-amber-600 border-amber-300 bg-amber-50" },
  data_sent: { label: "Daten gesendet", className: "text-blue-600 border-blue-300 bg-blue-50" },
};

export default function WaitingIdents() {
  const { activeBrandingId, ready } = useBrandingFilter();
  const navigate = useNavigate();

  const { data: sessions } = useQuery({
    queryKey: ["waiting-idents", activeBrandingId],
    enabled: ready,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ident_sessions")
        .select("id, status, created_at, contract_id, employment_contracts!inner(first_name, last_name, branding_id)")
        .in("status", ["waiting", "data_sent"])
        .eq("employment_contracts.branding_id", activeBrandingId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.35 }}
      className="mb-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <Video className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">Wartende Ident-Sessions</h3>
      </div>

      {!sessions?.length ? (
        <p className="text-sm text-muted-foreground">Keine wartenden Ident-Sessions.</p>
      ) : (
        <ScrollArea className="max-h-[220px]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3 pb-3">
            {sessions.map((item: any) => {
              const style = STATUS_STYLES[item.status] ?? STATUS_STYLES.waiting;
              return (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  onClick={() => navigate(`/admin/idents/${item.id}`)}
                >
                  <CardContent className="p-4 space-y-1.5">
                    <p className="font-medium text-sm text-foreground leading-tight">
                      {item.employment_contracts?.first_name} {item.employment_contracts?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(item.created_at), "dd. MMM yyyy", { locale: de })}
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
