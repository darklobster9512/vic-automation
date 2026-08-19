import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sendSms } from "@/lib/sendSms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Smartphone, Send, Save, TestTube } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";

const PLACEHOLDER_INFO: Record<string, string[]> = {
  bewerbung_angenommen: ["{name}", "{link}"],
  bewerbung_angenommen_extern: ["{name}", "{jobtitel}"],
  bewerbung_angenommen_extern_meta: ["{name}", "{link}"],
  indeed_bewerbung_angenommen: ["{name}", "{unternehmen}", "{link}"],
  vertrag_genehmigt: ["{name}"],
  auftrag_zugewiesen: ["{name}", "{auftrag}"],
  bewertung_genehmigt: ["{name}", "{auftrag}", "{praemie}"],
  bewertung_abgelehnt: ["{name}", "{auftrag}"],
  gespraech_erinnerung: ["{name}", "{telefon}", "{link}"],
  gespraech_bestaetigung: ["{name}", "{datum}", "{uhrzeit}"],
  probetag_bestaetigung: ["{name}", "{datum}", "{uhrzeit}"],
  gespraech_erinnerung_auto: ["{name}", "{datum}", "{uhrzeit}"],
  probetag_erinnerung_auto: ["{name}", "{datum}", "{uhrzeit}"],
  probetag_erinnerung: ["{name}"],
  konto_erstellt: ["{name}"],
  vertrag_eingereicht: ["{name}"],
  ident_daten_gesendet: ["{name}", "{auftrag}"],
};

export default function AdminSmsTemplates() {
  const queryClient = useQueryClient();
  const { activeBrandingId, ready } = useBrandingFilter();
  const [testPhone, setTestPhone] = useState("");
  const [testText, setTestText] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testBrandingId, setTestBrandingId] = useState("");
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [togglingIdent, setTogglingIdent] = useState(false);

  const { data: identDisabled } = useQuery({
    queryKey: ["branding-sms-ident-disabled", activeBrandingId],
    enabled: ready && !!activeBrandingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brandings")
        .select("sms_ident_disabled" as any)
        .eq("id", activeBrandingId!)
        .single();
      if (error) throw error;
      return !!(data as any)?.sms_ident_disabled;
    },
  });

  const handleToggleIdentSms = async () => {
    if (!activeBrandingId) return;
    setTogglingIdent(true);
    const newVal = !identDisabled;
    const { error } = await supabase
      .from("brandings")
      .update({ sms_ident_disabled: newVal } as any)
      .eq("id", activeBrandingId);
    setTogglingIdent(false);
    if (error) {
      toast.error("Fehler beim Speichern");
    } else {
      toast.success(newVal ? "SMS deaktiviert" : "SMS aktiviert");
      queryClient.invalidateQueries({ queryKey: ["branding-sms-ident-disabled", activeBrandingId] });
    }
  };

  const { data: templates, isLoading } = useQuery({
    queryKey: ["sms-templates", activeBrandingId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_templates" as any)
        .select("*")
        .order("event_type");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: brandings } = useQuery({
    queryKey: ["brandings-sms", activeBrandingId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brandings")
        .select("id, company_name, sms_sender_name" as any)
        .order("company_name");
      if (error) throw error;
      return data as any[];
    },
  });

  const handleTestSms = async () => {
    if (!testPhone.trim() || !testText.trim()) {
      toast.error("Bitte Telefonnummer und Text eingeben");
      return;
    }
    if (!testBrandingId) {
      toast.error("Bitte Branding auswählen");
      return;
    }
    const selectedBranding = brandings?.find((b: any) => b.id === testBrandingId);
    const senderName = selectedBranding?.sms_sender_name || undefined;
    setTestSending(true);
    const success = await sendSms({
      to: testPhone.trim(),
      text: testText.trim(),
      event_type: "test",
      from: senderName,
      branding_id: testBrandingId || null,
    });
    setTestSending(false);
    if (success) {
      toast.success("Test-SMS gesendet!");
    } else {
      toast.error("SMS-Versand fehlgeschlagen");
    }
  };

  const handleSaveTemplate = async (template: any) => {
    const newMessage = editValues[template.id] ?? template.message;
    setSaving(template.id);
    const { error } = await supabase
      .from("sms_templates" as any)
      .update({ message: newMessage, updated_at: new Date().toISOString() } as any)
      .eq("id", template.id);
    setSaving(null);
    if (error) {
      toast.error("Fehler beim Speichern");
    } else {
      toast.success("Vorlage gespeichert");
      queryClient.invalidateQueries({ queryKey: ["sms-templates"] });
    }
  };

  const getCharCount = (template: any) => {
    const text = editValues[template.id] ?? template.message;
    return text.length;
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-3xl font-bold tracking-tight text-foreground">SMS-Vorlagen</h2>
        <p className="text-muted-foreground mt-1">SMS-Texte bearbeiten und Test-SMS versenden.</p>
      </motion.div>

      {/* Test SMS */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TestTube className="h-4 w-4 text-primary" />
              Test-SMS senden
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Branding (Absender)</Label>
                <Select value={testBrandingId} onValueChange={setTestBrandingId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Branding wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {brandings?.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.company_name} {b.sms_sender_name ? `(${b.sms_sender_name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Telefonnummer</Label>
                <Input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+491234567890"
                />
              </div>
              <div className="space-y-2">
                <Label>Nachricht</Label>
                <Textarea
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  placeholder="Test-Nachricht eingeben..."
                  rows={2}
                />
              </div>
            </div>
            <Button onClick={handleTestSms} disabled={testSending} size="sm">
              <Send className="h-4 w-4 mr-2" />
              {testSending ? "Wird gesendet..." : "Test-SMS senden"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <Separator />

      {/* Templates */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {templates?.map((template: any, index: number) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * index }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-primary" />
                      {template.label}
                    </CardTitle>
                    <Badge variant="outline" className="text-[11px]">
                      {template.event_type}
                    </Badge>
                  </div>
                  {template.event_type === "ident_daten_gesendet" && (
                    <div className="flex items-center gap-2 mt-1">
                      <Switch
                        checked={!identDisabled}
                        onCheckedChange={handleToggleIdentSms}
                        disabled={togglingIdent}
                      />
                      <span className="text-xs text-muted-foreground">
                        SMS aktiv für dieses Branding
                      </span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={editValues[template.id] ?? template.message}
                    onChange={(e) =>
                      setEditValues((prev) => ({ ...prev, [template.id]: e.target.value }))
                    }
                    rows={3}
                    className="text-sm"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Platzhalter:</span>
                      {PLACEHOLDER_INFO[template.event_type]?.map((p: string) => (
                        <Badge key={p} variant="secondary" className="text-[10px] font-mono">
                          {p}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs ${getCharCount(template) > 160 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {getCharCount(template)}/160
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSaveTemplate(template)}
                        disabled={saving === template.id}
                      >
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        {saving === template.id ? "..." : "Speichern"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
