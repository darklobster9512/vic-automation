import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useIdentInfoTemplates } from "@/components/admin/IdentInfoTemplateManager";

const DEFAULT_IDENT_FIELDS = ["Identcode", "Identlink", "Anmeldename", "Email", "Passwort"];
const BANK_IDENT_FIELDS: Array<{ keyword: string; fields: string[] }> = [
  { keyword: "deutsche bank", fields: ["Identlink", "Email"] },
  { keyword: "consorsbank", fields: ["Identlink", "Email"] },
  { keyword: "postbank", fields: ["Identlink", "Email"] },
  { keyword: "bbva", fields: ["Identlink", "Email", "Anmeldename", "Passwort"] },
  { keyword: "dkb", fields: ["Identlink", "Email"] },
];

const KNOWN_BANK_KEYWORDS = [
  "deutsche bank", "consorsbank", "postbank", "bbva", "dkb",
  "commerzbank", "sparkasse", "ing", "n26", "targobank", "hypovereinsbank",
  "raiffeisen", "volksbank", "santander", "comdirect",
];

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const normalizeName = (s: string) =>
  s.toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/).filter(Boolean);

function fieldsForOrder(order: any): string[] {
  const hay = normalize(`${order?.title ?? ""} ${order?.provider ?? ""}`);
  const match = BANK_IDENT_FIELDS.find((b) => hay.includes(b.keyword));
  return match ? match.fields : DEFAULT_IDENT_FIELDS;
}

function templateForOrder(order: any, templates: Array<{ id: string; name: string; content: string }> | undefined) {
  if (!templates?.length) return null;
  const hay = normalize(`${order?.title ?? ""} ${order?.provider ?? ""}`);
  const sorted = [...templates].sort((a, b) => b.name.length - a.name.length);
  return sorted.find((t) => {
    const n = normalize(t.name);
    return n.length > 1 && hay.includes(n);
  }) ?? null;
}

export interface ParsedBlock {
  headerName: string;
  bank: string | null;
  anosimLink: string | null;
  identLink: string | null;
  email: string | null;
}

