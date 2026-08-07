import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sendSms } from "@/lib/sendSms";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Video, Clock, ArrowLeft, Plus, X, Save, MessageSquare, Loader2, StopCircle, User, Mail, Send, CreditCard, Check, ChevronsUpDown, Phone } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import IdentInfoTemplateManager, { useIdentInfoTemplates } from "@/components/admin/IdentInfoTemplateManager";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface IdentSession {
  id: string;
  order_id: string;
  contract_id: string;
  assignment_id: string;
  status: string;
  phone_api_url: string | null;
  test_data: Array<{ label: string; value: string }>;
  created_at: string;
  updated_at: string;
  branding_id: string | null;
  email_tan_enabled: boolean;
  email_tans: Array<{ code: string; created_at: string }>;
}

interface AnosimSms {
  messageSender: string;
  messageDate: string;
  messageText: string;
}

const DEFAULT_FIELDS = ["Identcode", "Identlink", "Anmeldename", "Email", "Passwort"];

export default function AdminIdentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch the session
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["ident-session", id],
    enabled: !!id,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ident_sessions" as any)
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as unknown as IdentSession;
    },
  });

  // Fetch contract name
  const { data: contract } = useQuery({
    queryKey: ["ident-contract", session?.contract_id],
    enabled: !!session?.contract_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("employment_contracts")
        .select("first_name, last_name")
        .eq("id", session!.contract_id)
        .single();
      return data;
    },
  });

  // Fetch order title
  const { data: order } = useQuery({
    queryKey: ["ident-order", session?.order_id],
    enabled: !!session?.order_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("title")
        .eq("id", session!.order_id)
        .single();
      return data;
    },
  });

  const employeeName = contract ? `${contract.first_name || ""} ${contract.last_name || ""}`.trim() || "Unbekannt" : "…";
  const orderTitle = order?.title ?? "…";

  if (sessionLoading || !session) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[500px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/idents")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            {employeeName}
          </h2>
          <p className="text-sm text-muted-foreground">{orderTitle}</p>
        </div>
        <StatusBadge status={session.status} />
      </div>

      <IdentDetailContent
        session={session}
        onUpdate={() => {
          queryClient.invalidateQueries({ queryKey: ["ident-session", id] });
          queryClient.invalidateQueries({ queryKey: ["ident-sessions"] });
        }}
        onEnd={() => navigate("/admin/idents")}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "waiting": return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Wartet</Badge>;
    case "data_sent": return <Badge className="gap-1 bg-blue-500"><MessageSquare className="h-3 w-3" /> Daten gesendet</Badge>;
    case "completed": return <Badge className="gap-1 bg-green-500">Abgeschlossen</Badge>;
    case "cancelled": return <Badge variant="destructive" className="gap-1">Abgebrochen</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function IdentDetailContent({
  session,
  onUpdate,
  onEnd,
}: {
  session: IdentSession;
  onUpdate: () => void;
  onEnd: () => void;
}) {
  const [phoneUrl, setPhoneUrl] = useState(session.phone_api_url ?? "");
  const [provider, setProvider] = useState<"anosim" | "smsbot">(
    (session.phone_api_url ?? "").startsWith("smsbot://") ? "smsbot" : "anosim"
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [testData, setTestData] = useState<Array<{ label: string; value: string }>>(
    session.test_data?.length > 0 ? session.test_data : DEFAULT_FIELDS.map(f => ({ label: f, value: "" }))
  );
  const [saving, setSaving] = useState(false);
  const [smsMessages, setSmsMessages] = useState<AnosimSms[]>([]);
  const [smsLoading, setSmsLoading] = useState(false);
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [customFieldName, setCustomFieldName] = useState("");
  const [emailTanEnabled, setEmailTanEnabled] = useState(session.email_tan_enabled ?? false);
  const [emailTans, setEmailTans] = useState<Array<{ code: string; created_at: string }>>(session.email_tans ?? []);
  const [newTanCode, setNewTanCode] = useState("");
  const [sendingTan, setSendingTan] = useState(false);
  const [idDialogOpen, setIdDialogOpen] = useState(false);
  const [assigningPhone, setAssigningPhone] = useState(false);
  const [addToBranding, setAddToBranding] = useState(false);
  const [infoNotes, setInfoNotes] = useState((session as any).info_notes ?? "");
  const queryClient = useQueryClient();


  // Fetch contract details for Mitarbeiterdaten card
  const { data: contractDetails } = useQuery({
    queryKey: ["admin", "contract-details", session.contract_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("employment_contracts")
        .select("first_name, last_name, email, phone, birth_date, birth_place, nationality, street, zip_code, city, marital_status, id_front_url, id_back_url")
        .eq("id", session.contract_id)
        .single();
      return data;
    },
  });

  // Fetch phone numbers filtered by branding
  const { data: phoneEntries = [] } = useQuery({
    queryKey: ["phone_numbers", session.branding_id],
    queryFn: async () => {
      let q = supabase.from("phone_numbers").select("id, api_url").order("created_at", { ascending: false });
      if (session.branding_id) {
        q = q.eq("branding_id", session.branding_id);
      }
      const { data } = await q;
      return data ?? [];
    },
  });

  // Fetch SMSBot rentals (shared cache with SmsWatch/AdminTelefonnummern)
  const { data: smsbotRentals = [] } = useQuery<Array<{ rentalId: string; number: string; service: string; country: string; state: string; sms: AnosimSms[] }>>({
    queryKey: ["smsbot_rentals", session.branding_id],
    enabled: !!session.branding_id,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("smsbot-proxy", { body: { action: "list", brandingId: session.branding_id } });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  // Resolve Anosim phone numbers to display numbers
  const [phoneDisplayMap, setPhoneDisplayMap] = useState<Record<string, string>>({});
  useEffect(() => {
    phoneEntries.forEach(async (entry) => {
      if (phoneDisplayMap[entry.api_url]) return;
      try {
        const { data } = await supabase.functions.invoke("anosim-proxy", { body: { url: entry.api_url } });
        if (data?.number) {
          setPhoneDisplayMap(prev => ({ ...prev, [entry.api_url]: data.number }));
        }
      } catch {}
    });
  }, [phoneEntries]);

  // Helper: resolve any identifier to a display number
  const resolveDisplayNumber = (identifier: string): string | undefined => {
    if (identifier.startsWith("smsbot://")) {
      const rentalId = identifier.slice("smsbot://".length);
      return smsbotRentals.find(r => r.rentalId === rentalId)?.number;
    }
    return phoneDisplayMap[identifier];
  };

  // Fetch SMS (works for both Anosim URLs and smsbot:// identifiers)
  useEffect(() => {
    const apiUrl = phoneUrl || session.phone_api_url;
    if (!apiUrl) { setSmsMessages([]); return; }
    const isSmsbot = apiUrl.startsWith("smsbot://");

    const fetchSms = async () => {
      setSmsLoading(true);
      try {
        const invocation = isSmsbot
          ? supabase.functions.invoke("smsbot-proxy", { body: { rentalId: apiUrl.slice("smsbot://".length), brandingId: session.branding_id } })
          : supabase.functions.invoke("anosim-proxy", { body: { url: apiUrl } });
        const { data } = await invocation;
        if (data?.sms) {
          const cutoff = new Date(session.updated_at).getTime();
          const sorted = [...data.sms]
            .filter((sms: AnosimSms) => new Date(sms.messageDate).getTime() >= cutoff)
            .sort((a: AnosimSms, b: AnosimSms) => new Date(b.messageDate).getTime() - new Date(a.messageDate).getTime());
          setSmsMessages(sorted);
        }
      } catch {}
      setSmsLoading(false);
    };

    fetchSms();
    const interval = setInterval(fetchSms, 5000);
    return () => clearInterval(interval);
  }, [phoneUrl, session.phone_api_url]);

  // Sync when session updates externally
  useEffect(() => {
    setPhoneUrl(session.phone_api_url ?? "");
    setProvider((session.phone_api_url ?? "").startsWith("smsbot://") ? "smsbot" : "anosim");
    setTestData(session.test_data?.length > 0 ? session.test_data : DEFAULT_FIELDS.map(f => ({ label: f, value: "" })));
    setEmailTanEnabled(session.email_tan_enabled ?? false);
    setEmailTans(session.email_tans ?? []);

  }, [session.id, session.updated_at]);

  const handleSave = async () => {
    setSaving(true);
    const filteredData = testData.filter(d => d.value.trim() !== "");

    const { error } = await supabase
      .from("ident_sessions" as any)
      .update({
        test_data: filteredData,
        info_notes: infoNotes,
        status: filteredData.length > 0 ? "data_sent" : session.status,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", session.id);

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Gespeichert", description: "Daten wurden aktualisiert und an den Mitarbeiter gesendet." });

      // Send SMS notification when data is sent
      if (filteredData.length > 0 && contractDetails?.phone) {
        try {
          const name = `${contractDetails.first_name || ""} ${contractDetails.last_name || ""}`.trim() || "Mitarbeiter";
          // Fetch order title for SMS
          const { data: orderData } = await supabase
            .from("orders")
            .select("title")
            .eq("id", session.order_id)
            .single();
          const auftragTitle = orderData?.title ?? "Auftrag";

          const { data: tpl } = await supabase
            .from("sms_templates" as any)
            .select("message")
            .eq("event_type", "ident_daten_gesendet")
            .single();
          if (tpl) {
            const msg = (tpl as any).message
              .replace("{name}", name)
              .replace("{auftrag}", auftragTitle);
            const branding = session.branding_id || null;
            let senderName: string | undefined;
            let identDisabled = false;
            if (branding) {
              const { data: br } = await supabase
                .from("brandings")
                .select("sms_sender_name, sms_ident_disabled" as any)
                .eq("id", branding)
                .single();
              senderName = (br as any)?.sms_sender_name || undefined;
              identDisabled = !!(br as any)?.sms_ident_disabled;
            }
            if (!identDisabled) {
              await sendSms({
                to: contractDetails.phone,
                text: msg,
                event_type: "ident_daten_gesendet",
                recipient_name: name,
                from: senderName,
                branding_id: branding,
              });
            }
          }
        } catch (e) {
          console.error("SMS notification failed:", e);
        }
      }

      onUpdate();
    }
    setSaving(false);
  };




  const handleAssignPhone = async (url: string) => {
    if (!url.trim()) return;
    setAssigningPhone(true);
    const normalizedUrl = url.trim().replace("/share/orderbooking?", "/api/v1/orderbookingshare?");
    const { error } = await supabase
      .from("ident_sessions" as any)
      .update({ phone_api_url: normalizedUrl, updated_at: new Date().toISOString() } as any)
      .eq("id", session.id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      setPhoneUrl(normalizedUrl);
      toast({ title: "Telefonnummer zugewiesen" });
      // Optionally add to branding phone_numbers
      if (addToBranding && !phoneEntries.some(e => e.api_url === normalizedUrl)) {
        await supabase.from("phone_numbers").insert({
          api_url: normalizedUrl,
          branding_id: session.branding_id,
        });
        queryClient.invalidateQueries({ queryKey: ["phone_numbers", session.branding_id] });
      }
      // Resolve the number if not yet in map
      if (!phoneDisplayMap[normalizedUrl]) {
        try {
          const { data } = await supabase.functions.invoke("anosim-proxy", { body: { url: normalizedUrl } });
          if (data?.number) {
            setPhoneDisplayMap(prev => ({ ...prev, [normalizedUrl]: data.number }));
          }
        } catch {}
      }
      onUpdate();
    }
    setAssigningPhone(false);
  };

  const handleEndSession = async () => {
    await supabase
      .from("ident_sessions" as any)
      .update({ status: "cancelled", updated_at: new Date().toISOString() } as any)
      .eq("id", session.id);
    toast({ title: "Session beendet" });
    onUpdate();
    onEnd();
  };

  const updateField = (i: number, patch: Partial<{ label: string; value: string }>) => {
    setTestData(prev => prev.map((d, idx) => idx === i ? { ...d, ...patch } : d));
  };

  const removeField = (i: number) => {
    setTestData(prev => prev.filter((_, idx) => idx !== i));
  };

  const addDefaultField = (label: string) => {
    if (!testData.find(d => d.label === label)) {
      setTestData(prev => [...prev, { label, value: "" }]);
    }
    setAddFieldOpen(false);
  };

  const addCustomField = () => {
    const label = customFieldName.trim();
    if (!label) return;
    setTestData(prev => [...prev, { label, value: "" }]);
    setCustomFieldName("");
    setAddFieldOpen(false);
  };

  const handleToggleEmailTan = async (enabled: boolean) => {
    setEmailTanEnabled(enabled);
    await supabase
      .from("ident_sessions" as any)
      .update({ email_tan_enabled: enabled, updated_at: new Date().toISOString() } as any)
      .eq("id", session.id);
    onUpdate();
  };

  const handleSendTan = async () => {
    const code = newTanCode.trim();
    if (!code) return;
    setSendingTan(true);
    const updatedTans = [...emailTans, { code, created_at: new Date().toISOString() }];
    const { error } = await supabase
      .from("ident_sessions" as any)
      .update({ email_tans: updatedTans, updated_at: new Date().toISOString() } as any)
      .eq("id", session.id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      setEmailTans(updatedTans);
      setNewTanCode("");
      toast({ title: "TAN gesendet" });
      onUpdate();
    }
    setSendingTan(false);
  };

  const availableDefaults = DEFAULT_FIELDS.filter(f => !testData.find(d => d.label === f));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Phone + SMS */}
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Label className="font-medium">Telefonnummer</Label>

            {/* Provider toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={provider === "anosim" ? "default" : "outline"}
                onClick={() => setProvider("anosim")}
              >
                Anosim
              </Button>
              <Button
                type="button"
                size="sm"
                variant={provider === "smsbot" ? "default" : "outline"}
                onClick={() => setProvider("smsbot")}
              >
                SMSBot
              </Button>
            </div>

            {/* Resolved number badge */}
            {phoneUrl && resolveDisplayNumber(phoneUrl) && (
              <Badge variant="secondary" className="gap-1.5 text-sm py-1 px-3">
                <Phone className="h-3.5 w-3.5" /> {resolveDisplayNumber(phoneUrl)}
                <span className="ml-1 text-[10px] uppercase tracking-wide opacity-70">
                  {phoneUrl.startsWith("smsbot://") ? "smsbot" : "anosim"}
                </span>
              </Badge>
            )}

            {/* Searchable combobox for existing numbers */}
            {(() => {
              const items = provider === "smsbot"
                ? smsbotRentals.map(r => ({
                    identifier: `smsbot://${r.rentalId}`,
                    number: r.number || "Unbekannt",
                    meta: [r.country, r.service].filter(Boolean).join(" · "),
                  }))
                : phoneEntries.map(e => ({
                    identifier: e.api_url,
                    number: phoneDisplayMap[e.api_url] || "Laden...",
                    meta: "",
                  }));
              const selected = items.find(i => i.identifier === phoneUrl);
              return (
                <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={pickerOpen}
                      className="w-full justify-between font-normal"
                      disabled={items.length === 0}
                    >
                      <span className="truncate">
                        {items.length === 0
                          ? (provider === "smsbot" ? "Keine SMSBot-Nummern verfügbar" : "Keine Anosim-Nummern verfügbar")
                          : selected
                            ? selected.number
                            : "Nummer auswählen..."}
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
                          {items.map(item => (
                            <CommandItem
                              key={item.identifier}
                              value={`${item.number} ${item.meta}`}
                              onSelect={() => {
                                setPickerOpen(false);
                                setPhoneUrl(item.identifier);
                                handleAssignPhone(item.identifier);
                              }}
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
              );
            })()}

            {/* Manual link input – Anosim only */}
            {provider === "anosim" && (
              <>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Oder Anosim Share-Link einfügen..."
                    value={phoneUrl.startsWith("smsbot://") ? "" : phoneUrl}
                    onChange={(e) => setPhoneUrl(e.target.value)}
                    className="text-xs flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleAssignPhone(phoneUrl)}
                    disabled={assigningPhone || !phoneUrl.trim() || phoneUrl.startsWith("smsbot://")}
                    className="shrink-0 gap-1.5"
                  >
                    {assigningPhone ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Zuweisen
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="addToBranding"
                    checked={addToBranding}
                    onCheckedChange={(checked) => setAddToBranding(!!checked)}
                  />
                  <Label htmlFor="addToBranding" className="text-xs text-muted-foreground cursor-pointer">
                    Nummer auch zum Branding hinzufügen
                  </Label>
                </div>
              </>
            )}
          </CardContent>
        </Card>


        <Card>
          <CardContent className="pt-6">
            <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4" /> SMS Nachrichten
              {smsLoading && <Loader2 className="h-3 w-3 animate-spin" />}
            </h4>
            <ScrollArea className="h-72 border rounded-lg">
              {smsMessages.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">
                  {phoneUrl ? "Keine SMS empfangen." : "Telefonnummer zuweisen um SMS zu sehen."}
                </p>
              ) : (
                <div className="p-3 space-y-2">
                  {smsMessages.map((sms, i) => (
                    <div key={i} className={`rounded-lg border p-3 text-sm ${i === 0 ? "border-primary/40 bg-primary/5" : "bg-background"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground">{sms.messageSender}</span>
                        <span className="text-muted-foreground text-xs">{format(new Date(sms.messageDate), "dd.MM. HH:mm")}</span>
                      </div>
                      <p className="text-foreground leading-relaxed">{sms.messageText}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Email TAN Toggle + Card */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email TAN
              </Label>
              <Switch checked={emailTanEnabled} onCheckedChange={handleToggleEmailTan} />
            </div>

            {emailTanEnabled && (
              <>
                <div className="flex items-center gap-2">
                  <Input
                    value={newTanCode}
                    onChange={(e) => setNewTanCode(e.target.value)}
                    placeholder="TAN-Code eingeben..."
                    onKeyDown={(e) => e.key === "Enter" && handleSendTan()}
                  />
                  <Button size="sm" onClick={handleSendTan} disabled={sendingTan || !newTanCode.trim()} className="gap-1.5 shrink-0">
                    <Send className="h-3.5 w-3.5" /> Senden
                  </Button>
                </div>

                {emailTans.length > 0 && (
                  <ScrollArea className="h-40 border rounded-lg">
                    <div className="p-3 space-y-2">
                      {[...emailTans].reverse().map((tan, i) => (
                        <div key={i} className={`rounded-lg border p-3 text-sm ${i === 0 ? "border-primary/40 bg-primary/5" : "bg-background"}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-foreground font-mono">{tan.code}</span>
                            <span className="text-muted-foreground text-xs">{format(new Date(tan.created_at), "dd.MM. HH:mm")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: Test Data */}
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6 space-y-5">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Test-Daten</h4>

            {/* Data rows as clean grid */}
            <div className="space-y-3">
              {testData.map((field, i) => {
                const isDefault = DEFAULT_FIELDS.includes(field.label);
                return (
                  <div key={i} className="flex items-center gap-3">
                    {isDefault ? (
                      <span className="w-36 shrink-0 text-sm font-medium text-foreground">{field.label}</span>
                    ) : (
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(i, { label: e.target.value })}
                        className="w-36 shrink-0 font-medium"
                        placeholder="Feldname"
                      />
                    )}
                    <Input
                      value={field.value}
                      onChange={(e) => updateField(i, { value: e.target.value })}
                      placeholder={`${field.label} eingeben...`}
                      className="flex-1"
                    />
                    <button
                      onClick={() => removeField(i)}
                      className="text-muted-foreground hover:text-destructive shrink-0 p-1 rounded-md hover:bg-destructive/10 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Add field popover */}
            <Popover open={addFieldOpen} onOpenChange={setAddFieldOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 w-full">
                  <Plus className="h-4 w-4" /> Feld hinzufügen
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="space-y-1">
                  {availableDefaults.map(f => (
                    <button
                      key={f}
                      onClick={() => addDefaultField(f)}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                    >
                      {f}
                    </button>
                  ))}
                  {availableDefaults.length > 0 && <Separator className="my-1" />}
                  <div className="flex items-center gap-2 p-1">
                    <Input
                      value={customFieldName}
                      onChange={(e) => setCustomFieldName(e.target.value)}
                      placeholder="Eigenes Feld..."
                      className="h-8 text-sm"
                      onKeyDown={(e) => e.key === "Enter" && addCustomField()}
                    />
                    <Button size="sm" variant="ghost" className="h-8 px-2 shrink-0" onClick={addCustomField} disabled={!customFieldName.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Separator />

            <div className="space-y-2">
              <Label className="text-sm font-medium">Info / Fragen und Antworten (optional)</Label>
              <Textarea
                value={infoNotes}
                onChange={(e) => setInfoNotes(e.target.value)}
                placeholder="Zusätzliche Infos für den Mitarbeiter eingeben..."
                className="min-h-[100px]"
              />
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Speichern..." : "Speichern & Senden"}
              </Button>
              {(session.status === "waiting" || session.status === "data_sent") && (
                <Button variant="destructive" size="sm" onClick={handleEndSession} className="gap-1.5">
                  <StopCircle className="h-4 w-4" /> Beenden
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mitarbeiterdaten Card */}
        {contractDetails && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" /> Mitarbeiterdaten
              </h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  ["Vorname", contractDetails.first_name],
                  ["Nachname", contractDetails.last_name],
                  ["E-Mail", contractDetails.email],
                  ["Telefon", contractDetails.phone],
                  ["Geburtsdatum", contractDetails.birth_date ? format(new Date(contractDetails.birth_date), "dd.MM.yyyy") : null],
                  ["Geburtsort", contractDetails.birth_place],
                  ["Nationalität", contractDetails.nationality],
                  ["Straße", contractDetails.street],
                  ["PLZ & Stadt", [contractDetails.zip_code, contractDetails.city].filter(Boolean).join(" ") || null],
                  ["Familienstand", contractDetails.marital_status],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <span className="text-muted-foreground">{label}</span>
                    <p className="font-medium text-foreground">{(value as string) || "–"}</p>
                  </div>
                ))}
              </div>

              {(contractDetails.id_front_url || contractDetails.id_back_url) && (
                <>
                  <Separator />
                  <Dialog open={idDialogOpen} onOpenChange={setIdDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <CreditCard className="h-4 w-4" /> Personalausweis anzeigen
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Personalausweis</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {contractDetails.id_front_url && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Vorderseite</p>
                            <img src={contractDetails.id_front_url} alt="Ausweis Vorderseite" className="rounded-lg border w-full object-contain" />
                          </div>
                        )}
                        {contractDetails.id_back_url && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Rückseite</p>
                            <img src={contractDetails.id_back_url} alt="Ausweis Rückseite" className="rounded-lg border w-full object-contain" />
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
