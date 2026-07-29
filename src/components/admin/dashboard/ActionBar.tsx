import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LucideIcon } from "lucide-react";

export interface ActionItem {
  label: string;
  count: number;
  link: string;
  icon: LucideIcon;
  color: string;
}

export default function ActionBar({ items }: { items: ActionItem[] }) {
  const navigate = useNavigate();
  const visible = items.filter((i) => (i.count ?? 0) > 0);
  if (!visible.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-wrap items-center gap-2 mb-6"
    >
      {visible.map((i) => (
        <button
          key={i.label}
          onClick={() => navigate(i.link)}
          className="group flex items-center gap-2 rounded-full border border-border bg-card pl-2.5 pr-3.5 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:shadow-sm transition-all"
        >
          <span
            className="flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold text-primary-foreground"
            style={{ background: i.color }}
          >
            {i.count > 99 ? "99+" : i.count}
          </span>
          <i.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          {i.label}
        </button>
      ))}
    </motion.div>
  );
}
