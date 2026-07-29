import { ReactNode, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface DashboardTab {
  id: string;
  label: string;
  count?: number;
  content: ReactNode;
  /** Link target for the "Alle ansehen" action of this tab */
  link?: string;
}

interface DashboardSectionProps {
  title: string;
  icon?: React.ElementType;
  tabs: DashboardTab[];
  delay?: number;
  className?: string;
}

export default function DashboardSection({ title, icon: Icon, tabs, delay = 0, className }: DashboardSectionProps) {
  const [active, setActive] = useState(tabs[0]?.id);
  const navigate = useNavigate();
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={cn("h-full", className)}
    >
      <Card className="h-full flex flex-col overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2 mr-auto">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          </div>

          {tabs.length > 1 && (
            <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActive(t.id)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                    t.id === current?.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                  {typeof t.count === "number" && t.count > 0 && (
                    <span className="ml-1.5 text-[10px] font-semibold text-muted-foreground">{t.count}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {current?.link && (
            <button
              onClick={() => navigate(current.link!)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Alle ansehen
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>

        <CardContent className="p-0 flex-1">{current?.content}</CardContent>
      </Card>
    </motion.div>
  );
}
