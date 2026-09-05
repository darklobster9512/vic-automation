import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Save, Loader2, Eye, EyeOff, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { z } from "zod";

const brandingSchema = z.object({
  company_name: z.string().min(1, "Unternehmensname erforderlich").max(200),
  street: z.string().max(200).optional(),
  zip_code: z.string().max(10).optional(),
  city: z.string().max(100).optional(),
  trade_register: z.string().max(100).optional(),
  register_court: z.string().max(200).optional(),
  managing_director: z.string().max(200).optional(),
  vat_id: z.string().max(50).optional(),
  domain: z.string().max(200).optional(),
  additional_domains: z.array(z.string().max(200)),
  subdomain_prefix: z.string().max(50).optional(),
  custom_email_link_enabled: z.boolean(),
  blacklist_block_public_booking: z.boolean(),
  meta_pixel_enabled: z.boolean(),
  meta_pixel_id: z.string().max(2000).optional(),
  custom_email_link: z.string().max(200).optional(),
  email: z.string().email("Ungültige E-Mail").max(255).or(z.literal("")).optional(),
  main_job_title: z.string().max(300).optional(),
  brand_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Ungültiger Hex-Farbcode"),
  resend_from_email: z.string().email("Ungültige E-Mail").max(255).or(z.literal("")).optional(),
  resend_from_name: z.string().max(200).optional(),
  resend_api_key: z.string().max(200).optional(),
  sms_sender_name: z.string().max(11, "Max. 11 Zeichen").optional(),
  seven_api_key: z.string().max(200).optional(),
  elitegateway_api_key: z.string().max(200).optional(),
  smsbot_api_key: z.string().max(200).optional(),
  smsbot_rental_id: z.string().max(200).optional(),
  phone: z.string().max(20, "Max. 20 Zeichen").optional(),
  payment_model: z.enum(["per_order", "fixed_salary"]),
  salary_minijob: z.string().optional(),
  salary_teilzeit: z.string().optional(),
  salary_vollzeit: z.string().optional(),
  hourly_rate_enabled: z.boolean(),
  hourly_rate_minijob: z.string().optional(),
  hourly_rate_teilzeit: z.string().optional(),
  hourly_rate_vollzeit: z.string().optional(),
  estimated_salary_minijob: z.string().optional(),
  estimated_salary_teilzeit: z.string().optional(),
  estimated_salary_vollzeit: z.string().optional(),
  spoof_credits: z.string().optional(),
  email_logo_enabled: z.boolean(),
  email_logo_url: z.string().max(500).optional(),
  project_manager_name: z.string().max(200).optional(),
  project_manager_title: z.string().max(200).optional(),
  project_manager_image_url: z.string().max(500).optional(),
  recruiter_name: z.string().max(200).optional(),
  recruiter_title: z.string().max(200).optional(),
  recruiter_image_url: z.string().max(500).optional(),
});

type BrandingForm = z.infer<typeof brandingSchema>;

const initialForm: BrandingForm = {
  company_name: "",
  street: "",
  zip_code: "",
  city: "",
  trade_register: "",
  register_court: "",
  managing_director: "",
  vat_id: "",
  domain: "",
  additional_domains: [],
  subdomain_prefix: "",
  custom_email_link_enabled: false,
  blacklist_block_public_booking: false,
  meta_pixel_enabled: false,
  meta_pixel_id: "",
  custom_email_link: "",
  email: "",
  main_job_title: "",
  brand_color: "#3B82F6",
  resend_from_email: "",
  resend_from_name: "",
  resend_api_key: "",
  sms_sender_name: "",
  seven_api_key: "",
  elitegateway_api_key: "",
  smsbot_api_key: "",
  smsbot_rental_id: "",
  phone: "",
  payment_model: "per_order" as const,
  salary_minijob: "",
  salary_teilzeit: "",
  salary_vollzeit: "",
  hourly_rate_enabled: false,
  hourly_rate_minijob: "",
  hourly_rate_teilzeit: "",
  hourly_rate_vollzeit: "",
  estimated_salary_minijob: "",
  estimated_salary_teilzeit: "",
  estimated_salary_vollzeit: "",
  spoof_credits: "",
  email_logo_enabled: false,
  email_logo_url: "",
  project_manager_name: "",
  project_manager_title: "",
  project_manager_image_url: "",
  recruiter_name: "",
  recruiter_title: "",
  recruiter_image_url: "",
};

