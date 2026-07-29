import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  text: string;
}

export default function EmptyState({ icon: Icon, text }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted mb-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
