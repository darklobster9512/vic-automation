import { useState, useEffect } from "react";
import MetaPixel from "@/components/MetaPixel";
import { useNavigate } from "react-router-dom";
import { publicSupabase as supabase } from "@/integrations/supabase/publicClient";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ContactCard } from "@/components/ContactCard";
import { hexToHSL } from "@/lib/hexToHSL";

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
}

export default function BewerbungsgespraechPublic() {
  const navigate = useNavigate();
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [brandingReady, setBrandingReady] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchBranding = async () => {
      const host = window.location.hostname.toLowerCase();
      const parts = host.split(".");
      const root = parts.length > 2 ? parts.slice(-2).join(".") : host;
      const norm = (s: string) =>
        s.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "").toLowerCase().trim();
      const cols = "id, company_name, logo_url, brand_color, favicon_url, recruiter_name, recruiter_title, recruiter_image_url, meta_pixel_id";

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
          .select(`${cols}, custom_email_link`)
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
        throw new Error(result.error || "Fehler beim Absenden");
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

  const hslStr = brandColor !== "#3B82F6" ? hexToHSL(brandColor) : null;

  return (
    <>
      {branding?.meta_pixel_id && <MetaPixel pixelId={branding.meta_pixel_id} />}
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
            <h1 className="text-2xl font-semibold tracking-tight mb-1">
              Bewerbungsgespräch buchen
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              Tragen Sie Ihre Daten ein, um einen Termin zu vereinbaren.
            </p>

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

              <Button
                type="submit"
                className="w-full rounded-xl h-11 font-medium"
                style={{ backgroundColor: brandColor }}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Weiter zur Terminbuchung"
                )}
              </Button>
            </form>
          </div>
        </div>

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
