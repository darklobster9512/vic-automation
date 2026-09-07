import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Mail, Phone, MapPin, Star, ClipboardCheck, Euro, CreditCard, CalendarClock, History, FileDown, Eye, KeyRound, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { addMonths, startOfMonth, format, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { computeNextPayout } from "@/lib/computeNextPayout";


interface ContextType {
  contract: { id: string; first_name: string | null; application_id: string; status: string; signed_contract_pdf_url: string | null; signature_data?: string | null; template_id?: string | null; submitted_at?: string | null } | null;
  branding: { logo_url: string | null; company_name: string; brand_color: string | null; signature_image_url?: string | null; signer_name?: string | null; signer_title?: string | null; payment_model?: string; salary_minijob?: number | null; salary_teilzeit?: number | null; salary_vollzeit?: number | null; hourly_rate_enabled?: boolean; hourly_rate_minijob?: number | null; hourly_rate_teilzeit?: number | null; hourly_rate_vollzeit?: number | null; estimated_salary_minijob?: number | null; estimated_salary_teilzeit?: number | null; estimated_salary_vollzeit?: number | null } | null;
  loading: boolean;
}

interface ContractDetails {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  zip_code: string | null;
  city: string | null;
  balance: number;
  iban: string | null;
  bic: string | null;
  bank_name: string | null;
  employment_type: string | null;
}

const PasswordChangeCard = () => {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setCurrent(""); setNext(""); setRepeat(""); };

  const submit = async () => {
    if (!current || !next || !repeat) { toast.error("Bitte alle Felder ausfüllen."); return; }
    if (next !== repeat) { toast.error("Die neuen Passwörter stimmen nicht überein."); return; }
    if (next.length < 6) { toast.error("Das neue Passwort muss mindestens 6 Zeichen lang sein."); return; }
    if (next === current) { toast.error("Das neue Passwort muss sich vom aktuellen unterscheiden."); return; }

    setSaving(true);
    const { data, error } = await supabase.functions.invoke("change-employee-password", {
      body: { current_password: current, new_password: next },
    });
    setSaving(false);

    const errMsg = (data as any)?.error;
    if (error || errMsg) {
      toast.error(errMsg || "Passwort konnte nicht geändert werden.");
      return;
    }
    toast.success("Passwort erfolgreich geändert.");
    reset();
    setOpen(false);
  };

  return (
    <Card className="bg-white border border-border/40 shadow-md rounded-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          Sicherheit
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-muted-foreground">Ändere hier dein Passwort für den Login.</p>
          <Button variant="outline" className="rounded-xl" onClick={() => setOpen(true)}>
            <KeyRound className="h-4 w-4 mr-2" />
            Passwort ändern
          </Button>
        </div>

        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Passwort ändern</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pw-current">Aktuelles Passwort</Label>
                <Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw-new">Neues Passwort</Label>
                <Input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw-repeat">Neues Passwort wiederholen</Label>
                <Input id="pw-repeat" type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} maxLength={100} />
              </div>
              <Button className="w-full rounded-xl" onClick={submit} disabled={saving}>
                {saving ? "Wird geändert..." : "Bestätigen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

const MeineDaten = () => {

  const { contract, branding, loading: contextLoading } = useOutletContext<ContextType>();
  const [contractDetails, setContractDetails] = useState<ContractDetails | null>(null);
  const [stats, setStats] = useState({ ratedOrders: 0, avgRating: 0 });
  const [pendingPayout, setPendingPayout] = useState(0);
  const [rewardHistory, setRewardHistory] = useState<{ title: string; reward: string; date: string; hours?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [contractViewOpen, setContractViewOpen] = useState(false);
  const [templateContent, setTemplateContent] = useState<string | null>(null);
  const [brandingSig, setBrandingSig] = useState<any>(null);
  const [contractExtra, setContractExtra] = useState<{ signature_data?: string; first_name?: string; last_name?: string; submitted_at?: string; desired_start_date?: string; first_workday_date?: string } | null>(null);
  const [templateSalary, setTemplateSalary] = useState<number | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [form, setForm] = useState({ phone: "", street: "", zip_code: "", city: "", iban: "", bic: "", bank_name: "" });

  const openContact = () => {
    setForm({
      phone: contractDetails?.phone || "",
      street: contractDetails?.street || "",
      zip_code: contractDetails?.zip_code || "",
      city: contractDetails?.city || "",
      iban: contractDetails?.iban || "",
      bic: contractDetails?.bic || "",
      bank_name: contractDetails?.bank_name || "",
    });
    setContactOpen(true);
  };

  const openBank = () => {
    setForm({
      phone: contractDetails?.phone || "",
      street: contractDetails?.street || "",
      zip_code: contractDetails?.zip_code || "",
      city: contractDetails?.city || "",
      iban: contractDetails?.iban || "",
      bic: contractDetails?.bic || "",
      bank_name: contractDetails?.bank_name || "",
    });
    setBankOpen(true);
  };

  const saveDetails = async (mode: "contact" | "bank") => {
    const phone = form.phone.trim();
    const street = form.street.trim();
    const zip = form.zip_code.trim();
    const city = form.city.trim();
    const iban = form.iban.replace(/\s+/g, "").toUpperCase();
    const bic = form.bic.trim().toUpperCase();
    const bankName = form.bank_name.trim();

    if (mode === "contact") {
      if (!/^\+?[0-9 /-]{6,20}$/.test(phone)) { toast.error("Bitte eine gültige Telefonnummer eingeben."); return; }
      if (street.length < 3 || street.length > 120) { toast.error("Bitte eine gültige Straße eingeben."); return; }
      if (!/^[0-9A-Za-z -]{4,10}$/.test(zip)) { toast.error("Bitte eine gültige PLZ eingeben."); return; }
      if (city.length < 2 || city.length > 80) { toast.error("Bitte einen gültigen Ort eingeben."); return; }
    } else {
      if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(iban)) { toast.error("Bitte eine gültige IBAN eingeben."); return; }
      if (bic && !/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(bic)) { toast.error("Bitte einen gültigen BIC eingeben."); return; }
      if (bankName.length > 80) { toast.error("Bankname ist zu lang."); return; }
    }

    setSavingDetails(true);
    const { error } = await supabase.rpc("update_own_contract_details" as any, {
      _phone: phone,
      _street: street,
      _zip_code: zip,
      _city: city,
      _iban: iban,
      _bic: bic,
      _bank_name: bankName,
    });
    setSavingDetails(false);

    if (error) {
      toast.error("Daten konnten nicht gespeichert werden.");
      return;
    }

    setContractDetails((prev) => prev ? {
      ...prev,
      phone: phone || null,
      street: street || null,
      zip_code: zip || null,
      city: city || null,
      iban: iban || null,
      bic: bic || null,
      bank_name: bankName || null,
    } : prev);
    toast.success("Daten erfolgreich gespeichert.");
    setContactOpen(false);
    setBankOpen(false);
  };



  useEffect(() => {
    if (!contract?.id) return;

    const fetchData = async () => {
      const now = new Date();
      const monthStart = startOfDay(startOfMonth(now));

      const [contractRes, reviewsRes, assignmentsRes, fwaRes] = await Promise.all([
        supabase
          .from("employment_contracts")
          .select("first_name, last_name, email, phone, street, zip_code, city, balance, iban, bic, bank_name, employment_type, submitted_at, desired_start_date, template_id")
          .eq("id", contract.id)
          .maybeSingle(),

        supabase
          .from("order_reviews")
          .select("order_id, rating")
          .eq("contract_id", contract.id),
        supabase
          .from("order_assignments")
          .select("order_id, assigned_at, orders(title, reward, estimated_hours)")
          .eq("contract_id", contract.id)
          .eq("status", "erfolgreich"),
        supabase
          .from("first_workday_appointments")
          .select("appointment_date")
          .eq("contract_id", contract.id)
          .order("appointment_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (contractRes.data) {
        setContractDetails(contractRes.data);
        setContractExtra(prev => ({
          ...prev,
          submitted_at: contractRes.data.submitted_at ?? undefined,
          desired_start_date: (contractRes.data as any).desired_start_date ?? undefined,
          first_workday_date: (fwaRes.data as any)?.appointment_date ?? undefined,
        }));

        const tplId = (contractRes.data as any).template_id;
        if (tplId) {
          const { data: tpl } = await supabase
            .from("contract_templates" as any)
            .select("salary")
            .eq("id", tplId)
            .maybeSingle();
          const tplSal = Number((tpl as any)?.salary);
          setTemplateSalary(!isNaN(tplSal) && tplSal > 0 ? tplSal : null);
        } else {
          setTemplateSalary(null);
        }
      }



      if (reviewsRes.data && reviewsRes.data.length > 0) {
        const uniqueOrders = new Set(reviewsRes.data.map((r) => r.order_id));
        const avg = reviewsRes.data.reduce((sum, r) => sum + r.rating, 0) / reviewsRes.data.length;
        setStats({ ratedOrders: uniqueOrders.size, avgRating: Math.round(avg * 10) / 10 });
      }

      // Calculate current month payout from successful assignments
      if (assignmentsRes.data) {
        // Get reviews created this month to filter
        const reviewsThisMonth = await supabase
          .from("order_reviews")
          .select("order_id, created_at")
          .eq("contract_id", contract.id)
          .gte("created_at", monthStart.toISOString());

        const thisMonthOrderIds = new Set(
          (reviewsThisMonth.data || []).map((r) => r.order_id)
        );

        let total = 0;
        for (const a of assignmentsRes.data) {
          if (thisMonthOrderIds.has(a.order_id)) {
            const reward = (a as any).orders?.reward as string | undefined;
            if (reward) {
              const parsed = parseFloat(reward.replace(/[^0-9.,]/g, "").replace(",", "."));
              if (!isNaN(parsed)) total += parsed;
            }
          }
        }
        setPendingPayout(total);

        // Build reward history from all successful assignments
        const history = assignmentsRes.data
          .map((a) => {
            const order = (a as any).orders;
            return {
              title: order?.title || "—",
              reward: order?.reward || "0",
              hours: order?.estimated_hours || "0",
              date: a.assigned_at,
            };
          })
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRewardHistory(history);
      }

      setLoading(false);
    };

    fetchData();
  }, [contract?.id]);

  if (contextLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-48 w-full max-w-md" />
      </div>
    );
  }

  if (!contractDetails) {
    return <p className="text-muted-foreground">Keine Daten gefunden.</p>;
  }

  const fullName = [contractDetails.first_name, contractDetails.last_name].filter(Boolean).join(" ") || "—";

  const isFixedSalary = branding?.payment_model === "fixed_salary";
  const isHourlyRate = isFixedSalary && branding?.hourly_rate_enabled === true;
  
  const getFixedSalary = () => {
    if (!branding) return 0;
    switch (contractDetails.employment_type?.toLowerCase()) {
      case "minijob": return Number(branding.salary_minijob) || 0;
      case "teilzeit": return Number(branding.salary_teilzeit) || 0;
      case "vollzeit": return Number(branding.salary_vollzeit) || 0;
      default: return 0;
    }
  };

  const getHourlyRate = () => {
    if (!branding) return 0;
    switch (contractDetails.employment_type?.toLowerCase()) {
      case "minijob": return Number(branding.hourly_rate_minijob) || 0;
      case "teilzeit": return Number(branding.hourly_rate_teilzeit) || 0;
      case "vollzeit": return Number(branding.hourly_rate_vollzeit) || 0;
      default: return 0;
    }
  };

  const getEstimatedMonthlySalary = () => {
    if (templateSalary && templateSalary > 0) return templateSalary;
    if (!branding) return 0;
    switch (contractDetails.employment_type?.toLowerCase()) {
      case "minijob": return Number((branding as any).estimated_salary_minijob) || 0;
      case "teilzeit": return Number((branding as any).estimated_salary_teilzeit) || 0;
      case "vollzeit": return Number((branding as any).estimated_salary_vollzeit) || 0;
      default: return 0;
    }
  };


  const fixedSalary = getFixedSalary();
  const hourlyRate = getHourlyRate();
  const estimatedSalary = getEstimatedMonthlySalary();

  // Calculate hourly earnings from reward history
  const hourlyEarnings = isHourlyRate
    ? rewardHistory.reduce((sum, item) => {
        const h = parseFloat(item.hours || "0");
        return sum + (isNaN(h) ? 0 : h * hourlyRate);
      }, 0)
    : 0;

  const formatIban = (iban: string | null) => {
    if (!iban) return "—";
    return iban.replace(/(.{4})/g, "$1 ").trim();
  };

  return (
    <>
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Meine Daten</h2>
        <p className="text-muted-foreground text-sm mt-1">Deine persönlichen Informationen im Überblick</p>
      </motion.div>

      {/* Personal Info */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <Card className="bg-white border border-border/40 shadow-md rounded-2xl">
          <CardHeader className="pb-4 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Persönliche Informationen
            </CardTitle>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={openContact}>
              <Pencil className="h-4 w-4 mr-1" />
              Bearbeiten
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={User} label="Name" value={fullName} />
              <InfoRow icon={Mail} label="E-Mail" value={contractDetails.email || "—"} />
              <InfoRow icon={Phone} label="Telefon" value={contractDetails.phone || "—"} />
              <InfoRow icon={MapPin} label="Adresse" value={
                [contractDetails.street, [contractDetails.zip_code, contractDetails.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "—"
              } />
            </div>
          </CardContent>

        </Card>
      </motion.div>

      {/* Passwort ändern */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
        <PasswordChangeCard />
      </motion.div>


      {/* Arbeitsvertrag */}
      {contract && (contract.status === "genehmigt" || contract.status === "eingereicht" || contract?.signed_contract_pdf_url) && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
          <Card className="bg-white border border-border/40 shadow-md rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileDown className="h-4 w-4 text-primary" />
                Arbeitsvertrag
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10">
                    <FileDown className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {contract.status === "genehmigt" ? "Vertrag genehmigt" : "Vertrag eingereicht"}
                    </p>
                    <p className="text-xs text-muted-foreground">Dein Arbeitsvertrag kann hier eingesehen werden</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const { data: ec } = await supabase
                      .from("employment_contracts")
                      .select("template_id, signature_data, first_name, last_name, birth_date, birth_place, nationality, marital_status, social_security_number, tax_id, phone, email, street, zip_code, city, employment_type, desired_start_date, branding_id, submitted_at")
                      .eq("id", contract.id)
                      .maybeSingle();
                    setContractExtra({
                      signature_data: ec?.signature_data ?? undefined,
                      first_name: ec?.first_name ?? undefined,
                      last_name: ec?.last_name ?? undefined,
                      submitted_at: ec?.submitted_at ?? undefined,
                    });
                    if (ec?.template_id) {
                      const { data: tpl } = await supabase.from("contract_templates" as any).select("content, salary, employment_type").eq("id", ec.template_id).maybeSingle();
                      const rawContent = (tpl as any)?.content || null;
                      if (rawContent && ec) {
                        const replacements: Record<string, string> = {
                          vorname: ec.first_name || "",
                          nachname: ec.last_name || "",
                          name: `${ec.first_name || ""} ${ec.last_name || ""}`.trim(),
                          email: ec.email || "",
                          telefon: ec.phone || "",
                          geburtsdatum: ec.birth_date || "",
                          geburtsort: ec.birth_place || "",
                          nationalitaet: ec.nationality || "",
                          strasse: ec.street || "",
                          plz: ec.zip_code || "",
                          stadt: ec.city || "",
                          familienstand: ec.marital_status || "",
                          startdatum: ec.desired_start_date ? format(new Date(ec.desired_start_date), "dd.MM.yyyy", { locale: de }) : "",
                          gehalt: (tpl as any)?.salary ? `${(tpl as any).salary} €` : "",
                          anstellungsart: (tpl as any)?.employment_type || ec.employment_type || "",
                          firma: branding?.company_name || "",
                        };
                        let replaced = rawContent;
                        for (const [key, value] of Object.entries(replacements)) {
                          replaced = replaced.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi"), value);
                        }
                        setTemplateContent(replaced);
                      } else {
                        setTemplateContent(rawContent);
                      }
                    }
                    if (ec?.branding_id) {
                      const { data: bd } = await supabase.from("brandings").select("signature_image_url, signer_name, signer_title, company_name").eq("id", ec.branding_id).maybeSingle();
                      setBrandingSig(bd);
                    }
                    setContractViewOpen(true);
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Anzeigen
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Statistics */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
        <Card className="bg-white border border-border/40 shadow-md rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              Statistiken
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <StatCard icon={ClipboardCheck} label="Bewertete Aufträge" value={String(stats.ratedOrders)} />
              <StatCard icon={Star} label="Ø Bewertung" value={stats.avgRating > 0 ? String(stats.avgRating) : "—"} showStars rating={stats.avgRating} />
              {isHourlyRate
                ? <StatCard icon={Euro} label="Voraussichtl. Gehalt" value={estimatedSalary > 0 ? `€${estimatedSalary.toFixed(2)}` : "—"} />
                : isFixedSalary
                  ? <StatCard icon={Euro} label="Festgehalt" value={`€${fixedSalary.toFixed(2)}`} />
                  : <StatCard icon={Euro} label="Kontostand" value={`€${Number(contractDetails.balance).toFixed(2)}`} />
              }
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bank Card + Payouts */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
        <Card className="bg-white border border-border/40 shadow-md rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Bankverbindung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Bank card */}
              <div className="relative rounded-2xl bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 p-6 text-white shadow-xl aspect-[1.6/1] flex flex-col justify-between overflow-hidden">
                <div className="absolute top-4 right-4 flex">
                  <div className="w-8 h-8 rounded-full bg-white/20" />
                  <div className="w-8 h-8 rounded-full bg-white/10 -ml-3" />
                </div>
                <div className="space-y-1 mt-2">
                  <p className="text-[10px] uppercase tracking-widest text-white/50">IBAN</p>
                  <p className="text-sm font-mono tracking-wider">{formatIban(contractDetails.iban)}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-white/50">BIC: {contractDetails.bic || "—"}</p>
                  <p className="text-xs text-white/50">{contractDetails.bank_name || "—"}</p>
                  <p className="text-sm font-semibold tracking-wide mt-1">{fullName}</p>
                </div>
              </div>

              {/* Right: Payouts */}
              <div className="flex flex-col justify-center">
                <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  Gehaltsauszahlungen
                </h4>
                <div className="rounded-xl bg-muted/50 p-5 space-y-3">
                  <p className="text-xs text-muted-foreground">Anstehende Gehaltsauszahlung am</p>
                  <p className="text-lg font-bold text-foreground">
                    {format(computeNextPayout({ firstWorkdayDate: contractExtra?.first_workday_date, desiredStartDate: contractExtra?.desired_start_date, submittedAt: contractExtra?.submitted_at }), "dd.MM.yyyy", { locale: de })}
                  </p>
                  <div className="border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground">{isFixedSalary && !isHourlyRate ? "Betrag" : "Voraussichtlicher Betrag"}</p>
                    <p className="text-2xl font-bold text-primary">€{isHourlyRate ? estimatedSalary.toFixed(2) : isFixedSalary ? fixedSalary.toFixed(2) : pendingPayout.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Reward History - for per_order OR hourly_rate model */}
      {!isFixedSalary && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}>
          <Card className="bg-white border border-border/40 shadow-md rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Verdienst-Historie
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rewardHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">Noch keine abgeschlossenen Aufträge.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Auftrag</TableHead>
                      {isHourlyRate && <TableHead>Stunden</TableHead>}
                      <TableHead>{isHourlyRate ? "Verdienst" : "Prämie"}</TableHead>
                      <TableHead>Datum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rewardHistory.map((item, i) => {
                      const hours = parseFloat(item.hours || "0");
                      const earnings = isHourlyRate ? (isNaN(hours) ? 0 : hours * hourlyRate) : 0;
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{item.title}</TableCell>
                          {isHourlyRate && <TableCell>{isNaN(hours) ? "—" : hours.toFixed(1)} Std.</TableCell>}
                          <TableCell>
                            {isHourlyRate
                              ? `${earnings.toFixed(2)} €`
                              : `${item.reward.replace(/[^0-9.,]/g, "").replace(",", ".")} €`
                            }
                          </TableCell>
                          <TableCell>{format(new Date(item.date), "dd.MM.yyyy", { locale: de })}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>

      <Dialog open={contractViewOpen} onOpenChange={setContractViewOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Arbeitsvertrag</DialogTitle>
          </DialogHeader>
          <div id="contract-pdf-content">
            {templateContent ? (
              <div className="prose prose-sm max-w-none border border-border rounded-lg p-6 bg-white" dangerouslySetInnerHTML={{ __html: templateContent }} />
            ) : (
              <p className="text-muted-foreground text-sm">Kein Vertragstext verfügbar.</p>
            )}
            <div className="grid grid-cols-2 gap-8 mt-8 pt-6 border-t border-border">
              {brandingSig?.signature_image_url && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Firmenunterschrift</p>
                  <img src={brandingSig.signature_image_url} alt="Firmenunterschrift" className="h-16 object-contain" />
                  <p className="text-sm font-medium mt-1">{brandingSig.signer_name}</p>
                  {brandingSig.signer_title && <p className="text-xs text-muted-foreground">{brandingSig.signer_title}</p>}
                  {contractExtra?.submitted_at && (
                    <p className="text-xs text-muted-foreground mt-1">Datum: {format(new Date(contractExtra.submitted_at), "dd.MM.yyyy", { locale: de })}</p>
                  )}
                </div>
              )}
              {contractExtra?.signature_data && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Unterschrift Mitarbeiter</p>
                  <img src={contractExtra.signature_data} alt="Unterschrift" className="h-16 object-contain" />
                  <p className="text-sm font-medium mt-1">{[contractExtra.first_name, contractExtra.last_name].filter(Boolean).join(" ")}</p>
                  {contractExtra?.submitted_at && (
                    <p className="text-xs text-muted-foreground mt-1">Datum: {format(new Date(contractExtra.submitted_at), "dd.MM.yyyy", { locale: de })}</p>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={async () => {
                const el = document.getElementById("contract-pdf-content");
                if (!el) return;
                const dialogEl = el.closest('[class*="max-h-"]') as HTMLElement | null;
                const originalStyles = dialogEl ? { maxHeight: dialogEl.style.maxHeight, overflow: dialogEl.style.overflow } : null;
                if (dialogEl) {
                  dialogEl.style.maxHeight = "none";
                  dialogEl.style.overflow = "visible";
                }
                const canvas = await html2canvas(el, { scale: 2, useCORS: true });
                if (dialogEl && originalStyles) {
                  dialogEl.style.maxHeight = originalStyles.maxHeight;
                  dialogEl.style.overflow = originalStyles.overflow;
                }
                const pdf = new jsPDF("p", "mm", "a4");
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const A4_HEIGHT_PX = (canvas.width * 297) / 210;
                let yOffset = 0;
                let page = 0;
                while (yOffset < canvas.height) {
                  if (page > 0) pdf.addPage();
                  const pageCanvas = document.createElement("canvas");
                  pageCanvas.width = canvas.width;
                  const sliceHeight = Math.min(A4_HEIGHT_PX, canvas.height - yOffset);
                  pageCanvas.height = sliceHeight;
                  const ctx = pageCanvas.getContext("2d")!;
                  ctx.drawImage(canvas, 0, yOffset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
                  const pageImg = pageCanvas.toDataURL("image/png");
                  const pageH = (sliceHeight * pdfWidth) / canvas.width;
                  pdf.addImage(pageImg, "PNG", 0, 0, pdfWidth, pageH);
                  yOffset += A4_HEIGHT_PX;
                  page++;
                }
                pdf.save("arbeitsvertrag.pdf");
              }}
            >
              <FileDown className="h-4 w-4 mr-1" /> Als PDF speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, showStars, rating }: { icon: React.ElementType; label: string; value: string; showStars?: boolean; rating?: number }) {
  return (
    <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-white border border-border/40 shadow-md">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary shadow-md shadow-primary/20 mb-2">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      {showStars && rating && rating > 0 && (
        <div className="flex gap-0.5 mt-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

export default MeineDaten;
