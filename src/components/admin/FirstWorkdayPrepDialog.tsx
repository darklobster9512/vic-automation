import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ChevronsUpDown, Loader2, Phone, Plus, Save, X } from "lucide-react";
import IdentInfoTemplateManager, { useIdentInfoTemplates } from "@/components/admin/IdentInfoTemplateManager";
import { toast } from "sonner";

export const DEFAULT_IDENT_FIELDS = ["Identcode", "Identlink", "Anmeldename", "Email", "Passwort"];

export interface PrepRow {
  id: string;
  appointment_id: string;
  contract_id: string | null;
  order_id: string | null;
  branding_id: string | null;
  phone_api_url: string | null;
  test_data: Array<{ label: string; value: string }>;
  info_notes: string | null;
  status: string;
  started_at: string | null;
}

export function useFirstWorkdayPreparations(appointmentIds: string[]) {
  return useQuery({
    queryKey: ["first-workday-preparations", appointmentIds.length],
    enabled: appointmentIds.length > 0,
    queryFn: async () => {
      const map: Record<string, PrepRow> = {};
      const CHUNK = 100;
      for (let i = 0; i < appointmentIds.length; i += CHUNK) {
        const { data, error } = await supabase
          .from("first_workday_preparations" as any)
          .select("*")
          .in("appointment_id", appointmentIds.slice(i, i + CHUNK));
        if (error) throw error;
        for (const row of ((data as any[]) ?? [])) {
          map[row.appointment_id] = {
            ...row,
            test_data: Array.isArray(row.test_data) ? row.test_data : [],
          } as PrepRow;
        }
      }
      return map;
    },
  });
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  contractId: string | null;
  brandingId: string | null;
  employeeName: string;
  existing?: PrepRow | null;
}

