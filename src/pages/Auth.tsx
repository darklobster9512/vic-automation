import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { sendEmail } from "@/lib/sendEmail";
import { sendTelegram } from "@/lib/sendTelegram";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Mail, Lock, Eye, EyeOff, User, Phone, Shield,
  Smartphone, ClipboardList, FileText, Star,
  ArrowRight, ArrowLeft, LogIn,
} from "lucide-react";
import { hexToHSL } from "@/lib/hexToHSL";

/** Auth page – login & registration with dynamic domain branding */
const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role } = useUserRole();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [brandingLogoUrl, setBrandingLogoUrl] = useState<string | null>(null);
  const [brandingDomain, setBrandingDomain] = useState<string | null>(null);
  const [brandingColor, setBrandingColor] = useState<string | null>(null);
  const [brandingId, setBrandingId] = useState<string | null>(null);
  const [brandingCompany, setBrandingCompany] = useState<string>("Mitarbeiterportal");
  const [brandingReady, setBrandingReady] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");

  useEffect(() => {
    const fetchBranding = async () => {
      const host = window.location.hostname.toLowerCase();
      const parts = host.split(".");
      const root = parts.length > 2 ? parts.slice(-2).join(".") : host;
      const norm = (s: string) =>
        s.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "").toLowerCase().trim();

      const applyBranding = (data: any) => {
        setBrandingLogoUrl(data.logo_url ?? null);
        setBrandingColor(data.brand_color ?? null);
        setBrandingId(data.id ?? null);
        setBrandingDomain(data.domain ?? null);
        if (data.company_name) setBrandingCompany(data.company_name);
      };

      const { data } = await supabase
        .from("brandings")
        .select("id, logo_url, brand_color, domain, company_name")
        .eq("domain", root)
        .maybeSingle();

      if (data?.logo_url || data?.id) {
        applyBranding(data);
      } else {
        const { data: customs } = await supabase
          .from("brandings")
          .select("id, logo_url, brand_color, domain, company_name, custom_email_link")
          .eq("custom_email_link_enabled", true);
        const match = (customs ?? []).find(
          (r: any) => r.custom_email_link && [host, root].includes(norm(r.custom_email_link))
        );
        if (match) {
          applyBranding(match);
        } else {
          const { data: fallback } = await supabase
            .from("brandings")
            .select("id, logo_url, brand_color, domain, company_name")
            .eq("domain", "frik-maxeiner.de")
            .maybeSingle();
          if (fallback) applyBranding(fallback);
        }
      }
      setBrandingReady(true);
    };
    fetchBranding();
  }, []);

  useEffect(() => {
    if (user && role) {
      navigate(role === "admin" || role === "kunde" || role === "caller" ? "/admin" : "/mitarbeiter", { replace: true });
    }
  }, [user, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Erfolgreich angemeldet!");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword !== regPasswordConfirm) {
      toast.error("Passwörter stimmen nicht überein.");
      return;
    }
    if (regPassword.length < 6) {
      toast.error("Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }
    setLoading(true);
    const { error, data } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
      options: {
        data: {
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          phone: phone.trim() || null,
        },
      },
    });
    if (!error && data.user && brandingId) {
      await supabase.from("profiles").update({ branding_id: brandingId }).eq("id", data.user.id);
      await supabase.from("employment_contracts").insert({
        user_id: data.user.id,
        branding_id: brandingId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: regEmail.trim().toLowerCase(),
        phone: phone.trim() || null,
        status: "offen",
      });
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      await sendEmail({
        to: regEmail,
        recipient_name: fullName,
        subject: "Willkommen – Ihr Konto wurde erstellt",
        body_title: "Willkommen im Mitarbeiterportal",
        body_lines: [
          `Sehr geehrte/r ${fullName},`,
          "Ihr Konto wurde erfolgreich erstellt. Ihnen wurden automatisch Starteraufträge zugewiesen.",
          "Bitte erledigen Sie die Starteraufträge zeitnah. Nach erfolgreicher Überprüfung melden wir uns bei Ihnen nochmal.",
        ],
        branding_id: brandingId || null,
        event_type: "konto_erstellt",
        metadata: {},
      });
      await sendTelegram(
        "konto_erstellt",
        {
          icon: "👤",
          title: "Neuer Mitarbeiter registriert",
          fields: [
            { icon: "👤", label: "Name", value: fullName, bold: true },
            { icon: "✉️", label: "E-Mail", value: regEmail.trim().toLowerCase() },
            { icon: "📱", label: "Telefon", value: phone.trim() },
          ],
          brandingName: brandingCompany,
        },
        brandingId
      );
    }
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Registrierung erfolgreich!");
  };

  if (!brandingReady) {
    return <div className="min-h-screen bg-background" />;
  }

  const authStyle: React.CSSProperties = brandingColor
    ? { '--primary': hexToHSL(brandingColor) || undefined } as React.CSSProperties
    : {};

  const logoInvertClass = brandingDomain === "for-tel.solutions" ? "[filter:brightness(0)_invert(1)]" : "";
  const currentYear = new Date().getFullYear();

  const features = [
    { icon: Smartphone, title: "App-Tests", desc: "iOS & Android prüfen" },
    { icon: ClipboardList, title: "Test-Aufträge", desc: "Zentral zugewiesen & getrackt" },
    { icon: FileText, title: "Befund-Reports", desc: "Schnell dokumentieren & einreichen" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 md:p-8" style={authStyle}>
      <div className="max-w-6xl w-full flex flex-col md:flex-row shadow-2xl rounded-3xl overflow-hidden bg-white min-h-[800px]">
        {/* Left Hero Panel */}
        <div className="hidden md:flex flex-col justify-between w-1/2 bg-primary p-12 text-primary-foreground relative overflow-hidden">
          {/* Grid tile pattern */}
          <div
            className="absolute inset-0 opacity-[0.14] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
          {/* Vignette overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20 pointer-events-none" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full -ml-32 -mb-32 blur-3xl" />

          <div className="relative z-10">

            {/* Hero Content */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase">
                <Shield className="w-3 h-3" />
                {brandingCompany}
              </div>
              <h1 className="text-4xl xl:text-[2.75rem] font-bold leading-[1.1] tracking-tight">
                Mitarbeiterportal für moderne{" "}
                <span className="inline-block border-b-4 border-amber-400 pb-1">
                  App-Sicherheit.
                </span>
              </h1>
              <p className="text-base max-w-md font-medium leading-relaxed opacity-90">
                Verwalte App-Tests, prüfe Reports und arbeite zentral an einer modernen Plattform für App-Sicherheit.
              </p>
            </motion.div>

            {/* Feature Tiles */}
            <div className="grid grid-cols-3 gap-4 mt-12">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.25 + i * 0.1 }}
                  className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 hover:bg-white/15 transition-colors"
                >
                  <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                    <f.icon className="w-5 h-5" />
                  </div>
                  <p className="text-[11px] font-bold">{f.title}</p>
                  <p className="text-[10px] opacity-70 mt-0.5">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="relative z-10">
            {/* Branding Homepage Link */}
            <div className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/5">
              {brandingLogoUrl ? (
                <img
                  src={brandingLogoUrl}
                  alt={brandingCompany}
                  className={`max-h-14 w-auto object-contain mb-4 ${logoInvertClass}`}
                />
              ) : (
                <p className="text-lg font-bold mb-4">{brandingCompany}</p>
              )}
              <p className="text-sm opacity-90 font-medium mb-4">
                Du möchtest mehr erfahren?
              </p>
              {brandingDomain && (
                <a
                  href={`https://${brandingDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors group"
                >
                  <span>www.{brandingDomain}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </a>
              )}
            </div>

            <p className="text-[10px] opacity-40 font-mono">
              © {currentYear} {brandingCompany}. Alle Rechte vorbehalten.
            </p>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 md:p-20 flex flex-col justify-between bg-background">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-md mx-auto w-full"
          >
            {/* Brand Anchor */}
            <div className="mb-12 flex flex-col items-center md:items-start">
              {brandingLogoUrl ? (
                <img
                  src={brandingLogoUrl}
                  alt={brandingCompany}
                  className="max-h-12 w-auto object-contain"
                />
              ) : (
                <h2 className="text-2xl font-bold text-foreground">{brandingCompany}</h2>
              )}
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.3em] mt-3">
                {brandingCompany}
              </span>
            </div>

            {mode === "login" ? (
              <>
                <div className="space-y-1">
                  <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Anmelden</h2>
                  <p className="text-muted-foreground text-sm">Willkommen zurück. Melde dich mit deinem Konto an.</p>
                </div>

                <form onSubmit={handleLogin} className="mt-10 space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wide">E-Mail-Adresse</Label>
                    <div className="relative group">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none">
                        <Mail className="w-5 h-5" />
                      </span>
                      <Input
                        type="email"
                        placeholder="name@unternehmen.de"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        className="w-full pl-12 pr-4 h-12 rounded-2xl border-border bg-muted/40 focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-primary/10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wide">Passwort</Label>
                    <div className="relative group">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none">
                        <Lock className="w-5 h-5" />
                      </span>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        className="w-full pl-12 pr-12 h-12 rounded-2xl border-border bg-muted/40 focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-primary/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>


                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 rounded-2xl text-base font-bold shadow-xl shadow-primary/20 gap-2.5"
                  >
                    <LogIn className="w-4 h-4" />
                    {loading ? "Wird angemeldet..." : "Anmelden"}
                  </Button>
                </form>

                <div className="mt-12 text-center">
                  <div className="relative flex items-center mb-8">
                    <div className="flex-grow border-t border-border" />
                    <span className="flex-shrink mx-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Oder</span>
                    <div className="flex-grow border-t border-border" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Noch kein Mitarbeiterzugang?</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMode("register")}
                    className="w-full h-12 rounded-2xl border-2 font-bold gap-2 group"
                  >
                    Jetzt registrieren
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <p className="mt-6 text-[10px] text-muted-foreground leading-relaxed">
                    Durch die Registrierung stimmst du unseren Nutzungsbedingungen zu.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Konto erstellen</h2>
                  <p className="text-muted-foreground text-sm">Registrieren Sie sich für das Portal.</p>
                </div>

                <form onSubmit={handleRegister} className="mt-10 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wide">Vorname</Label>
                      <div className="relative group">
                        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-muted-foreground pointer-events-none">
                          <User className="w-4 h-4" />
                        </span>
                        <Input
                          placeholder="Max"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                          className="w-full pl-11 h-12 rounded-2xl border-border bg-muted/40"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wide">Nachname</Label>
                      <Input
                        placeholder="Mustermann"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="w-full h-12 rounded-2xl border-border bg-muted/40 px-4"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wide">E-Mail-Adresse</Label>
                    <div className="relative group">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-muted-foreground pointer-events-none">
                        <Mail className="w-5 h-5" />
                      </span>
                      <Input
                        type="email"
                        placeholder="name@unternehmen.de"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        required
                        className="w-full pl-12 h-12 rounded-2xl border-border bg-muted/40"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wide">Handynummer</Label>
                    <div className="relative group">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-muted-foreground pointer-events-none">
                        <Phone className="w-5 h-5" />
                      </span>
                      <Input
                        type="tel"
                        placeholder="+49 170 1234567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="w-full pl-12 h-12 rounded-2xl border-border bg-muted/40"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wide">Passwort</Label>
                    <div className="relative group">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-muted-foreground pointer-events-none">
                        <Lock className="w-5 h-5" />
                      </span>
                      <Input
                        type={showRegPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                        className="w-full pl-12 pr-12 h-12 rounded-2xl border-border bg-muted/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground"
                      >
                        {showRegPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wide">Passwort bestätigen</Label>
                    <div className="relative group">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-muted-foreground pointer-events-none">
                        <Lock className="w-5 h-5" />
                      </span>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={regPasswordConfirm}
                        onChange={(e) => setRegPasswordConfirm(e.target.value)}
                        required
                        className="w-full pl-12 h-12 rounded-2xl border-border bg-muted/40"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 rounded-2xl text-base font-bold shadow-xl shadow-primary/20 mt-2"
                  >
                    {loading ? "Wird registriert..." : "Konto erstellen"}
                  </Button>
                </form>

                <div className="mt-8 text-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMode("login")}
                    className="w-full h-12 rounded-2xl border-2 font-bold gap-2 group"
                  >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Zurück zur Anmeldung
                  </Button>
                  <p className="mt-6 text-[10px] text-muted-foreground leading-relaxed">
                    Durch die Registrierung stimmst du unseren Nutzungsbedingungen zu.
                  </p>
                </div>
              </>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default Auth;
