import { useState, useEffect, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { buildEmailHtml } from "@/lib/buildEmailHtml";
import { sendEmail } from "@/lib/sendEmail";
import { sendSms } from "@/lib/sendSms";
import { toast } from "sonner";
import { Loader2, Megaphone } from "lucide-react";

interface Recipient {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

interface Props {
  brandingId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const EVENT_TYPE = "website_wieder_erreichbar";

const DEFAULT_SMS =
  "Hallo {vorname}, wir entschuldigen uns für die technischen Probleme. Unsere Website ist wieder erreichbar: {link}";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function WebsiteAnnouncementDialog({ brandingId, open, onOpenChange }: Props) {
  const [domain, setDomain] = useState("https://app.codebricks.solutions");
  const [smsText, setSmsText] = useState(DEFAULT_SMS);
  const [branding, setBranding] = useState<any>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) {
      setDomain("https://app.codebricks.solutions");
      setSmsText(DEFAULT_SMS);
      setProgress(0);
      setRecipients([]);
      setSending(false);
      setBranding(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !brandingId) return;
    setLoading(true);
    (async () => {
      try {
        const { data: b } = await supabase
          .from("brandings")
          .select(
            "id, company_name, brand_color, street, zip_code, city, managing_director, phone, register_court, trade_register, vat_id, email_logo_enabled, email_logo_url"
          )
          .eq("id", brandingId)
          .maybeSingle();
        setBranding(b);

        const all: Recipient[] = [];
        const PAGE = 1000;
        for (let from = 0; ; from += PAGE) {
          const { data, error } = await supabase
            .from("employment_contracts")
            .select("first_name, last_name, email, phone")
            .eq("branding_id", brandingId)
            .eq("is_suspended", false)
            .not("user_id", "is", null)
            .range(from, from + PAGE - 1);
          if (error) throw error;
          all.push(...(data ?? []));
          if (!data || data.length < PAGE) break;
        }

        const seenMail = new Set<string>();
        const seenPhone = new Set<string>();
        const unique: Recipient[] = [];
        for (const r of all) {
          const mail = r.email?.trim().toLowerCase() || null;
          const phone = r.phone?.replace(/\s+/g, "") || null;
          if (!mail && !phone) continue;
          if (mail && seenMail.has(mail)) continue;
          if (!mail && phone && seenPhone.has(phone)) continue;
          if (mail) seenMail.add(mail);
          if (phone) seenPhone.add(phone);
          unique.push({ ...r, email: mail, phone });
        }
        setRecipients(unique);
      } catch {
        toast.error("Empfänger konnten nicht geladen werden");
        onOpenChange(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, brandingId, onOpenChange]);

  const normalizedDomain = useMemo(() => {
    return domain.replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
  }, [domain]);

  const emailContent = useMemo(() => {
    const company = branding?.company_name || "Unternehmen";
    return {
      subject: `Unsere Website ist wieder erreichbar – ${company}`,
      bodyTitle: "Technische Störung behoben",
      bodyLines: (name: string) => [
        `Hallo ${name},`,
        "wir möchten uns für die technischen Probleme heute Morgen entschuldigen.",
        `Unsere Website ist ab sofort wieder erreichbar unter https://${normalizedDomain}.`,
        "Vielen Dank für Ihr Verständnis.",
      ],
    };
  }, [branding, normalizedDomain]);

  const previewHtml = useMemo(() => {
    if (!branding) return "";
    const footerParts = [branding.street, `${branding.zip_code || ""} ${branding.city || ""}`.trim()].filter(Boolean);
    return buildEmailHtml({
      companyName: branding.company_name,
      brandColor: branding.brand_color || "#3B82F6",
      bodyTitle: emailContent.bodyTitle,
      bodyLines: emailContent.bodyLines("Max Mustermann"),
      buttonText: "Zur Website",
      buttonUrl: `https://${normalizedDomain}`,
      footerAddress: footerParts.join(", "),
      footerDetails: {
        managingDirector: branding.managing_director || undefined,
        phone: branding.phone || undefined,
        registerCourt: branding.register_court || undefined,
        tradeRegister: branding.trade_register || undefined,
        vatId: branding.vat_id || undefined,
      },
      emailLogoEnabled: branding.email_logo_enabled,
      emailLogoUrl: branding.email_logo_url,
    });
  }, [branding, emailContent, normalizedDomain]);

  const handleSend = async () => {
    if (!brandingId) return;
    setSending(true);
    setProgress(0);
    let mails = 0;
    let sms = 0;
    let failed = 0;

    const websiteUrl = `https://${normalizedDomain}`;

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      const fullName = [r.first_name, r.last_name].filter(Boolean).join(" ");
      const firstName = r.first_name || "";
      if (r.email) {
        try {
          await sendEmail({
            to: r.email,
            recipient_name: fullName || undefined,
            subject: emailContent.subject,
            body_title: emailContent.bodyTitle,
            body_lines: emailContent.bodyLines(fullName || "zusammen"),
            button_text: "Zur Website",
            button_url: websiteUrl,
            branding_id: brandingId,
            event_type: EVENT_TYPE,
            metadata: {},
          });
          mails++;
        } catch {
          failed++;
        }
      }
      if (r.phone) {
        const text = smsText
          .replace(/\{vorname\}/g, firstName)
          .replace(/\{link\}/g, websiteUrl);
        try {
          await sendSms({
            to: r.phone,
            text,
            recipient_name: fullName || undefined,
            event_type: EVENT_TYPE,
            branding_id: brandingId,
          });
          sms++;
        } catch {
          failed++;
        }
      }
      setProgress(i + 1);
      await sleep(150);
    }

    setSending(false);
    toast.success(`${mails} E-Mails und ${sms} SMS versendet${failed ? ` (${failed} Fehler)` : ""}`);
    onOpenChange(false);
  };

  const ready = !loading && !!branding;

  return (
    <Dialog open={open} onOpenChange={(v) => !sending && onOpenChange(v)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Wieder-erreichbar Info senden
          </DialogTitle>
          <DialogDescription>
            E-Mail und SMS mit dem Hinweis auf die neue Domain gehen an alle aktiven Mitarbeiter-Accounts dieses Brandings.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Empfänger werden geladen…
          </div>
        ) : !ready ? null : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Neue Domain</Label>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="https://app.codebricks.solutions"
                disabled={sending}
              />
              <p className="text-xs text-muted-foreground">Mit https:// eingeben. Wird für E-Mail-Button und SMS-Link verwendet.</p>
            </div>

            <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
              <iframe title="E-Mail-Vorschau" srcDoc={previewHtml} className="w-full h-[420px] bg-white" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sms-text">SMS-Text</Label>
              <Textarea
                id="sms-text"
                rows={3}
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                disabled={sending}
              />
              <p className="text-xs text-muted-foreground">
                Platzhalter: {"{vorname}"}, {"{link}"}
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              Wird an <span className="font-semibold text-foreground">{recipients.length}</span> Mitarbeiter gesendet
              ({recipients.filter((r) => r.email).length} E-Mails, {recipients.filter((r) => r.phone).length} SMS).
            </p>

            {sending && (
              <div className="space-y-1">
                <Progress value={(progress / Math.max(recipients.length, 1)) * 100} />
                <p className="text-xs text-muted-foreground">
                  {progress}/{recipients.length} verarbeitet
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {ready && (
            <Button onClick={handleSend} disabled={sending || !recipients.length || !smsText.trim() || !normalizedDomain}>
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Jetzt an {recipients.length} Mitarbeiter senden
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