export function parsePrepBlocks(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const parts = text.split(/^===\s*(.+?)\s*===\s*$/gm);
  // parts: [preface, name1, body1, name2, body2, ...]
  for (let i = 1; i < parts.length; i += 2) {
    const headerName = (parts[i] || "").trim();
    const body = parts[i + 1] || "";
    const lines = body.split(/\r?\n/).map((l) => l.trim());

    const anosimLink = lines.find((l) => /^https?:\/\/anosim\.net\//i.test(l)) || null;
    const identLink = lines.find((l) => /^https?:\/\/web-?id\./i.test(l)) || null;
    const email = (lines.find((l) => /@web\.de\b/i.test(l))?.match(/[\w.\-+]+@web\.de/i)?.[0]) || null;

    // Bank: die letzte reine Bank-Zeile suchen, die eines der bekannten Keywords enthält
    // und nicht mit "anosim" beginnt und keine URL/Email/Nummer ist
    let bank: string | null = null;
    for (const raw of lines) {
      const l = raw.trim();
      if (!l) continue;
      if (/^https?:\/\//i.test(l)) continue;
      if (/@/.test(l)) continue;
      if (/^anosim\b/i.test(l)) continue;
      if (/^nummer\s*:/i.test(l)) continue;
      if (/^\+?\d[\d\s]{5,}/.test(l)) continue;
      if (/ging nicht auf|funktioniert nicht|nicht möglich/i.test(l)) continue;
      const low = normalize(l);
      const kw = KNOWN_BANK_KEYWORDS.find((k) => low.includes(k));
      if (kw) bank = l;
    }

    blocks.push({ headerName, bank, anosimLink, identLink, email });
  }
  return blocks;
}

function normalizeAnosim(url: string | null): string | null {
  if (!url) return null;
  return url.trim().replace("/share/orderbooking?", "/api/v1/orderbookingshare?");
}

interface DayItem {
  item: any;
  firstName: string;
  lastName: string;
  displayEmail: string;
}

interface PreviewRow {
  appointmentId: string;
  time: string;
  employeeName: string;
  displayEmail: string;
  block: ParsedBlock | null;
  orderId: string | null;
  orderLabel: string | null;
  status: "ready" | "no_match" | "no_order" | "ambiguous" | "already_prepared";
  hasExisting: boolean;
  selected: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayLabel: string;
  dayItems: DayItem[];
  brandingId: string | null;
  existingPreps: Record<string, any>;
}

export default function BulkPrepImportDialog({
  open, onOpenChange, dayLabel, dayItems, brandingId, existingPreps,
}: Props) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"input" | "preview">("input");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    if (open) {
      setStep("input");
      setText("");
      setRows([]);
      setProgress(null);
    }
  }, [open]);

  const { data: orders = [] } = useQuery({
    queryKey: ["bankdrop-orders", brandingId],
    enabled: open,
    queryFn: async () => {
      let q = supabase.from("orders")
        .select("id, title, provider, order_number, order_type, is_starred, created_at")
        .eq("order_type", "bankdrop")
        .order("is_starred", { ascending: false })
        .order("title");
      if (brandingId) q = q.eq("branding_id", brandingId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: infoTemplates } = useIdentInfoTemplates(brandingId);

  const resolveOrder = (bank: string | null): { id: string; label: string } | null => {
    if (!bank) return null;
    const low = normalize(bank);
    const kw = KNOWN_BANK_KEYWORDS.find((k) => low.includes(k));
    if (!kw) return null;
    const candidates = (orders as any[]).filter((o) => {
      const hay = normalize(`${o.title ?? ""} ${o.provider ?? ""}`);
      return hay.includes(kw);
    });
    if (!candidates.length) return null;
    const starred = candidates.find((o) => o.is_starred);
    const chosen = starred ?? candidates[0];
    return {
      id: chosen.id,
      label: `${chosen.order_number ? `#${chosen.order_number} – ` : ""}${chosen.title}${chosen.provider ? ` (${chosen.provider})` : ""}`,
    };
  };

  const analyze = () => {
    const blocks = parsePrepBlocks(text);
    if (!blocks.length) {
      toast.error("Keine Blöcke im Text erkannt (=== Name === fehlt).");
      return;
    }

    // Matching: für jeden Termin passenden Block finden
    const usedBlockIndexes = new Set<number>();
    const preview: PreviewRow[] = dayItems.map((d) => {
      const apptName = `${d.firstName} ${d.lastName}`.trim();
      const apptTokens = normalizeName(apptName);
      const apptEmail = (d.displayEmail || "").toLowerCase();

      const matches: number[] = [];
      blocks.forEach((b, bi) => {
        if (usedBlockIndexes.has(bi)) return;
        const bTokens = normalizeName(b.headerName);
        if (apptTokens.length && bTokens.length) {
          const aContainsB = bTokens.every((t) => apptTokens.includes(t));
          const bContainsA = apptTokens.every((t) => bTokens.includes(t));
          if (aContainsB || bContainsA) { matches.push(bi); return; }
        }
        if (b.email && apptEmail && b.email.toLowerCase() === apptEmail) {
          matches.push(bi);
        }
      });

      let status: PreviewRow["status"] = "no_match";
      let block: ParsedBlock | null = null;
      if (matches.length === 1) {
        block = blocks[matches[0]];
        usedBlockIndexes.add(matches[0]);
      } else if (matches.length > 1) {
        status = "ambiguous";
      }

      const resolved = block ? resolveOrder(block.bank) : null;
      const hasExisting = !!existingPreps[d.item.id];

      if (block && !resolved) status = "no_order";
      else if (block && resolved) status = hasExisting ? "already_prepared" : "ready";

      return {
        appointmentId: d.item.id,
        time: (d.item.appointment_time || "").slice(0, 5),
        employeeName: apptName,
        displayEmail: d.displayEmail,
        block,
        orderId: resolved?.id ?? null,
        orderLabel: resolved?.label ?? null,
        status,
        hasExisting,
        selected: !!(block && resolved),
      };
    });

    // unbenutzte Blöcke als "orphan"-Rows anhängen
    blocks.forEach((b, bi) => {
      if (usedBlockIndexes.has(bi)) return;
      preview.push({
        appointmentId: `__orphan_${bi}`,
        time: "",
        employeeName: `⚠ ${b.headerName} (kein Termin)`,
        displayEmail: b.email ?? "",
        block: b,
        orderId: null,
        orderLabel: null,
        status: "no_match",
        hasExisting: false,
        selected: false,
      });
    });

    setRows(preview);
    setStep("preview");
  };

  const toggleRow = (i: number) => {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, selected: !r.selected } : r));
  };
  const toggleAll = (v: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: v && !!r.block && !!r.orderId && !r.appointmentId.startsWith("__orphan_") })));
  };

  const selectedRows = useMemo(
    () => rows.filter((r) => r.selected && r.block && r.orderId && !r.appointmentId.startsWith("__orphan_")),
    [rows]
  );

  const submit = async () => {
    if (!selectedRows.length) return;
    setSubmitting(true);
    setProgress({ done: 0, total: selectedRows.length });

    let successCount = 0;
    for (let i = 0; i < selectedRows.length; i++) {
      const r = selectedRows[i];
      try {
        const normalizedPhone = normalizeAnosim(r.block!.anosimLink);
        const order = (orders as any[]).find((o) => o.id === r.orderId);
        const fields = fieldsForOrder(order);
        const testData = fields.map((label) => {
          const lc = label.toLowerCase();
          if (lc === "identlink") return { label, value: r.block!.identLink ?? "" };
          if (lc === "email") return { label, value: r.block!.email ?? "" };
          return { label, value: "" };
        });

        // existing prep laden um info_notes / contract_id zu bewahren
        const existing = existingPreps[r.appointmentId];
        let infoNotes: string = existing?.info_notes ?? "";
        if (!infoNotes.trim()) {
          const tpl = templateForOrder(order, infoTemplates as any);
          if (tpl) infoNotes = (infoTemplates?.find((t) => t.id === tpl.id) as any)?.content ?? "";
        }

        // contract_id aus dayItems ableiten
        const dayItem = dayItems.find((d) => d.item.id === r.appointmentId);
        const contractId = dayItem?.item.employment_contracts?.id ?? dayItem?.item.contract_id ?? null;

        const payload: any = {
          appointment_id: r.appointmentId,
          contract_id: contractId,
          order_id: r.orderId,
          branding_id: brandingId,
          phone_api_url: normalizedPhone,
          test_data: testData,
          info_notes: infoNotes,
          status: existing?.status === "started" ? "started" : "prepared",
        };

        const { error } = await supabase
          .from("first_workday_preparations" as any)
          .upsert(payload, { onConflict: "appointment_id" });
        if (error) throw error;

        // Anosim-Nummer in phone_numbers hinterlegen
        if (normalizedPhone && brandingId) {
          const { data: existingPhones } = await supabase
            .from("phone_numbers" as any)
            .select("id")
            .eq("branding_id", brandingId)
            .eq("api_url", normalizedPhone)
            .limit(1);
          if (!existingPhones || existingPhones.length === 0) {
            await supabase.from("phone_numbers" as any).insert({
              provider: "anosim",
              api_url: normalizedPhone,
              branding_id: brandingId,
            } as any);
          }
        }

        successCount++;
      } catch (e: any) {
        console.error("Bulk prep upsert failed", r.appointmentId, e);
      }
      setProgress({ done: i + 1, total: selectedRows.length });
    }

    setSubmitting(false);
    toast.success(`${successCount} von ${selectedRows.length} Vorbereitungen übernommen.`);
    queryClient.invalidateQueries({ queryKey: ["first-workday-preparations"] });
    queryClient.invalidateQueries({ queryKey: ["phone_numbers"] });
    onOpenChange(false);
  };

  const statusBadge = (r: PreviewRow) => {
    if (r.appointmentId.startsWith("__orphan_")) return <Badge variant="destructive">Kein Termin</Badge>;
    switch (r.status) {
      case "ready": return <Badge className="bg-green-600 text-white">Bereit</Badge>;
      case "no_match": return <Badge variant="outline">Kein Match</Badge>;
      case "no_order": return <Badge variant="destructive">Auftrag fehlt</Badge>;
      case "ambiguous": return <Badge variant="destructive">Mehrdeutig</Badge>;
      case "already_prepared": return <Badge className="bg-amber-500 text-white">Überschreiben</Badge>;
    }
  };

  const readyCount = rows.filter((r) => r.selected).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vorbereitung importieren — {dayLabel}</DialogTitle>
          <DialogDescription>
            Freitext-Blöcke einfügen, analysieren, kontrollieren, übernehmen. Nur Auftrag, Anosim-Link, Ident-Email und Identlink werden gesetzt.
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-3">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"=== Max Mustermann ===\n08:00 Uhr (LIMEX)\n...\nDeutsche Bank\nhttps://web-id.limex.solutions/...\nhttps://anosim.net/api/v1/orderbookingshare?token=..."}
              className="min-h-[400px] font-mono text-xs"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
              <Button onClick={analyze} disabled={!text.trim()}>Analysieren</Button>
            </DialogFooter>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Button size="sm" variant="outline" onClick={() => toggleAll(true)}>Alle bereit auswählen</Button>
              <Button size="sm" variant="outline" onClick={() => toggleAll(false)}>Nichts</Button>
              <span className="text-muted-foreground ml-auto">{readyCount} ausgewählt</span>
            </div>

            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="p-2 w-8"></th>
                    <th className="p-2">Uhrzeit</th>
                    <th className="p-2">Mitarbeiter</th>
                    <th className="p-2">Auftrag</th>
                    <th className="p-2">Anosim</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Identlink</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.appointmentId} className="border-t align-top">
                      <td className="p-2">
                        <Checkbox
                          checked={r.selected}
                          disabled={!r.block || !r.orderId || r.appointmentId.startsWith("__orphan_")}
                          onCheckedChange={() => toggleRow(i)}
                        />
                      </td>
                      <td className="p-2 font-medium">{r.time}</td>
                      <td className="p-2">{r.employeeName}</td>
                      <td className="p-2">{r.orderLabel ?? <span className="text-destructive">{r.block?.bank ?? "—"}</span>}</td>
                      <td className="p-2 text-muted-foreground truncate max-w-[120px]" title={r.block?.anosimLink ?? ""}>
                        {r.block?.anosimLink ? "✓" : "—"}
                      </td>
                      <td className="p-2 text-muted-foreground truncate max-w-[160px]">{r.block?.email ?? "—"}</td>
                      <td className="p-2 text-muted-foreground truncate max-w-[120px]" title={r.block?.identLink ?? ""}>
                        {r.block?.identLink ? "✓" : "—"}
                      </td>
                      <td className="p-2">{statusBadge(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {progress && (
              <div className="text-xs text-muted-foreground">
                Fortschritt: {progress.done} / {progress.total}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("input")} disabled={submitting}>Zurück</Button>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Abbrechen</Button>
              <Button onClick={submit} disabled={submitting || readyCount === 0}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Ausgewählte übernehmen ({readyCount})
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
