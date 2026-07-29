import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardRowProps {
  /** Leading slot: time, initials or icon */
  lead?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
}

export default function DashboardRow({ lead, title, subtitle, trailing, onClick }: DashboardRowProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-5 py-2.5 border-b border-border/60 last:border-0",
        onClick && "cursor-pointer hover:bg-muted/50 transition-colors"
      )}
    >
      {lead && (
        <div className="shrink-0 min-w-[52px] text-xs font-semibold text-muted-foreground tabular-nums">{lead}</div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
      {trailing && <div className="shrink-0 flex items-center gap-2">{trailing}</div>}
    </div>
  );
}
