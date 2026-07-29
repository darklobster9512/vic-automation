import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export interface Metric {
  label: string;
  value?: number;
  loading?: boolean;
  link: string;
  color: string;
}

interface MetricListProps {
  metrics: Metric[];
  delay?: number;
}

export default function MetricList({ metrics, delay = 0 }: MetricListProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="h-full"
    >
      <Card className="h-full overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Kennzahlen</h3>
        </div>
        <div>
          {metrics.map((m) => (
            <button
              key={m.label}
              onClick={() => navigate(m.link)}
              className="w-full flex items-center gap-3 px-5 py-3 border-b border-border/60 last:border-0 hover:bg-muted/50 transition-colors text-left"
            >
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: m.color }} />
              <span className="flex-1 text-sm text-muted-foreground truncate">{m.label}</span>
              {m.loading ? (
                <Skeleton className="h-5 w-8" />
              ) : (
                <span className="text-lg font-bold text-foreground tabular-nums">{m.value ?? 0}</span>
              )}
            </button>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
