import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Headphones, Loader2 } from "lucide-react";

interface Props {
  brandingId: string;
}

export default function CallerAccessOverview({ brandingId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["caller-access-overview", brandingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caller_api_keys")
        .select("id,label,slots,is_active")
        .eq("branding_id", brandingId)
        .order("label");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!brandingId,
  });

  const rows = (data as any[]) ?? [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Headphones className="h-4 w-4 mr-1" />
          Caller-Zugänge{!isLoading && ` (${rows.length})`}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <p className="text-sm font-semibold mb-2">Caller-Zugänge</p>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Lädt…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Keine Caller-Zugänge für dieses Branding.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className={`flex items-center justify-between gap-2 ${row.is_active ? "" : "opacity-50"}`}
              >
                <span className="text-sm font-medium truncate">{row.label}</span>
                <span className="flex items-center gap-1 shrink-0">
                  {(row.slots ?? []).length === 0 ? (
                    <span className="text-xs text-muted-foreground">kein Slot</span>
                  ) : (
                    (row.slots as number[]).map((n) => (
                      <Badge key={n} variant="secondary" className="px-1.5 py-0 text-[11px]">
                        Slot {n}
                      </Badge>
                    ))
                  )}
                  {!row.is_active && (
                    <Badge variant="outline" className="px-1.5 py-0 text-[11px]">
                      inaktiv
                    </Badge>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