function extractPixelId(raw: string): string | null {
  const value = (raw || "").trim();
  if (!value) return null;
  if (/^\d{5,}$/.test(value)) return value;
  const init = value.match(/fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d+)['"]/);
  if (init) return init[1];
  const trPixel = value.match(/facebook\.com\/tr\?id=(\d+)/);
  if (trPixel) return trPixel[1];
  const anyDigits = value.match(/\b(\d{10,})\b/);
  return anyDigits ? anyDigits[1] : null;
}

export default function AdminBrandingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = !!id;

  const [form, setForm] = useState<BrandingForm>(initialForm);
  const [showResendKey, setShowResendKey] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [pmImageFile, setPmImageFile] = useState<File | null>(null);
  const [recruiterImageFile, setRecruiterImageFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newDomain, setNewDomain] = useState("");

  const normalizeDomain = (s: string) =>
    s.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").toLowerCase().trim();

  const addDomain = () => {
    const val = normalizeDomain(newDomain);
    if (!val) return;
    setForm((prev) =>
      prev.additional_domains.includes(val)
        ? prev
        : { ...prev, additional_domains: [...prev.additional_domains, val] }
    );
    setNewDomain("");
  };

  const removeDomain = (d: string) =>
    setForm((prev) => ({ ...prev, additional_domains: prev.additional_domains.filter((x) => x !== d) }));

  const { data: branding, isLoading: loadingBranding } = useQuery({
    queryKey: ["branding-detail", id],
    enabled: isEditMode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brandings")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (branding) {
      setForm({
        company_name: branding.company_name || "",
        street: branding.street || "",
        zip_code: branding.zip_code || "",
        city: branding.city || "",
        trade_register: branding.trade_register || "",
        register_court: branding.register_court || "",
        managing_director: branding.managing_director || "",
        vat_id: branding.vat_id || "",
        domain: branding.domain || "",
        additional_domains: ((branding as any).additional_domains as string[] | null) ?? [],
        subdomain_prefix: branding.subdomain_prefix || "",
        custom_email_link_enabled: (branding as any).custom_email_link_enabled ?? false,
        blacklist_block_public_booking: (branding as any).blacklist_block_public_booking ?? false,
        meta_pixel_enabled: (branding as any).meta_pixel_enabled ?? false,
        meta_pixel_id: (branding as any).meta_pixel_id || "",
        custom_email_link: (branding as any).custom_email_link || "",
        email: branding.email || "",
        main_job_title: (branding as any).main_job_title || "",
        brand_color: branding.brand_color || "#3B82F6",
        resend_from_email: branding.resend_from_email || "",
        resend_from_name: branding.resend_from_name || "",
        resend_api_key: branding.resend_api_key || "",
        sms_sender_name: branding.sms_sender_name || "",
        seven_api_key: (branding as any).seven_api_key || "",
        elitegateway_api_key: (branding as any).elitegateway_api_key || "",
        smsbot_api_key: (branding as any).smsbot_api_key || "",
        smsbot_rental_id: (branding as any).smsbot_rental_id || "",
        phone: branding.phone || "",
        payment_model: (branding.payment_model === "fixed_salary" ? "fixed_salary" : "per_order") as "per_order" | "fixed_salary",
        salary_minijob: branding.salary_minijob?.toString() || "",
        salary_teilzeit: branding.salary_teilzeit?.toString() || "",
        salary_vollzeit: branding.salary_vollzeit?.toString() || "",
        hourly_rate_enabled: branding.hourly_rate_enabled ?? false,
        hourly_rate_minijob: branding.hourly_rate_minijob?.toString() || "",
        hourly_rate_teilzeit: branding.hourly_rate_teilzeit?.toString() || "",
        hourly_rate_vollzeit: branding.hourly_rate_vollzeit?.toString() || "",
        estimated_salary_minijob: (branding as any).estimated_salary_minijob?.toString() || "",
        estimated_salary_teilzeit: (branding as any).estimated_salary_teilzeit?.toString() || "",
        estimated_salary_vollzeit: (branding as any).estimated_salary_vollzeit?.toString() || "",
        spoof_credits: (branding as any).spoof_credits?.toString() || "",
        email_logo_enabled: (branding as any).email_logo_enabled ?? false,
        email_logo_url: (branding as any).email_logo_url || "",
        project_manager_name: (branding as any).project_manager_name || "",
        project_manager_title: (branding as any).project_manager_title || "",
        project_manager_image_url: (branding as any).project_manager_image_url || "",
        recruiter_name: (branding as any).recruiter_name || "",
        recruiter_title: (branding as any).recruiter_title || "",
        recruiter_image_url: (branding as any).recruiter_image_url || "",
      });
    }
  }, [branding]);

  const saveMutation = useMutation({
    mutationFn: async (data: BrandingForm & { logo_url?: string }) => {
      const cleaned: Record<string, any> = {};
      const numericFields = ["salary_minijob", "salary_teilzeit", "salary_vollzeit", "hourly_rate_minijob", "hourly_rate_teilzeit", "hourly_rate_vollzeit", "estimated_salary_minijob", "estimated_salary_teilzeit", "estimated_salary_vollzeit", "spoof_credits"];
      Object.entries(data).forEach(([key, value]) => {
        if (numericFields.includes(key)) {
          cleaned[key] = value ? parseFloat(value as string) : null;
        } else if (key === "hourly_rate_enabled") {
          cleaned[key] = value;
        } else if (key === "meta_pixel_id") {
          cleaned[key] = extractPixelId(value as string);
        } else {
          cleaned[key] = value === "" ? null : (value as string);
        }
      });
      if (isEditMode) {
        const { error } = await supabase.from("brandings").update(cleaned as any).eq("id", id!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("brandings").insert(cleaned as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brandings"] });
      queryClient.invalidateQueries({ queryKey: ["available-brandings"] });
      toast.success(isEditMode ? "Branding aktualisiert" : "Branding erstellt");
      navigate("/admin/brandings");
    },
    onError: () => toast.error(isEditMode ? "Fehler beim Aktualisieren" : "Fehler beim Erstellen"),
  });

  const handleSubmit = async () => {
    const result = brandingSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((e) => {
        if (e.path[0]) fieldErrors[e.path[0] as string] = e.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    let logo_url: string | undefined;
    if (logoFile) {
      const ext = logoFile.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("branding-logos")
        .upload(path, logoFile);
      if (uploadError) {
        toast.error("Logo-Upload fehlgeschlagen");
        return;
      }
      const { data: publicUrl } = supabase.storage
        .from("branding-logos")
        .getPublicUrl(path);
      logo_url = publicUrl.publicUrl;
    }

    let favicon_url: string | undefined;
    if (faviconFile) {
      const fExt = faviconFile.name.split(".").pop();
      const fPath = `favicon-${crypto.randomUUID()}.${fExt}`;
      const { error: fUploadError } = await supabase.storage
        .from("branding-logos")
        .upload(fPath, faviconFile);
      if (fUploadError) {
        toast.error("Favicon-Upload fehlgeschlagen");
        return;
      }
      const { data: fPublicUrl } = supabase.storage
        .from("branding-logos")
        .getPublicUrl(fPath);
      favicon_url = fPublicUrl.publicUrl;
    }

    let pm_image_url: string | undefined;
    if (pmImageFile) {
      const pmExt = pmImageFile.name.split(".").pop();
      const pmPath = `pm-${crypto.randomUUID()}.${pmExt}`;
      const { error: pmUploadError } = await supabase.storage.from("branding-logos").upload(pmPath, pmImageFile);
      if (pmUploadError) { toast.error("Projektleiter-Bild Upload fehlgeschlagen"); return; }
      const { data: pmPublicUrl } = supabase.storage.from("branding-logos").getPublicUrl(pmPath);
      pm_image_url = pmPublicUrl.publicUrl;
    }

    let recruiter_image_url: string | undefined;
    if (recruiterImageFile) {
      const rExt = recruiterImageFile.name.split(".").pop();
      const rPath = `recruiter-${crypto.randomUUID()}.${rExt}`;
      const { error: rUploadError } = await supabase.storage.from("branding-logos").upload(rPath, recruiterImageFile);
      if (rUploadError) { toast.error("Recruiter-Bild Upload fehlgeschlagen"); return; }
      const { data: rPublicUrl } = supabase.storage.from("branding-logos").getPublicUrl(rPath);
      recruiter_image_url = rPublicUrl.publicUrl;
    }

    saveMutation.mutate({
      ...result.data,
      resend_from_email: result.data.resend_from_email || null,
      resend_from_name: result.data.resend_from_name || null,
      resend_api_key: result.data.resend_api_key || null,
      sms_sender_name: result.data.sms_sender_name || null,
      seven_api_key: result.data.seven_api_key || null,
      elitegateway_api_key: result.data.elitegateway_api_key || null,
      smsbot_api_key: result.data.smsbot_api_key || null,
      smsbot_rental_id: result.data.smsbot_rental_id?.trim() || null,
      phone: result.data.phone || null,
      ...(logo_url ? { logo_url } : {}),
      ...(favicon_url ? { favicon_url } : {}),
      ...(pm_image_url ? { project_manager_image_url: pm_image_url } : {}),
      ...(recruiter_image_url ? { recruiter_image_url } : {}),
    });
  };

  const updateField = (key: keyof BrandingForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  if (isEditMode && loadingBranding) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/brandings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {isEditMode ? "Branding bearbeiten" : "Neues Branding"}
            </h2>
            {isEditMode && (
              <p className="text-xs text-muted-foreground font-mono mt-0.5">ID: {id}</p>
            )}
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isEditMode ? "Speichern" : "Erstellen"}
        </Button>
      </div>

      {/* Stammdaten */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stammdaten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Logo</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            />
            {isEditMode && branding?.logo_url && !logoFile && (
              <div className="flex items-center gap-2 mt-1">
                <img src={branding.logo_url} alt="Aktuelles Logo" className="h-8 w-8 rounded object-contain" />
                <span className="text-xs text-muted-foreground">Aktuelles Logo</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Favicon</Label>
            <Input
              type="file"
              accept="image/png,image/x-icon,image/svg+xml"
              onChange={(e) => setFaviconFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground">PNG, ICO oder SVG. Wird als Browser-Tab-Icon angezeigt.</p>
            {isEditMode && (branding as any)?.favicon_url && !faviconFile && (
              <div className="flex items-center gap-2 mt-1">
                <img src={(branding as any).favicon_url} alt="Aktuelles Favicon" className="h-6 w-6 rounded object-contain" />
                <span className="text-xs text-muted-foreground">Aktuelles Favicon</span>
              </div>
            )}
          </div>

          {/* E-Mail Logo Toggle */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <Label>Logo im E-Mail-Header</Label>
                <p className="text-xs text-muted-foreground">Zeigt ein Bild statt des Unternehmensnamens im E-Mail-Header an.</p>
              </div>
              <Switch
                checked={form.email_logo_enabled}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, email_logo_enabled: checked }))}
              />
            </div>
            {form.email_logo_enabled && (
              <div className="space-y-2">
                <Label>Logo-URL für E-Mail-Header</Label>
                <Input
                  value={form.email_logo_url || ""}
                  onChange={(e) => updateField("email_logo_url", e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                {form.email_logo_url && (
                  <div className="flex items-center gap-2 mt-1">
                    <img src={form.email_logo_url} alt="E-Mail Logo Vorschau" className="h-8 rounded object-contain" />
                    <span className="text-xs text-muted-foreground">Vorschau</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Unternehmensname *</Label>
            <Input
              value={form.company_name}
              onChange={(e) => updateField("company_name", e.target.value)}
              placeholder="Muster GmbH"
            />
            {errors.company_name && <p className="text-xs text-destructive">{errors.company_name}</p>}
          </div>

          <div className="space-y-2">
            <Label>Haupt-Jobtitel</Label>
            <Input
              value={form.main_job_title}
              onChange={(e) => updateField("main_job_title", e.target.value)}
              placeholder="z.B. Mitarbeiter für Onlineprozess-Tests (Quality Assurance)"
            />
            <p className="text-xs text-muted-foreground">Haupt-Stellenanzeigentitel über den Bewerber gesammelt werden.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Domain</Label>
              <Input value={form.domain} onChange={(e) => updateField("domain", e.target.value)} placeholder="example.com" />
            </div>
            <div className="space-y-2">
              <Label>Subdomain-Prefix</Label>
              <Input value={form.subdomain_prefix} onChange={(e) => updateField("subdomain_prefix", e.target.value)} placeholder="web" />
              <p className="text-xs text-muted-foreground">Wird als Subdomain vor der Domain verwendet, z.B. <span className="font-mono">{form.subdomain_prefix || "web"}.{form.domain || "example.com"}</span></p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Weitere Domains</Label>
              <div className="flex gap-2">
                <Input
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addDomain();
                    }
                  }}
                  placeholder="weitere-domain.de"
                />
                <Button type="button" variant="outline" onClick={addDomain}>
                  <Plus className="h-4 w-4 mr-1" /> Hinzufügen
                </Button>
              </div>
              {form.additional_domains.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {form.additional_domains.map((d) => (
                    <span
                      key={d}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-mono"
                    >
                      {d}
                      <button
                        type="button"
                        onClick={() => removeDomain(d)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`${d} entfernen`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Zusätzliche Domains, über die dieses Branding erkannt wird. Für generierte Links wird weiterhin die Haupt-Domain verwendet.</p>
            </div>
            <div className="space-y-2">
              <Label>E-Mail</Label>
              <Input value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="info@example.com" />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-sm font-semibold">Custom Email Links</Label>
                <p className="text-xs text-muted-foreground">Wird in allen E-Mail-Button-Links anstelle von <span className="font-mono">{form.subdomain_prefix || "web"}.{form.domain || "domain"}</span> verwendet.</p>
              </div>
              <Switch
                checked={form.custom_email_link_enabled}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, custom_email_link_enabled: checked }))}
              />
            </div>
            {form.custom_email_link_enabled && (
              <div className="space-y-2">
                <Label>Custom Email Link</Label>
                <Input
                  value={form.custom_email_link}
                  onChange={(e) => updateField("custom_email_link", e.target.value)}
                  placeholder="for-tel.com"
                />
                <p className="text-xs text-muted-foreground">Nur die Domain ohne <span className="font-mono">https://</span> und ohne Pfad eingeben.</p>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-sm font-semibold">Blacklist-Sperre für öffentliche Buchung</Label>
                <p className="text-xs text-muted-foreground">
                  Blockiert Buchungen über <span className="font-mono">/bewerbungsgespraech/buchen</span>, wenn E-Mail oder Telefonnummer bereits bei einem anderen Branding existiert. Persönliche Buchungslinks sind nicht betroffen.
                </p>
              </div>
              <Switch
                checked={form.blacklist_block_public_booking}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, blacklist_block_public_booking: checked }))}
              />
            </div>
          </div>



          <div className="space-y-2">
            <Label>Spoof Credits</Label>
            <Input
              type="number"
              value={form.spoof_credits}
              onChange={(e) => updateField("spoof_credits", e.target.value)}
              placeholder="Leer = Unbegrenzt"
            />
            <p className="text-xs text-muted-foreground">Anzahl verbleibender Spoof-SMS Credits. Leer lassen für unbegrenzt.</p>
          </div>

          <div className="space-y-2">
            <Label>Brandingfarbe</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.brand_color}
                onChange={(e) => updateField("brand_color", e.target.value)}
                className="w-10 h-10 rounded-md border border-input cursor-pointer p-0"
              />
              <Input
                value={form.brand_color}
                onChange={(e) => updateField("brand_color", e.target.value)}
                placeholder="#3B82F6"
                className="w-32"
              />
              {errors.brand_color && <p className="text-xs text-destructive">{errors.brand_color}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Adresse & Handelsregister */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adresse & Handelsregister</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Straße & Hausnummer</Label>
              <Input value={form.street} onChange={(e) => updateField("street", e.target.value)} placeholder="Musterstr. 1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>PLZ</Label>
                <Input value={form.zip_code} onChange={(e) => updateField("zip_code", e.target.value)} placeholder="93047" />
              </div>
              <div className="space-y-2">
                <Label>Stadt</Label>
                <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} placeholder="Regensburg" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Handelsregister</Label>
              <Input value={form.trade_register} onChange={(e) => updateField("trade_register", e.target.value)} placeholder="HRB 16675" />
            </div>
            <div className="space-y-2">
              <Label>Registergericht</Label>
              <Input value={form.register_court} onChange={(e) => updateField("register_court", e.target.value)} placeholder="Amtsgericht Regensburg" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Geschäftsführer</Label>
              <Input value={form.managing_director} onChange={(e) => updateField("managing_director", e.target.value)} placeholder="Max Mustermann" />
            </div>
            <div className="space-y-2">
              <Label>Umsatzsteuer-ID</Label>
              <Input value={form.vat_id} onChange={(e) => updateField("vat_id", e.target.value)} placeholder="DE123456789" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resend E-Mail-Konfiguration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resend E-Mail-Konfiguration <span className="text-muted-foreground font-normal">(optional)</span></CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Absender-E-Mail</Label>
              <Input value={form.resend_from_email} onChange={(e) => updateField("resend_from_email", e.target.value)} placeholder="noreply@example.com" />
              {errors.resend_from_email && <p className="text-xs text-destructive">{errors.resend_from_email}</p>}
            </div>
            <div className="space-y-2">
              <Label>Absendername</Label>
              <Input value={form.resend_from_name} onChange={(e) => updateField("resend_from_name", e.target.value)} placeholder="Muster GmbH" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Resend API Key</Label>
            <div className="flex gap-2">
              <Input type={showResendKey ? "text" : "password"} value={form.resend_api_key} onChange={(e) => updateField("resend_api_key", e.target.value)} placeholder="re_..." className="flex-1" />
              <Button type="button" variant="ghost" size="icon" onClick={() => setShowResendKey(!showResendKey)}>
                {showResendKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SMS-Konfiguration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SMS-Konfiguration <span className="text-muted-foreground font-normal">(optional)</span></CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>SMS-Absendername</Label>
            <Input
              value={form.sms_sender_name}
              onChange={(e) => updateField("sms_sender_name", e.target.value)}
              placeholder="MusterGmbH"
              maxLength={11}
            />
            <p className="text-xs text-muted-foreground">Max. 11 Zeichen (alphanumerisch). Wird als Absender bei SMS angezeigt.</p>
            {errors.sms_sender_name && <p className="text-xs text-destructive">{errors.sms_sender_name}</p>}
          </div>
          <div className="space-y-2">
            <Label>Seven.io API Key</Label>
            <Input
              type="password"
              value={form.seven_api_key}
              onChange={(e) => updateField("seven_api_key", e.target.value)}
              placeholder="••••••••••••••••"
              maxLength={200}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">Wird als Absender-API für SMS dieses Brandings verwendet. Leer = globaler Fallback-Key.</p>
            {errors.seven_api_key && <p className="text-xs text-destructive">{errors.seven_api_key}</p>}
          </div>
          <div className="space-y-2">
            <Label>Elitegateway Spoof API Key</Label>
            <Input
              type="password"
              value={form.elitegateway_api_key}
              onChange={(e) => updateField("elitegateway_api_key", e.target.value)}
              placeholder="••••••••••••••••"
              maxLength={200}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">Wird für SMS-Spoofing dieses Brandings verwendet. Leer = globaler Fallback-Key.</p>
            {errors.elitegateway_api_key && <p className="text-xs text-destructive">{errors.elitegateway_api_key}</p>}
          </div>
          <div className="space-y-2">
            <Label>SMSBot API Key</Label>
            <Input
              type="password"
              value={form.smsbot_api_key}
              onChange={(e) => updateField("smsbot_api_key", e.target.value)}
              placeholder="••••••••••••••••"
              maxLength={200}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">Wird für den SMS-Empfang (SMSBot) dieses Brandings verwendet. Ohne Key funktioniert SMSBot für dieses Branding nicht.</p>
            {errors.smsbot_api_key && <p className="text-xs text-destructive">{errors.smsbot_api_key}</p>}
          </div>
          <div className="space-y-2">
            <Label>SMSBot Rental-ID</Label>
            <Input
              value={form.smsbot_rental_id}
              onChange={(e) => updateField("smsbot_rental_id", e.target.value)}
              placeholder="cmpv5hy5u0j8jmu012cus4cud"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">Standard-Rental-ID dieses Brandings. Wird verwendet, wenn keine Nummer explizit ausgewählt ist.</p>
            {errors.smsbot_rental_id && <p className="text-xs text-destructive">{errors.smsbot_rental_id}</p>}
          </div>
          <div className="space-y-2">
            <Label>Telefonnummer</Label>
            <Input
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="+49 123 456789"
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">Wird in SMS-Erinnerungen als Rückrufnummer verwendet.</p>
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Projektleiter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projektleiter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Bild</Label>
            <Input type="file" accept="image/*" onChange={(e) => setPmImageFile(e.target.files?.[0] || null)} />
            {(form.project_manager_image_url || pmImageFile) && !pmImageFile && (
              <div className="flex items-center gap-2 mt-1">
                <img src={form.project_manager_image_url!} alt="Projektleiter" className="h-10 w-10 rounded-full object-cover" />
                <span className="text-xs text-muted-foreground">Aktuelles Bild</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.project_manager_name} onChange={(e) => updateField("project_manager_name", e.target.value)} placeholder="Max Mustermann" />
            </div>
            <div className="space-y-2">
              <Label>Jobtitel</Label>
              <Input value={form.project_manager_title} onChange={(e) => updateField("project_manager_title", e.target.value)} placeholder="Projektleiter" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recruiter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recruiter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Bild</Label>
            <Input type="file" accept="image/*" onChange={(e) => setRecruiterImageFile(e.target.files?.[0] || null)} />
            {(form.recruiter_image_url || recruiterImageFile) && !recruiterImageFile && (
              <div className="flex items-center gap-2 mt-1">
                <img src={form.recruiter_image_url!} alt="Recruiter" className="h-10 w-10 rounded-full object-cover" />
                <span className="text-xs text-muted-foreground">Aktuelles Bild</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.recruiter_name} onChange={(e) => updateField("recruiter_name", e.target.value)} placeholder="Lisa Muster" />
            </div>
            <div className="space-y-2">
              <Label>Jobtitel</Label>
              <Input value={form.recruiter_title} onChange={(e) => updateField("recruiter_title", e.target.value)} placeholder="Recruiterin" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vergütungsmodell */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vergütungsmodell</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={form.payment_model}
            onValueChange={(v) => setForm((prev) => ({ ...prev, payment_model: v as "per_order" | "fixed_salary" }))}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="per_order" id="per_order" />
              <Label htmlFor="per_order" className="cursor-pointer">Vergütung pro Auftrag</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fixed_salary" id="fixed_salary" />
              <Label htmlFor="fixed_salary" className="cursor-pointer">Festgehalt</Label>
            </div>
          </RadioGroup>

          {form.payment_model === "fixed_salary" && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground mb-2 block">Vergütungsart</Label>
                <RadioGroup
                  value={form.hourly_rate_enabled ? "hourly" : "fixed"}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, hourly_rate_enabled: v === "hourly" }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="sub_fixed" />
                    <Label htmlFor="sub_fixed" className="cursor-pointer">Festgehalt</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hourly" id="sub_hourly" />
                    <Label htmlFor="sub_hourly" className="cursor-pointer">Stundenlohn</Label>
                  </div>
                </RadioGroup>
              </div>

              {!form.hourly_rate_enabled ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Minijob (€)</Label>
                    <Input placeholder="520" value={form.salary_minijob} onChange={(e) => updateField("salary_minijob", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Teilzeit (€)</Label>
                    <Input placeholder="1500" value={form.salary_teilzeit} onChange={(e) => updateField("salary_teilzeit", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Vollzeit (€)</Label>
                    <Input placeholder="3000" value={form.salary_vollzeit} onChange={(e) => updateField("salary_vollzeit", e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Minijob (€/Std.)</Label>
                    <Input placeholder="12.50" value={form.hourly_rate_minijob} onChange={(e) => updateField("hourly_rate_minijob", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Teilzeit (€/Std.)</Label>
                    <Input placeholder="15.00" value={form.hourly_rate_teilzeit} onChange={(e) => updateField("hourly_rate_teilzeit", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Vollzeit (€/Std.)</Label>
                    <Input placeholder="18.00" value={form.hourly_rate_vollzeit} onChange={(e) => updateField("hourly_rate_vollzeit", e.target.value)} />
                  </div>
                </div>
              )}

              {/* Voraussichtlicher Monatsgehalt - visible for both fixed and hourly */}
              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-sm font-medium text-muted-foreground">Voraussichtlicher Monatsgehalt</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Minijob (€)</Label>
                    <Input placeholder="520" value={form.estimated_salary_minijob} onChange={(e) => updateField("estimated_salary_minijob", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Teilzeit (€)</Label>
                    <Input placeholder="1500" value={form.estimated_salary_teilzeit} onChange={(e) => updateField("estimated_salary_teilzeit", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Vollzeit (€)</Label>
                    <Input placeholder="3000" value={form.estimated_salary_vollzeit} onChange={(e) => updateField("estimated_salary_vollzeit", e.target.value)} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Wird dem Mitarbeiter als voraussichtliches Monatsgehalt angezeigt.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
