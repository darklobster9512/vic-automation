import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Eye, RefreshCw, Loader2, Plus, ArrowDownRight } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface AnosimSms {
  messageSender: string;
  messageDate: string;
  messageText: string;
}

interface AnosimData {
  number: string;
  sms: AnosimSms[];
}

interface PhoneEntry {
  id: string;
  api_url: string | null;
  provider: "anosim" | "smsbot";
  rental_id: string | null;
}

async function fetchPhoneData(entry: PhoneEntry): Promise<AnosimData> {
  if (entry.provider === "smsbot") {
    const { data, error } = await supabase.functions.invoke("smsbot-proxy", {
      body: { rentalId: entry.rental_id },
    });
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.functions.invoke("anosim-proxy", {
    body: { url: entry.api_url },
  });
  if (error) throw error;
  return data;
}

interface SmsWatchProps {
  contractId: string | null;
  onTanCodeExtracted?: (code: string) => void;
}

function extractTanCode(text: string): string | null {
  const patterns = [
    /(?:code|tan|pin|ident|clave)[\s\-:]*(?:\w+[\s\-:]+)?(\d{4,8})/i,
    /(\d{4,8})\s*\.?\s*$/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1];
  }
  return null;
}

export function SmsWatch({ contractId, onTanCodeExtracted }: SmsWatchProps) {
  const selectionsRef = useRef(new Map<string, PhoneEntry>());
  const selectedEntry = contractId ? selectionsRef.current.get(contractId) ?? null : null;
  const [, forceUpdate] = useState(0);
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: anosimEntries = [] } = useQuery<PhoneEntry[]>({
    queryKey: ["phone_numbers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("phone_numbers")
        .select("id, api_url, provider, rental_id")
        .eq("provider", "anosim")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as PhoneEntry[];
    },
  });

  const { data: smsbotEntries = [] } = useQuery<PhoneEntry[]>({
    queryKey: ["smsbot_rentals"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("smsbot-proxy", { body: { action: "list" } });
      if (error) throw error;
      const list = (data as any[]) ?? [];
      return list.map((r) => ({
        id: `smsbot-${r.rentalId}`,
        api_url: null,
        provider: "smsbot" as const,
        rental_id: r.rentalId as string,
      }));
    },
  });

  const entries = [...anosimEntries, ...smsbotEntries];

  const { data: anosimData, isLoading } = useQuery<AnosimData>({
    queryKey: ["sms-watch", selectedEntry?.id],
    queryFn: () => fetchPhoneData(selectedEntry!),
    enabled: !!selectedEntry,
    refetchInterval: 5000,
  });

  const addMutation = useMutation({
    mutationFn: async (apiUrl: string) => {
      const { error } = await supabase.from("phone_numbers").insert({ api_url: apiUrl });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone_numbers"] });
      setNewUrl("");
      toast({ title: "Hinzugefügt", description: "Telefonnummer wurde hinzugefügt." });
    },
    onError: () => toast({ title: "Fehler", variant: "destructive" }),
  });

  const sortedSms = anosimData?.sms
    ? [...anosimData.sms]
        .sort((a, b) => new Date(b.messageDate).getTime() - new Date(a.messageDate).getTime())
        .slice(0, 10)
    : [];

  const latestSms = sortedSms[0];
  const newCount = sortedSms.length - lastSeenCount;

  useEffect(() => {
    if (open && sortedSms.length > 0) {
      setLastSeenCount(sortedSms.length);
    }
  }, [open, sortedSms.length]);

  const handleSelectEntry = (entry: PhoneEntry) => {
    if (contractId) {
      selectionsRef.current.set(contractId, entry);
      forceUpdate((n) => n + 1);
    }
    setLastSeenCount(0);
  };

  const handleChangeNumber = () => {
    if (contractId) {
      selectionsRef.current.delete(contractId);
      forceUpdate((n) => n + 1);
    }
    setLastSeenCount(0);
  };
  const handleAddUrl = () => {
    const trimmed = newUrl.trim();
    const lower = trimmed.toLowerCase();
    if (!lower.includes("anosim.net/api/v1/orderbookingshare?token=") && !lower.includes("anosim.net/share/orderbooking?token=")) {
      toast({ title: "Ungültiger Link", description: "Muss ein anosim.net Share-Link sein.", variant: "destructive" });
      return;
    }
    const apiUrl = trimmed.replace("/share/orderbooking?", "/api/v1/orderbookingshare?");
    addMutation.mutate(apiUrl);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-auto min-h-9 py-1.5 gap-2 relative max-w-md text-left">
          <div className="relative shrink-0">
            <Eye className="h-4 w-4 shrink-0" />
            {selectedEntry && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            )}
          </div>
          {latestSms ? (
            <span className="line-clamp-2 whitespace-normal text-xs font-normal opacity-70">
              {latestSms.messageText}
            </span>
          ) : (
            <span className="text-xs hidden sm:inline">SMS Watch</span>
          )}
          {newCount > 0 && !open && (
            <Badge className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 text-[10px] bg-destructive text-destructive-foreground">
              {newCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        {!selectedEntry ? (
          <div className="p-3 space-y-3">
            <p className="text-sm font-medium">Telefonnummer wählen</p>
            {entries.length === 0 ? (
              <p className="text-xs text-muted-foreground">Keine Nummern vorhanden.</p>
            ) : (
              <div className="space-y-1">
                {entries.map((entry) => (
                  <PhoneOption key={entry.id} entry={entry} onSelect={handleSelectEntry} />
                ))}
              </div>
            )}
            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Neue Nummer hinzufügen</p>
              <div className="flex gap-1.5">
                <Input
                  placeholder="anosim.net Share-Link…"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
                  className="h-8 text-xs"
                />
                <Button size="sm" className="h-8 px-2 shrink-0" onClick={handleAddUrl} disabled={addMutation.isPending}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-sm font-medium">{anosimData?.number || "Laden…"}</span>
                {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleChangeNumber}>
                <RefreshCw className="h-3 w-3" /> Ändern
              </Button>
            </div>
            <ScrollArea className="h-72">
              {sortedSms.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground">Keine SMS empfangen.</p>
              ) : (
                <div className="p-2 space-y-1.5">
                  {sortedSms.map((sms, i) => (
                    <div
                      key={i}
                      className={`rounded-md border p-2 text-xs transition-colors ${
                        i === 0
                          ? "border-primary/40 bg-primary/5"
                          : "bg-background"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-medium">{sms.messageSender}</span>
                        <span className="text-muted-foreground text-[10px]">
                          {format(new Date(sms.messageDate), "dd.MM. HH:mm")}
                        </span>
                      </div>
                      <p className="text-foreground leading-snug">{sms.messageText}</p>
                      {(() => {
                        const tanCode = extractTanCode(sms.messageText);
                        if (!tanCode || !onTanCodeExtracted) return null;
                        return (
                          <div className="flex justify-end mt-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); onTanCodeExtracted(tanCode); }}
                              className="h-6 w-6 rounded flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              title={`Code ${tanCode} einfügen`}
                            >
                              <ArrowDownRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function PhoneOption({ entry, onSelect }: { entry: PhoneEntry; onSelect: (e: PhoneEntry) => void }) {
  const { data, isLoading } = useQuery<AnosimData>({
    queryKey: ["phone-data", entry.provider, entry.provider === "smsbot" ? entry.rental_id : entry.api_url],
    queryFn: () => fetchPhoneData(entry),
  });

  return (
    <button
      onClick={() => onSelect(entry)}
      className="w-full text-left rounded-md border px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between"
    >
      {isLoading ? (
        <span className="text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Laden…</span>
      ) : (
        <span>{data?.number || "Unbekannt"}</span>
      )}
    </button>
  );
}
