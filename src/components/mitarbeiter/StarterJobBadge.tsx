import { Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const StarterJobBadge = ({ className = "" }: { className?: string }) => (
  <Badge
    variant="outline"
    className={`text-[11px] rounded-full border-primary/30 bg-primary/10 text-primary font-medium ${className}`}
  >
    <Rocket className="h-3 w-3 mr-1" />
    Starterjob
  </Badge>
);

export default StarterJobBadge;
