import { useState, useEffect } from "react";
import MetaPixel from "@/components/MetaPixel";
import { useNavigate, useLocation } from "react-router-dom";
import { publicSupabase as supabase } from "@/integrations/supabase/publicClient";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowRight, ArrowLeft, Clock, Home, MessageCircle, XCircle } from "lucide-react";
import { ContactCard } from "@/components/ContactCard";
import { hexToHSL } from "@/lib/hexToHSL";
import { buildKarriereLink } from "@/lib/buildKarriereLink";

interface BrandingData {
  id: string;
  company_name: string;
  logo_url: string | null;
  brand_color: string | null;
  favicon_url: string | null;
  recruiter_name: string | null;
  recruiter_title: string | null;
  recruiter_image_url: string | null;
  meta_pixel_id: string | null;
  meta_pixel_enabled: boolean | null;
  domain: string | null;
  custom_email_link_enabled: boolean | null;
  custom_email_link: string | null;
}

export default function BewerbungsgespraechPublic() {
  const navigate = useNavigate();
  const location = useLocation();
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [brandingReady, setBrandingReady] = useState(false);
  const [step, setStep] = useState<"intro" | "form">("intro");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [citizenship, setCitizenship] = useState<"ja" | "nein" | null>(null);
  const citizenshipRequired = location.pathname === "/bewerbungsgespraech/buchen";

  useEffect(() => {
    const fetchBranding = async () => {
      const host = window.location.hostname.toLowerCase();
      const parts = host.split(".");
      const root = parts.length > 2 ? parts.slice(-2).join(".") : host;
      const norm = (s: string) =>
        s.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "").toLowerCase().trim();
      const cols = "id, company_name, logo_url, brand_color, favicon_url, recruiter_name, recruiter_title, recruiter_image_url, meta_pixel_id, meta_pixel_enabled, domain, custom_email_link_enabled, custom_email_link";

      const { data } = await supabase
        .from("brandings")
        .select(cols)
        .eq("domain", root)
        .maybeSingle();

      if (data) {
        setBranding(data as BrandingData);
      } else {
        const { data: extra } = await supabase
          .from("brandings")
          .select(cols)
          .overlaps("additional_domains", [host, root, norm(host), norm(root)])
          .maybeSingle();
        if (extra) {
          setBranding(extra as BrandingData);
          setBrandingReady(true);
          return;
        }
        const { data: customs } = await supabase
          .from("brandings")
          .select(cols)
          .eq("custom_email_link_enabled", true);
        const match = (customs ?? []).find(
          (r: any) => r.custom_email_link && [host, root].includes(norm(r.custom_email_link))
        );
        if (match) {
          setBranding(match as BrandingData);
        } else {
          const { data: fallback } = await supabase
            .from("brandings")
            .select(cols)
            .eq("domain", "frik-maxeiner.de")
            .maybeSingle();
          if (fallback) setBranding(fallback as BrandingData);
        }
      }
      setBrandingReady(true);
    };
    fetchBranding();
  }, []);


  useEffect(() => {
    const el = document.getElementById("app-favicon") as HTMLLinkElement | null;
    if (el) el.href = branding?.favicon_url || "/favicon.png";
  }, [branding]);

  const brandColor = branding?.brand_color || "#3B82F6";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      toast.error("Bitte füllen Sie alle Felder aus.");
      return;
    }
    if (citizenshipRequired && citizenship !== "ja") {
      toast.error("Bitte bestätigen Sie die deutsche Staatsbürgerschaft.");
      return;
    }
    if (!branding?.id) {
      toast.error("Branding konnte nicht ermittelt werden.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("first_name", firstName.trim());
      formData.append("last_name", lastName.trim());
      formData.append("email", email.trim());
      formData.append("phone", phone.trim());
      formData.append("branding_id", branding.id);
      formData.append("auto_accept", "true");
      formData.append("skip_acceptance_email", "true");
      if (citizenshipRequired) formData.append("public_booking", "true");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/submit-application`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${anonKey}`,
        },
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) {
        if (result?.code === "blacklisted" || result?.error === "blacklisted") {
          setRejected(true);
          return;
        }
        throw new Error(result.error || "Fehler beim Absenden");
      }

      if (branding.meta_pixel_enabled && branding.meta_pixel_id) {
        sessionStorage.setItem("public_booking_lead", "1");
      }
      navigate(`/bewerbungsgespraech/${result.application_id}`);
    } catch (err: any) {
      toast.error(err.message || "Ein Fehler ist aufgetreten.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!brandingReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rejected) {
    const hsl = brandColor !== "#3B82F6" ? hexToHSL(brandColor) : null;
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 p-4 md:p-8 flex items-start justify-center"
        style={hsl ? ({ "--primary": hsl } as React.CSSProperties) : undefined}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full mt-8 md:mt-16"
        >
          {branding?.logo_url && (
            <img
              src={branding.logo_url}
              alt={branding.company_name || "Logo"}
              className="h-12 mx-auto object-contain mb-8 drop-shadow-sm"
            />
          )}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-0 shadow-xl overflow-hidden">
            <div className="h-1.5 bg-destructive" />
            <div className="p-8 text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
                <XCircle className="h-7 w-7 text-destructive" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">Bewerbungsgespräch abgelehnt</h1>
              <p className="text-sm text-muted-foreground">
                Ihre Anfrage kann leider nicht berücksichtigt werden, da Sie sich bereits bei zu vielen
                Unternehmen beworben haben. Eine Terminbuchung ist daher nicht möglich.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }


  const hslStr = brandColor !== "#3B82F6" ? hexToHSL(brandColor) : null;

  return (
    <>
      {location.pathname === "/bewerbungsgespraech/buchen" && branding?.meta_pixel_enabled && branding?.meta_pixel_id && (
        <MetaPixel pixelId={branding.meta_pixel_id} />
      )}
      <div
        className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 p-4 md:p-8 flex items-start justify-center"
        style={hslStr ? { "--primary": hslStr } as React.CSSProperties : undefined}
      >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full mt-8 md:mt-16"
      >
        {branding?.logo_url && (
          <motion.img
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            src={branding.logo_url}
            alt={branding.company_name || "Logo"}
            className="h-12 mx-auto object-contain mb-8 drop-shadow-sm"
          />
        )}

        {branding?.recruiter_name && (
          <ContactCard
            name={branding.recruiter_name}
            title={branding.recruiter_title}
            imageUrl={branding.recruiter_image_url}
            brandColor={brandColor}
            label="Ihr Ansprechpartner"
          />
        )}

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-0 shadow-xl overflow-hidden">
          <div className="h-1.5" style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}99)` }} />

          <div className="p-6">
            <AnimatePresence mode="wait">
              {step === "intro" ? (
                <motion.div
                  key="intro"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight">
                      Kennenlerngespräch buchen
                    </h1>
                    <p className="text-base font-medium" style={{ color: brandColor }}>
                      Prozesstester (m/w/d) im Homeoffice
                    </p>
                  </div>

                  <div className="space-y-4 text-sm text-muted-foreground">
                    <div className="flex items-start gap-3">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${brandColor}12` }}
                      >
                        <MessageCircle className="h-4 w-4" style={{ color: brandColor }} />
                      </div>
                      <p className="pt-1.5">
                        Lernen Sie uns in einem kurzen, unverbindlichen Gespräch kennen.
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${brandColor}12` }}
                      >
                        <Clock className="h-4 w-4" style={{ color: brandColor }} />
                      </div>
                      <p className="pt-1.5">
                        Dauer: nur 10–15 Minuten.
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${brandColor}12` }}
                      >
                        <Home className="h-4 w-4" style={{ color: brandColor }} />
                      </div>
                      <p className="pt-1.5">
                        Ihr persönlicher Ansprechpartner <span className="font-semibold text-foreground">Jonas Hagenauer</span> begleitet Sie durch den Bewerbungsprozess und beantwortet Ihre Fragen.
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => setStep("form")}
                    className="w-full rounded-xl h-11 font-medium text-white"
                    style={{ backgroundColor: brandColor }}
                  >
                    Weiter
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">
                      Kennenlerngespräch buchen
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Tragen Sie Ihre Daten ein, um einen Termin zu vereinbaren.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="firstName">Vorname</Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Max"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="lastName">Nachname</Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Mustermann"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email">E-Mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="max@beispiel.de"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Telefonnummer</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+49 123 4567890"
                        required
                      />
                    </div>

                    {citizenshipRequired && (
                      <div className="space-y-2">
                        <Label>Besitzen Sie die deutsche Staatsbürgerschaft?</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {(["ja", "nein"] as const).map((val) => (
                            <Button
                              key={val}
                              type="button"
                              variant={citizenship === val ? "default" : "outline"}
                              className="rounded-xl h-10"
                              style={citizenship === val ? { backgroundColor: brandColor } : undefined}
                              onClick={() => setCitizenship(val)}
                            >
                              {val === "ja" ? "Ja" : "Nein"}
                            </Button>
                          ))}
                        </div>
                        {citizenship === "nein" && (
                          <p className="text-sm text-destructive">
                            Für diese Position berücksichtigen wir ausschließlich Bewerberinnen und Bewerber mit deutscher Staatsbürgerschaft. Bitte bewerben Sie sich nur, wenn Sie diese Voraussetzung erfüllen.
                          </p>
                        )}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full rounded-xl h-11 font-medium"
                      style={{ backgroundColor: brandColor }}
                      disabled={submitting || (citizenshipRequired && citizenship !== "ja")}
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Weiter zur Terminbuchung"
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full h-9 text-muted-foreground"
                      onClick={() => setStep("intro")}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Zurück zur Übersicht
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {buildKarriereLink(branding) && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Besuchen Sie auch unsere{" "}
            <a
              href={buildKarriereLink(branding)!}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-2"
              style={{ color: brandColor }}
            >
              Karriereseite
            </a>
          </p>
        )}


        {branding?.company_name && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <div className="h-px w-8 bg-slate-200" />
            <p className="text-xs text-muted-foreground/60">Powered by {branding.company_name}</p>
            <div className="h-px w-8 bg-slate-200" />
          </div>
        )}
      </motion.div>
    </div>
    </>
  );
}
