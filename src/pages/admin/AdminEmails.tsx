import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Mail, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";

import { buildEmailHtml } from "@/lib/buildEmailHtml";

/* ------------------------------------------------------------------ */
/*  Template definitions with sample data                              */
/* ------------------------------------------------------------------ */

interface TemplateDefinition {
  eventType: string;
  label: string;
  subject: (company: string, jobTitle?: string) => string;
  bodyTitle: string;
  bodyLines: (company: string, jobTitle?: string) => string[];
  buttonText?: string;
  buttonUrl?: string;
  footerLines?: string[];
}

const templates: TemplateDefinition[] = [
  {
    eventType: "bewerbung_eingegangen",
    label: "Bewerbung eingegangen",
    subject: (c) => `Ihre Bewerbung bei ${c}`,
    bodyTitle: "Vielen Dank für Ihre Bewerbung",
    bodyLines: (c) => [
      "Sehr geehrte/r Max Mustermann,",
      `wir haben Ihre Bewerbung als Vollzeit-Mitarbeiter bei ${c} erhalten und werden diese sorgfältig prüfen.`,
      "Wir melden uns in Kürze bei Ihnen.",
      "Mit freundlichen Grüßen",
    ],
  },
  {
    eventType: "bewerbung_angenommen",
    label: "Bewerbung angenommen",
    subject: (c) => `Ihre Bewerbung wurde angenommen – ${c}`,
    bodyTitle: "Ihre Bewerbung wurde angenommen",
    bodyLines: (c) => [
      "Sehr geehrte/r Max Mustermann,",
      `wir freuen uns, Ihnen mitteilen zu können, dass Ihre Bewerbung bei ${c} angenommen wurde.`,
      "Im nächsten Schritt bitten wir Sie, einen Termin für Ihr Bewerbungsgespräch zu vereinbaren.",
    ],
    buttonText: "Gesprächstermin buchen",
    buttonUrl: "https://example.com/bewerbungsgespraech/abc123",
    footerLines: ['Schauen Sie sich noch einmal die Stellenanzeige an: <a href="https://example.com/karriere" target="_blank" style="color:#3B82F6;text-decoration:underline;">https://example.com/karriere</a>'],
  },
  {
    eventType: "bewerbung_angenommen_extern_meta",
    label: "Bewerbung angenommen (Extern - META)",
    subject: (c) => `Ihre Bewerbung wurde angenommen – ${c}`,
    bodyTitle: "Ihre Bewerbung wurde angenommen",
    bodyLines: (c, jobTitle) => [
      "Sehr geehrte/r Max Mustermann,",
      `wir freuen uns, Ihnen mitzuteilen, dass Ihre Bewerbung über Instagram/Facebook${jobTitle ? ` als „${jobTitle}"` : ""} bei ${c} angenommen wurde.`,
      "Bitte buchen Sie nun einen Termin für Ihr Bewerbungsgespräch über den folgenden Link.",
    ],
    buttonText: "Gesprächstermin buchen",
    buttonUrl: "https://example.com/bewerbungsgespraech/abc123",
    footerLines: ['Schauen Sie sich noch einmal die Stellenanzeige an: <a href="https://example.com/karriere" target="_blank" style="color:#3B82F6;text-decoration:underline;">https://example.com/karriere</a>'],
  },
  {
    eventType: "bewerbung_angenommen_extern",
    label: "Bewerbung angenommen (Extern - Allgemein)",
    subject: (c) => `Ihre Bewerbung wurde angenommen – ${c}`,
    bodyTitle: "Ihre Bewerbung wurde angenommen",
    bodyLines: (c, jobTitle) => [
      "Sehr geehrte/r Max Mustermann,",
      `wir freuen uns, Ihnen mitzuteilen, dass Ihre Bewerbung${jobTitle ? ` als „${jobTitle}"` : ""} bei ${c} angenommen wurde.`,
      "Bitte buchen Sie nun einen Termin für Ihr Bewerbungsgespräch über den folgenden Link.",
    ],
    buttonText: "Gesprächstermin buchen",
    buttonUrl: "https://example.com/bewerbungsgespraech/abc123",
    footerLines: ['Schauen Sie sich noch einmal die Stellenanzeige an: <a href="https://example.com/karriere" target="_blank" style="color:#3B82F6;text-decoration:underline;">https://example.com/karriere</a>'],
  },
  {
    eventType: "gespraech_erfolgreich",
    label: "Gespräch erfolgreich",
    subject: () => "Ihr Bewerbungsgespräch war erfolgreich",
    bodyTitle: "Willkommen im Team",
    bodyLines: () => [
      "Sehr geehrte/r Max Mustermann,",
      "wir haben Ihre Starteraufträge erfolgreich geprüft und würden Sie sehr gerne bei uns im Team begrüßen.",
      "Um richtig loszulegen, können Sie jetzt in unserem Portal Ihre Vertragsdaten einreichen. Anschließend erhalten Sie die Möglichkeit, einen Termin für Ihren 1. Arbeitstag zu buchen.",
    ],
    buttonText: "Vertragsdaten einreichen",
    buttonUrl: "https://example.com",
  },
  {
    eventType: "panel_link",
    label: "Panel-Link",
    subject: (c) => `Ihr Zugang zum Mitarbeiterportal – ${c}`,
    bodyTitle: "Ihr Portal-Zugang",
    bodyLines: () => [
      "Sehr geehrte/r Max Mustermann,",
      "anbei erhalten Sie den Zugang zu unserem Portal.",
      "Über den folgenden Link gelangen Sie direkt zur Anmeldung.",
    ],
    buttonText: "Zum Portal",
    buttonUrl: "https://example.com",
  },
  {
    eventType: "website_wieder_erreichbar",
    label: "Website wieder erreichbar",
    subject: (c) => `Unsere Website ist wieder erreichbar – ${c}`,
    bodyTitle: "Technische Störung behoben",
    bodyLines: () => [
      "Hallo Max Mustermann,",
      "wir möchten uns für die technischen Probleme heute Morgen entschuldigen.",
      "Unsere Website ist ab sofort wieder erreichbar unter beispiel-domain.de.",
      "Vielen Dank für Ihr Verständnis.",
    ],
    buttonText: "Zur Website",
    buttonUrl: "https://beispiel-domain.de",
  },
  {
    eventType: "konto_erstellt",
    label: "Konto erstellt",
    subject: () => "Willkommen – Ihr Konto wurde erstellt",
    bodyTitle: "Willkommen im Mitarbeiterportal",
    bodyLines: () => [
      "Sehr geehrte/r Max Mustermann,",
      "Ihr Konto wurde erfolgreich erstellt. Ihnen wurden automatisch Starteraufträge zugewiesen.",
      "Bitte erledigen Sie die Starteraufträge zeitnah. Nach erfolgreicher Überprüfung melden wir uns bei Ihnen nochmal.",
    ],
  },
  {
    eventType: "vertrag_eingereicht",
    label: "Vertrag eingereicht",
    subject: () => "Ihre Vertragsdaten wurden eingereicht",
    bodyTitle: "Vertragsdaten eingereicht",
    bodyLines: () => [
      "Sehr geehrte/r Max Mustermann,",
      "Ihre Vertragsdaten wurden erfolgreich eingereicht und werden nun geprüft.",
      "Sie werden benachrichtigt, sobald Ihr Vertrag genehmigt wurde.",
    ],
  },
  {
    eventType: "vertrag_genehmigt",
    label: "Vertrag genehmigt",
    subject: (c) => `Herzlichen Glückwunsch – Sie sind nun vollwertiger Mitarbeiter bei ${c}`,
    bodyTitle: "Willkommen im Team!",
    bodyLines: (c) => [
      "Sehr geehrte/r Max Mustermann,",
      `herzlichen Glückwunsch! Ihr Arbeitsvertrag bei ${c} wurde genehmigt – Sie sind nun vollwertiger Mitarbeiter.`,
      "Ihr Startdatum: 01.04.2026",
      "Ab diesem Datum werden Ihnen Aufträge zugewiesen.",
      "Bitte vereinbaren Sie mit uns einen Termin für Ihren ersten Arbeitstag.",
      "Michael Schreiber wird Sie anschließend telefonisch kontaktieren, um mit Ihnen die ersten Aufträge durchzugehen.",
      "Wir freuen uns auf die Zusammenarbeit!",
    ],
    buttonText: "Termin für 1. Arbeitstag buchen",
    buttonUrl: "https://web.example.com/erster-arbeitstag/abc123",
  },
  {
    eventType: "gespraech_bestaetigung",
    label: "Bewerbungsgespräch Bestätigung",
    subject: () => "Ihr Bewerbungsgespräch am 15. April 2026",
    bodyTitle: "Terminbestätigung – Bewerbungsgespräch",
    bodyLines: () => [
      "Hallo Max,",
      "Ihr Bewerbungsgespräch wurde erfolgreich gebucht.",
      "Datum: 15. April 2026",
      "Uhrzeit: 10:00 Uhr",
      "Wir freuen uns auf das Gespräch mit Ihnen!",
    ],
  },
  {
    eventType: "probetag_bestaetigung",
    label: "Probetag Bestätigung",
    subject: () => "Ihr Probetag am 20. April 2026",
    bodyTitle: "Terminbestätigung – Probetag",
    bodyLines: () => [
      "Hallo Max,",
      "Ihr Probetag wurde erfolgreich gebucht.",
      "Datum: 20. April 2026",
      "Uhrzeit: 09:00 Uhr",
      "Wir freuen uns auf Sie!",
    ],
  },
  {
    eventType: "probetag_erfolgreich",
    label: "Probetag erfolgreich",
    subject: (c) => `Ihr Probetag war erfolgreich – ${c}`,
    bodyTitle: "Ihr Probetag war erfolgreich!",
    bodyLines: (c) => [
      "Sehr geehrte/r Max Mustermann,",
      `wir freuen uns, Ihnen mitteilen zu können, dass Ihr Probetag bei ${c} erfolgreich war. Wir haben Ihre Ergebnisse geprüft und sind sehr zufrieden.`,
      "Als nächsten Schritt bitten wir Sie, Ihre persönlichen Daten zu vervollständigen und den Arbeitsvertrag auszufüllen.",
      "Wir freuen uns auf die Zusammenarbeit!",
    ],
  },
  {
    eventType: "erster_arbeitstag_bestaetigung",
    label: "1. Arbeitstag Bestätigung",
    subject: () => "Ihr 1. Arbeitstag am 25. April 2026",
    bodyTitle: "Terminbestätigung – 1. Arbeitstag",
    bodyLines: () => [
      "Hallo Max,",
      "Ihr 1. Arbeitstag wurde erfolgreich gebucht.",
      "Datum: 25. April 2026",
      "Uhrzeit: 09:00 Uhr",
      "Wir freuen uns auf Sie!",
    ],
  },
  {
    eventType: "auftrag_zugewiesen",
    label: "Neuer Auftrag zugewiesen",
    subject: () => "Neuer Auftrag verfügbar",
    bodyTitle: "Ihnen wurde ein neuer Auftrag zugewiesen",
    bodyLines: () => [
      "Sehr geehrte/r Max Mustermann,",
      "Ihnen wurde ein neuer Auftrag zugewiesen:",
      "Auftrag: #12345 – App-Bewertung Testprojekt",
      "Bitte loggen Sie sich in Ihrem Mitarbeiterportal ein, um den Auftrag einzusehen und zu bearbeiten.",
    ],
    buttonText: "Auftrag ansehen",
    buttonUrl: "https://example.com/mitarbeiter/auftraege",
  },
  {
    eventType: "auftraege_zugewiesen_sammel",
    label: "Mehrere Aufträge zugewiesen",
    subject: () => "3 neue Aufträge verfügbar",
    bodyTitle: "Ihnen wurden neue Aufträge zugewiesen",
    bodyLines: () => [
      "Sehr geehrte/r Max Mustermann,",
      "Ihnen wurden 3 neue Aufträge zugewiesen:",
      "Auftrag: #12345 – App-Bewertung Testprojekt",
      "Auftrag: #12346 – Shop-Test Brunobett",
      "Auftrag: #12347 – Shop-Test Sallys Shop",
      "Bitte loggen Sie sich in Ihrem Mitarbeiterportal ein, um die Aufträge einzusehen und zu bearbeiten.",
    ],
    buttonText: "Aufträge ansehen",
    buttonUrl: "https://example.com/mitarbeiter/auftraege",
  },
  {
    eventType: "auftrag_erfolgreich",
    label: "Auftrag erfolgreich",
    subject: () => "Auftrag erfolgreich abgeschlossen",
    bodyTitle: "Auftrag erfolgreich",
    bodyLines: () => [
      "Sehr geehrte/r Max Mustermann,",
      'Ihr Auftrag "App-Bewertung Testprojekt" wurde erfolgreich abgeschlossen.',
      "Die Prämie von 25€ wurde Ihrem Konto gutgeschrieben.",
      "Vielen Dank für Ihre Mitarbeit.",
    ],
  },
  {
    eventType: "probetag_erinnerung",
    label: "Probetag Erinnerung",
    subject: (c) => `Erinnerung an Ihren Probetag – ${c}`,
    bodyTitle: "Erinnerung an Ihren Probetag",
    bodyLines: (c) => [
      "Sehr geehrte/r Max Mustermann,",
      `Sie hatten einen Probetag-Termin bei ${c}. Leider konnten wir Sie nicht erreichen bzw. der Termin wurde nicht wahrgenommen.`,
      "Falls Sie den Termin nicht wahrnehmen konnten, haben Sie die Möglichkeit, einen neuen Termin zu buchen.",
    ],
    buttonText: "Neuen Probetag buchen",
    buttonUrl: "https://example.com/probetag/abc123",
  },
  {
    eventType: "bewertung_abgelehnt",
    label: "Bewertung abgelehnt",
    subject: () => "Ihre Bewertung wurde abgelehnt",
    bodyTitle: "Bewertung abgelehnt",
    bodyLines: () => [
      "Sehr geehrte/r Max Mustermann,",
      "Ihre Bewertung für den Auftrag #12345 wurde geprüft und leider abgelehnt.",
      "Bitte führen Sie die Bewertung erneut durch. Achten Sie dabei auf die Vorgaben des Auftrags.",
    ],
    buttonText: "Bewertung wiederholen",
    buttonUrl: "https://example.com/mitarbeiter/auftraege",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminEmails() {
  const [selectedBrandingId, setSelectedBrandingId] = useState<string>("none");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const { activeBrandingId, ready } = useBrandingFilter();

  const { data: brandings } = useQuery({
    queryKey: ["brandings-for-preview", activeBrandingId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brandings")
        .select("id, company_name, brand_color, logo_url, street, zip_code, city, managing_director, phone, register_court, trade_register, vat_id, email_logo_enabled, email_logo_url, main_job_title, domain, subdomain_prefix, custom_email_link_enabled, custom_email_link, project_manager_name")
        .order("company_name");
      if (error) throw error;
      return data;
    },
  });

  const branding = brandings?.find((b) => b.id === selectedBrandingId);
  const companyName = branding?.company_name || "Unternehmen";
  const mainJobTitle = (branding as any)?.main_job_title || "";
  const brandColor = branding?.brand_color || "#3B82F6";
  const footerParts = [branding?.street, `${branding?.zip_code || ""} ${branding?.city || ""}`.trim()].filter(Boolean);
  const footerAddress = footerParts.join(", ");

  const tpl = templates[selectedIdx];

  const footerDetails = branding ? {
    managingDirector: branding.managing_director || undefined,
    phone: branding.phone || undefined,
    registerCourt: branding.register_court || undefined,
    tradeRegister: branding.trade_register || undefined,
    vatId: branding.vat_id || undefined,
  } : undefined;

  // For the "gespraech_erfolgreich" template, override the button URL with the
  // branding's actual base URL (custom email link if enabled, otherwise prefix.domain).
  const dynamicButtonUrl = useMemo(() => {
    if (!["gespraech_erfolgreich", "panel_link"].includes(tpl.eventType) || !branding) return tpl.buttonUrl;
    const b = branding as any;
    if (b.custom_email_link_enabled && b.custom_email_link) {
      const link = String(b.custom_email_link).replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
      return `https://${link}`;
    }
    if (b.domain) {
      const domain = String(b.domain).replace(/^https?:\/\//, "").replace(/\/$/, "");
      const prefix = b.subdomain_prefix || "web";
      return `https://${prefix}.${domain}`;
    }
    return tpl.buttonUrl;
  }, [tpl, branding]);

  const suppressLogo = tpl.eventType.startsWith("bewerbung_angenommen");

  const html = useMemo(
    () =>
      buildEmailHtml({
        companyName,
        brandColor,
        bodyTitle: tpl.bodyTitle,
        bodyLines: tpl
          .bodyLines(companyName, mainJobTitle)
          .flatMap((line) => {
            if (!line.includes("Michael Schreiber")) return [line];
            const pm = ((branding as any)?.project_manager_name || "").trim();
            return pm ? [line.replace("Michael Schreiber", pm)] : [];
          }),
        buttonText: tpl.buttonText,
        buttonUrl: dynamicButtonUrl,
        footerLines: tpl.footerLines,
        footerAddress,
        footerDetails,
        emailLogoEnabled: suppressLogo ? false : ((branding as any)?.email_logo_enabled || false),
        emailLogoUrl: suppressLogo ? undefined : ((branding as any)?.email_logo_url || undefined),
      }),
    [companyName, brandColor, tpl, dynamicButtonUrl, footerAddress, branding, suppressLogo, mainJobTitle, footerDetails],
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">E-Mail-Vorlagen</h2>
          <p className="text-muted-foreground mt-1">Vorschau aller E-Mail-Benachrichtigungen mit Beispieldaten.</p>
        </div>
        <Select value={selectedBrandingId} onValueChange={setSelectedBrandingId}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="Branding waehlen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Standard (kein Branding)</SelectItem>
            {brandings?.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.company_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex gap-6">
        {/* Template list */}
        <div className="w-[280px] shrink-0 space-y-1">
          {templates.map((t, i) => (
            <button
              key={t.eventType}
              onClick={() => setSelectedIdx(i)}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors",
                i === selectedIdx
                  ? "bg-primary text-primary-foreground font-medium"
                  : "hover:bg-muted text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="flex-1 min-w-0">
          <div className="premium-card overflow-hidden">
            {/* Meta bar */}
            <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Vorschau</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Betreff: <span className="font-medium text-foreground">{tpl.subject(companyName)}</span>
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                <Mail className="h-3 w-3 mr-1" />
                {tpl.eventType}
              </Badge>
            </div>

            {/* iframe */}
            <iframe
              srcDoc={html}
              title="E-Mail-Vorschau"
              className="w-full border-0"
              style={{ height: 620 }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </motion.div>
    </>
  );
}