export function usePhonePicker(brandingId: string | null) {
  const { data: phoneEntries = [] } = useQuery({
    queryKey: ["phone_numbers", brandingId],
    queryFn: async () => {
      let q = supabase.from("phone_numbers").select("id, api_url").order("created_at", { ascending: false });
      if (brandingId) q = q.eq("branding_id", brandingId);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: smsbotRentals = [] } = useQuery<Array<{ rentalId: string; number: string; service: string; country: string }>>({
    queryKey: ["smsbot_rentals", brandingId],
    enabled: !!brandingId,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("smsbot-proxy", { body: { action: "list", brandingId } });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const [phoneDisplayMap, setPhoneDisplayMap] = useState<Record<string, string>>({});
  useEffect(() => {
    phoneEntries.forEach(async (entry: any) => {
      if (!entry.api_url || phoneDisplayMap[entry.api_url]) return;
      try {
        const { data } = await supabase.functions.invoke("anosim-proxy", { body: { url: entry.api_url } });
        if (data?.number) setPhoneDisplayMap((prev) => ({ ...prev, [entry.api_url]: data.number }));
      } catch {}
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneEntries]);

  const resolveDisplayNumber = (identifier: string | null | undefined): string | undefined => {
    if (!identifier) return undefined;
    if (identifier.startsWith("smsbot://")) {
      const rentalId = identifier.slice("smsbot://".length);
      return smsbotRentals.find((r) => r.rentalId === rentalId)?.number;
    }
    return phoneDisplayMap[identifier];
  };

  return { phoneEntries, smsbotRentals, resolveDisplayNumber, phoneDisplayMap };
}

export default function FirstWorkdayPrepDialog({
  open, onOpenChange, appointmentId, contractId, brandingId, employeeName, existing,
}: Props) {
  const queryClient = useQueryClient();
  const [orderId, setOrderId] = useState<string>(existing?.order_id ?? "");
  const [provider, setProvider] = useState<"anosim" | "smsbot">(
    (existing?.phone_api_url ?? "").startsWith("smsbot://") ? "smsbot" : "anosim"
  );
  const [phoneUrl, setPhoneUrl] = useState(existing?.phone_api_url ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [testData, setTestData] = useState<Array<{ label: string; value: string }>>(
    existing?.test_data?.length ? existing.test_data : DEFAULT_IDENT_FIELDS.map((f) => ({ label: f, value: "" }))
  );
  const [infoNotes, setInfoNotes] = useState(existing?.info_notes ?? "");
  const [customFieldName, setCustomFieldName] = useState("");
  const [saving, setSaving] = useState(false);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOrderId(existing?.order_id ?? "");
    setPhoneUrl(existing?.phone_api_url ?? "");
    setProvider((existing?.phone_api_url ?? "").startsWith("smsbot://") ? "smsbot" : "anosim");
    setTestData(existing?.test_data?.length ? existing.test_data : DEFAULT_IDENT_FIELDS.map((f) => ({ label: f, value: "" })));
    setInfoNotes(existing?.info_notes ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing?.id]);

  const { data: orders = [] } = useQuery({
    queryKey: ["bankdrop-orders", brandingId],
    enabled: open,
    queryFn: async () => {
      let q = supabase
        .from("orders")
        .select("id, title, provider, order_number, order_type")
        .eq("order_type", "bankdrop")
        .order("title");
      if (brandingId) q = q.eq("branding_id", brandingId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: infoTemplates } = useIdentInfoTemplates(brandingId);
  const { phoneEntries, smsbotRentals, resolveDisplayNumber, phoneDisplayMap } = usePhonePicker(brandingId);

  const pickerItems = useMemo(() => {
    return provider === "smsbot"
      ? smsbotRentals.map((r) => ({
          identifier: `smsbot://${r.rentalId}`,
          number: r.number || "Unbekannt",
          meta: [r.country, r.service].filter(Boolean).join(" · "),
        }))
      : (phoneEntries as any[]).map((e) => ({
          identifier: e.api_url as string,
          number: phoneDisplayMap[e.api_url] || "Laden...",
          meta: "",
        }));
  }, [provider, smsbotRentals, phoneEntries, phoneDisplayMap]);

  const applyTemplate = (templateId: string) => {
    const tpl = infoTemplates?.find((t) => t.id === templateId);
    if (!tpl) return;
    if (infoNotes.trim() && !window.confirm("Vorhandenen Text mit der Vorlage überschreiben?")) return;
    setInfoNotes(tpl.content);
  };

  const updateField = (i: number, patch: Partial<{ label: string; value: string }>) =>
    setTestData((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  const removeField = (i: number) => setTestData((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!orderId) {
      toast.error("Bitte einen Auftrag auswählen.");
      return;
    }
    setSaving(true);
    const normalizedPhone = phoneUrl.trim()
      ? phoneUrl.trim().replace("/share/orderbooking?", "/api/v1/orderbookingshare?")
      : null;
    const payload: any = {
      appointment_id: appointmentId,
      contract_id: contractId,
      order_id: orderId,
      branding_id: brandingId,
      phone_api_url: normalizedPhone,
      test_data: testData.filter((d) => d.label.trim() !== ""),
      info_notes: infoNotes,
      status: existing?.status === "started" ? "started" : "prepared",
    };

    const { error } = await supabase
      .from("first_workday_preparations" as any)
      .upsert(payload, { onConflict: "appointment_id" });

    setSaving(false);
    if (error) {
      toast.error("Fehler beim Speichern: " + error.message);
      return;
    }
    toast.success("Vorbereitung gespeichert.");
    queryClient.invalidateQueries({ queryKey: ["first-workday-preparations"] });
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vorbereitung – {employeeName}</DialogTitle>
            <DialogDescription>
              Interne Vorbereitung des 1. Arbeitstags. Der Mitarbeiter sieht davon nichts, bis auf „Starten" geklickt wird.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Step 1: Auftrag */}
            <div className="space-y-2">
              <Label>1. Auftrag (Bankdrop)</Label>
              <Select value={orderId} onValueChange={setOrderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Auftrag auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {orders.map((o: any) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.order_number ? `#${o.order_number} – ` : ""}{o.title}{o.provider ? ` (${o.provider})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {orders.length === 0 && (
                <p className="text-xs text-muted-foreground">Keine Bankdrop-Aufträge für dieses Branding vorhanden.</p>
              )}
            </div>

            {orderId && (
              <>
                <Separator />

                {/* Step 2: Nummer */}
                <div className="space-y-2">
                  <Label>2. Telefonnummer</Label>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant={provider === "anosim" ? "default" : "outline"} onClick={() => setProvider("anosim")}>Anosim</Button>
                    <Button type="button" size="sm" variant={provider === "smsbot" ? "default" : "outline"} onClick={() => setProvider("smsbot")}>SMSBot</Button>
                  </div>

                  {phoneUrl && resolveDisplayNumber(phoneUrl) && (
                    <Badge variant="secondary" className="gap-1.5 text-sm py-1 px-3">
                      <Phone className="h-3.5 w-3.5" /> {resolveDisplayNumber(phoneUrl)}
                      <span className="ml-1 text-[10px] uppercase tracking-wide opacity-70">
                        {phoneUrl.startsWith("smsbot://") ? "smsbot" : "anosim"}
                      </span>
                    </Badge>
                  )}

                  <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between font-normal" disabled={pickerItems.length === 0}>
                        <span className="truncate">
                          {pickerItems.length === 0
                            ? (provider === "smsbot" ? "Keine SMSBot-Nummern verfügbar" : "Keine Anosim-Nummern verfügbar")
                            : (pickerItems.find((i) => i.identifier === phoneUrl)?.number ?? "Nummer auswählen...")}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Nummer suchen..." />
                        <CommandList>
                          <CommandEmpty>Keine Treffer.</CommandEmpty>
                          <CommandGroup>
                            {pickerItems.map((item) => (
                              <CommandItem
                                key={item.identifier}
                                value={`${item.number} ${item.meta}`}
                                onSelect={() => { setPhoneUrl(item.identifier); setPickerOpen(false); }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${phoneUrl === item.identifier ? "opacity-100" : "opacity-0"}`} />
                                <div className="flex flex-col">
                                  <span>{item.number}</span>
                                  {item.meta && <span className="text-xs text-muted-foreground">{item.meta}</span>}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {provider === "anosim" && (
                    <Input
                      placeholder="Oder Anosim Share-Link einfügen..."
                      value={phoneUrl.startsWith("smsbot://") ? "" : phoneUrl}
                      onChange={(e) => setPhoneUrl(e.target.value)}
                      className="text-xs"
                    />
                  )}
                </div>

                <Separator />

                {/* Step 3: Ident-Daten */}
                <div className="space-y-2">
                  <Label>3. Ident-Daten</Label>
                  <div className="space-y-2">
                    {testData.map((field, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-28 shrink-0 text-xs text-muted-foreground truncate">{field.label}</span>
                        <Input
                          value={field.value}
                          onChange={(e) => updateField(i, { value: e.target.value })}
                          placeholder={field.label}
                          className="flex-1"
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeField(i)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      value={customFieldName}
                      onChange={(e) => setCustomFieldName(e.target.value)}
                      placeholder="Eigenes Feld hinzufügen..."
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const label = customFieldName.trim();
                        if (!label) return;
                        setTestData((prev) => [...prev, { label, value: "" }]);
                        setCustomFieldName("");
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Step 4: Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>4. Info / Fragen und Antworten</Label>
                    <div className="flex items-center gap-2">
                      <Select onValueChange={applyTemplate}>
                        <SelectTrigger className="h-8 w-[200px] text-xs">
                          <SelectValue placeholder="Vorlage wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {(infoTemplates ?? []).map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => setTemplateManagerOpen(true)}>Verwalten</Button>
                    </div>
                  </div>
                  <Textarea
                    value={infoNotes}
                    onChange={(e) => setInfoNotes(e.target.value)}
                    placeholder="Infos, Fragen und Antworten..."
                    className="min-h-[140px] whitespace-pre-wrap"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving || !orderId}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <IdentInfoTemplateManager open={templateManagerOpen} onOpenChange={setTemplateManagerOpen} brandingId={brandingId} />
    </>
  );
}
