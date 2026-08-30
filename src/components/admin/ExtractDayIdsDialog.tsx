import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, CheckCircle2, XCircle, IdCard } from "lucide-react";
import { toast } from "sonner";
import { extractIdData } from "@/lib/extractIdData";

export interface ExtractDayEntry {
  /** Anzeigename des Mitarbeiters */
  name: string;
  /** Vertragsdaten für Extraktion + Abweichungsprüfung */
  contract: any | null;
  appointmentTime?: string | null;
  brandingName?: string | null;
}

type EntryState = "pending" | "loading" | "done" | "error" | "skipped";

interface EntryResult {
  state: EntryState;
  text?: string;
  error?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayLabel: string;
  entries: ExtractDayEntry[];
}

export default function ExtractDayIdsDialog({ open, onOpenChange, dayLabel, entries }: Props) {
  const [results, setResults] = useState<Record<number, EntryResult>>({});
  const [currentIndex, setCurrentIndex] = useState(-1);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    cancelledRef.current = false;
    setResults({});
    setCurrentIndex(-1);

    const run = async () => {
      for (let i = 0; i < entries.length; i++) {
        if (cancelledRef.current) return;
        setCurrentIndex(i);
        const entry = entries[i];
        const c = entry.contract;
        if (!c || !c.id_front_url) {
          setResults((prev) => ({
            ...prev,
            [i]: { state: "skipped", error: "Kein Ausweis hinterlegt" },
          }));
          continue;
        }
        setResults((prev) => ({ ...prev, [i]: { state: "loading" } }));
        try {
          const text = await extractIdData(c, {
            appointmentTime: entry.appointmentTime,
            brandingName: entry.brandingName,
          });
          if (cancelledRef.current) return;
          setResults((prev) => ({ ...prev, [i]: { state: "done", text } }));
        } catch (e: any) {
          if (cancelledRef.current) return;
          setResults((prev) => ({
            ...prev,
            [i]: { state: "error", error: e?.message || "Extraktion fehlgeschlagen" },
          }));
        }
        // Rate-Limit schonen
        await new Promise((r) => setTimeout(r, 500));
      }
    };
    run();

    return () => {
      cancelledRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const doneCount = entries.filter((_, i) => results[i]?.state === "done").length;
  const finished = entries.length > 0 && entries.every((_, i) => results[i] && results[i].state !== "loading" && results[i].state !== "pending") ;

  const copyAll = () => {
    const parts: string[] = [];
    entries.forEach((entry, i) => {
      const r = results[i];
      if (r?.state === "done" && r.text) {
        parts.push(`=== ${entry.name} ===\n${r.text}`);
      }
    });
    if (!parts.length) {
      toast.error("Keine extrahierten Daten vorhanden.");
      return;
    }
    navigator.clipboard.writeText(parts.join("\n\n"));
    toast.success("Alle Ausweisdaten kopiert!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IdCard className="h-5 w-5" /> Ausweisdaten – {dayLabel}
          </DialogTitle>
          <DialogDescription>
            {finished
              ? `${doneCount} von ${entries.length} Mitarbeitern extrahiert.`
              : `Extrahiere… ${doneCount} von ${entries.length} abgeschlossen.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {entries.map((entry, i) => {
            const r = results[i];
            const isActive = i === currentIndex && (!r || r.state === "loading" || r.state === "pending");
            return (
              <div key={i} className="border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  {r?.state === "done" && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
                  {r?.state === "error" && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                  {r?.state === "skipped" && <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />}
                  {(isActive || r?.state === "loading") && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
                  <span className="font-medium text-sm">{entry.name}</span>
                  {entry.contract && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-auto"
                      disabled={!r?.text}
                      title="Kopieren"
                      onClick={() => {
                        navigator.clipboard.writeText(r?.text || "");
                        toast.success("Kopiert!");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {r?.state === "done" && r.text && (
                  <pre className="text-xs whitespace-pre-wrap bg-muted/40 rounded-lg p-3 font-sans">{r.text}</pre>
                )}
                {(r?.state === "error" || r?.state === "skipped") && (
                  <p className="text-xs text-muted-foreground">{r.error}</p>
                )}
                {!r && <p className="text-xs text-muted-foreground">Wartet…</p>}
              </div>
            );
          })}
          {!entries.length && (
            <p className="text-sm text-muted-foreground text-center py-6">Keine Termine an diesem Tag.</p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Schließen</Button>
          <Button onClick={copyAll} disabled={doneCount === 0}>
            <Copy className="h-4 w-4 mr-2" /> Alle kopieren
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
