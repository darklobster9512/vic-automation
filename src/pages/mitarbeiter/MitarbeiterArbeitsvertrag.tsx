import React, { useState, useEffect, useRef, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { CalendarIcon, Check, CheckCircle2, ChevronLeft, ChevronRight, ChevronsUpDown, Upload, X, FileText, PenTool, FileUp, Trash2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format, isBefore, startOfDay, parse } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { sendTelegram } from "@/lib/sendTelegram";
import { buildTelegramMessage, renderStars, formatDateLong, quoteText } from "@/lib/telegramMessage";
import { sendEmail } from "@/lib/sendEmail";

const NATIONALITIES = [
  "Deutsch",
  "Afghanisch", "Ägyptisch", "Albanisch", "Algerisch", "Amerikanisch", "Andorranisch", "Angolanisch",
  "Argentinisch", "Armenisch", "Aserbaidschanisch", "Äthiopisch", "Australisch",
  "Bahamesisch", "Bahrainisch", "Bangladeschisch", "Belgisch", "Beninisch", "Bhutanisch",
  "Bolivianisch", "Bosnisch-herzegowinisch", "Botsuanisch", "Brasilianisch", "Britisch",
  "Bruneiisch", "Bulgarisch", "Burkinisch", "Burundisch",
  "Chilenisch", "Chinesisch", "Costa-ricanisch", "Dänisch", "Dominikanisch",
  "Dschibutisch", "Ecuadorianisch", "Eritreisch", "Estnisch",
  "Fidschi", "Finnisch", "Französisch",
  "Gabunisch", "Gambisch", "Georgisch", "Ghanaisch", "Grenadisch", "Griechisch",
  "Guatemaltekisch", "Guineisch", "Guyanisch",
  "Haitianisch", "Honduranisch",
  "Indisch", "Indonesisch", "Irakisch", "Iranisch", "Irisch", "Isländisch", "Israelisch",
  "Italienisch", "Ivorisch",
  "Jamaikanisch", "Japanisch", "Jemenitisch", "Jordanisch",
  "Kambodschanisch", "Kamerunisch", "Kanadisch", "Kapverdisch", "Kasachisch", "Katarisch",
  "Kenianisch", "Kirgisisch", "Kolumbianisch", "Komorisch", "Kongolesisch",
  "Kosovarisch", "Kroatisch", "Kubanisch", "Kuwaitisch",
  "Laotisch", "Lesothisch", "Lettisch", "Libanesisch", "Liberianisch", "Libysch",
  "Liechtensteinisch", "Litauisch", "Luxemburgisch",
  "Madagassisch", "Malawisch", "Malaysisch", "Maledivisch", "Malisch", "Maltesisch",
  "Marokkanisch", "Mauretanisch", "Mauritisch", "Mexikanisch", "Moldauisch",
  "Monegassisch", "Mongolisch", "Montenegrinisch", "Mosambikanisch", "Myanmarisch",
  "Namibisch", "Nepalesisch", "Neuseeländisch", "Nicaraguanisch", "Niederländisch",
  "Nigerianisch", "Nigrisch", "Nordkoreanisch", "Nordmazedonisch", "Norwegisch",
  "Omanisch", "Österreichisch",
  "Pakistanisch", "Palästinensisch", "Panamaisch", "Papua-neuguineisch", "Paraguayisch",
  "Peruanisch", "Philippinisch", "Polnisch", "Portugiesisch",
  "Ruandisch", "Rumänisch", "Russisch",
  "Salvadorianisch", "Sambisch", "Samoanisch", "Saudi-arabisch", "Schwedisch",
  "Schweizerisch", "Senegalesisch", "Serbisch", "Sierra-leonisch", "Simbabwisch",
  "Singapurisch", "Slowakisch", "Slowenisch", "Somalisch", "Spanisch",
  "Sri-lankisch", "Südafrikanisch", "Sudanesisch", "Südkoreanisch", "Surinamisch",
  "Syrisch",
  "Tadschikisch", "Taiwanesisch", "Tansanisch", "Thailändisch", "Togoisch",
  "Tongaisch", "Tschadisch", "Tschechisch", "Tunesisch", "Türkisch",
  "Turkmenisch", "Tuvaluisch",
  "Ugandisch", "Ukrainisch", "Ungarisch", "Uruguayisch", "Usbekisch",
  "Vanuatuisch", "Vatikanisch", "Venezolanisch", "Vietnamesisch",
  "Weißrussisch",
  "Zentralafrikanisch", "Zyprisch",
];

interface ContextType {
  contract: { id: string; first_name: string | null; application_id: string | null; branding_id?: string | null } | null;
  branding: { brand_color: string | null; signature_image_url?: string | null; signer_name?: string | null; signer_title?: string | null; company_name?: string } | null;
  loading: boolean;
}

export default function MitarbeiterArbeitsvertrag() {
  const { contract } = useOutletContext<ContextType>();
  const [step, setStep] = useState(-1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [sigDialogOpen, setSigDialogOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [brandingData, setBrandingData] = useState<any>(null);
  const initialLoadDone = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    birth_date: "",
    birth_place: "", nationality: "",
    street: "", zip_code: "", city: "",
    marital_status: "", employment_type: "",
    desired_start_date: null as Date | null,
    social_security_number: "", tax_id: "", health_insurance: "",
    iban: "", bic: "", bank_name: "",
  });

  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null);
  const [idBackPreview, setIdBackPreview] = useState<string | null>(null);
  const [nationalityOpen, setNationalityOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<{ title: string; content: string } | null>(null);
  const [idType, setIdType] = useState<"personalausweis" | "reisepass">("personalausweis");
  const [proofOfAddressFile, setProofOfAddressFile] = useState<File | null>(null);
  const [proofOfAddressPreview, setProofOfAddressPreview] = useState<string | null>(null);
  const [requiresProofOfAddress, setRequiresProofOfAddress] = useState(false);

  // Saved URLs from DB (for resume / final submit without File objects)
  const [savedIdFrontUrl, setSavedIdFrontUrl] = useState<string | null>(null);
  const [savedIdBackUrl, setSavedIdBackUrl] = useState<string | null>(null);
  const [savedProofOfAddressUrl, setSavedProofOfAddressUrl] = useState<string | null>(null);
  const [signatureLoaded, setSignatureLoaded] = useState(false);

  // Force Reisepass for non-German nationalities
  const isGerman = !form.nationality || form.nationality === "Deutsch";
  useEffect(() => {
    if (!isGerman) {
      setIdType("reisepass");
      // Clear back side since Reisepass has no back
      setIdBackFile(null);
      setIdBackPreview(null);
    }
  }, [isGerman]);

  // Meldenachweis is required when Reisepass is selected OR when DB flag is set
  const needsProofOfAddress = requiresProofOfAddress || idType === "reisepass";

  const STEPS = [
    "Vorlage wählen",
    "Persönliche Informationen",
    "Steuerliche Angaben",
    "Bankverbindung",
    "Ausweisdokumente",
    "Zusammenfassung",
    "Vertragsvorschau",
  ];

  // --- Auto-save debounced ---
  const debouncedSave = useCallback((formData: typeof form, currentIdType: string, currentTemplate: any) => {
    if (!contract || !initialLoadDone.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const bdMatch = formData.birth_date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
      const birthDateIso = bdMatch ? `${bdMatch[3]}-${bdMatch[2]}-${bdMatch[1]}` : null;
      await supabase.from("employment_contracts").update({
        first_name: formData.first_name || null,
        last_name: formData.last_name || null,
        email: formData.email || null,
        phone: formData.phone || null,
        birth_date: birthDateIso,
        birth_place: formData.birth_place || null,
        nationality: formData.nationality || null,
        street: formData.street || null,
        zip_code: formData.zip_code || null,
        city: formData.city || null,
        marital_status: formData.marital_status || null,
        employment_type: currentTemplate?.employment_type || formData.employment_type || null,
        desired_start_date: formData.desired_start_date ? format(formData.desired_start_date, "yyyy-MM-dd") : null,
        social_security_number: formData.social_security_number || null,
        tax_id: formData.tax_id || null,
        health_insurance: formData.health_insurance || null,
        iban: formData.iban || null,
        bic: formData.bic || null,
        bank_name: formData.bank_name || null,
        id_type: currentIdType,
        template_id: currentTemplate?.id || null,
      } as any).eq("id", contract.id);
    }, 1500);
  }, [contract]);

  // Trigger auto-save on form/idType/template changes
  useEffect(() => {
    debouncedSave(form, idType, selectedTemplate);
  }, [form, idType, selectedTemplate, debouncedSave]);

  // --- Immediate document upload helper ---
  const uploadDocImmediately = async (file: File, prefix: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${contract!.id}/${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("contract-documents").upload(path, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("contract-documents").getPublicUrl(path);
    return urlData.publicUrl;
  };

  // --- Load all contract data ---
  useEffect(() => {
    if (!contract) { setLoadingData(false); return; }

    const fetchData = async () => {
      const { data: cd } = await supabase
        .from("employment_contracts")
        .select("first_name, last_name, email, phone, submitted_at, branding_id, requires_proof_of_address, birth_date, birth_place, nationality, street, zip_code, city, marital_status, employment_type, desired_start_date, social_security_number, tax_id, health_insurance, iban, bic, bank_name, id_front_url, id_back_url, id_type, proof_of_address_url, template_id")
        .eq("id", contract.id)
        .maybeSingle();

      if (cd?.submitted_at) {
        setAlreadySubmitted(true);
        setLoadingData(false);
        return;
      }

      if (cd) {
        // Parse birth_date from ISO to DD.MM.YYYY
        let birthDateStr = "";
        if (cd.birth_date) {
          try {
            const d = new Date(cd.birth_date + "T00:00:00");
            birthDateStr = format(d, "dd.MM.yyyy");
          } catch { birthDateStr = ""; }
        }

        // Parse desired_start_date
        let desiredDate: Date | null = null;
        if (cd.desired_start_date) {
          try { desiredDate = new Date(cd.desired_start_date + "T00:00:00"); } catch {}
        }

        setForm({
          first_name: cd.first_name || "",
          last_name: cd.last_name || "",
          email: cd.email || "",
          phone: cd.phone || "",
          birth_date: birthDateStr,
          birth_place: cd.birth_place || "",
          nationality: cd.nationality || "",
          street: cd.street || "",
          zip_code: cd.zip_code || "",
          city: cd.city || "",
          marital_status: cd.marital_status || "",
          employment_type: cd.employment_type || "",
          desired_start_date: desiredDate,
          social_security_number: cd.social_security_number || "",
          tax_id: cd.tax_id || "",
          health_insurance: cd.health_insurance || "",
          iban: cd.iban || "",
          bic: cd.bic || "",
          bank_name: cd.bank_name || "",
        });

        if (cd.id_type) setIdType(cd.id_type as any);
        if (cd.requires_proof_of_address) setRequiresProofOfAddress(true);

        // Restore saved document URLs and previews
        if (cd.id_front_url) { setSavedIdFrontUrl(cd.id_front_url); setIdFrontPreview(cd.id_front_url); }
        if (cd.id_back_url) { setSavedIdBackUrl(cd.id_back_url); setIdBackPreview(cd.id_back_url); }
        if (cd.proof_of_address_url) {
          setSavedProofOfAddressUrl(cd.proof_of_address_url);
          setProofOfAddressPreview(cd.proof_of_address_url.endsWith(".pdf") ? "pdf:" + cd.proof_of_address_url : cd.proof_of_address_url);
        }

        // Fetch templates for this branding
        const brandingId = cd.branding_id || (contract as any).branding_id;
        if (brandingId) {
          const { data: tpls } = await supabase
            .from("contract_templates" as any)
            .select("*")
            .eq("branding_id", brandingId)
            .eq("is_active", true)
            .order("employment_type");
          const loadedTemplates = tpls || [];
          setTemplates(loadedTemplates);

          // Restore selected template
          if (cd.template_id && loadedTemplates.length > 0) {
            const found = loadedTemplates.find((t: any) => t.id === cd.template_id);
            if (found) setSelectedTemplate(found);
          }

          const { data: bd } = await supabase
            .from("brandings")
            .select("signature_image_url, signer_name, signer_title, company_name")
            .eq("id", brandingId)
            .maybeSingle();
          setBrandingData(bd);

          // Preload signature image so it's cached before step 5
          if (bd?.signature_image_url) {
            const img = new window.Image();
            img.onload = () => setSignatureLoaded(true);
            img.onerror = () => setSignatureLoaded(true);
            img.src = bd.signature_image_url;
          } else {
            setSignatureLoaded(true);
          }
        }

        // Determine resume step
        const hasTemplates = (await supabase.from("contract_templates" as any).select("id").eq("branding_id", cd.branding_id || (contract as any).branding_id || "").eq("is_active", true).limit(1)).data?.length ?? 0;
        
        if (hasTemplates > 0 && !cd.template_id) {
          setStep(-1);
        } else {
          // Find first incomplete step
          const personalComplete = cd.first_name && cd.last_name && cd.email && cd.phone && cd.birth_date && cd.birth_place && cd.nationality && cd.street && cd.zip_code && cd.city && cd.marital_status && cd.desired_start_date;
          const taxComplete = cd.social_security_number && cd.tax_id && cd.health_insurance;
          const bankComplete = cd.iban && cd.bic && cd.bank_name;
          const docsComplete = cd.id_front_url && (cd.id_type === "reisepass" || cd.id_back_url);

          if (!personalComplete) setStep(0);
          else if (!taxComplete) setStep(1);
          else if (!bankComplete) setStep(2);
          else if (!docsComplete) setStep(3);
          else setStep(4); // summary
        }
      }

      initialLoadDone.current = true;
      setLoadingData(false);
    };

    fetchData();
  }, [contract]);

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground text-sm">Laden...</div>
      </div>
    );
  }

  if (alreadySubmitted || submitted) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <div className="bg-background rounded-xl border border-border shadow-sm p-8 text-center space-y-4">
          <CheckCircle2 className="h-10 w-10 mx-auto text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Daten erfolgreich eingereicht</h2>
          <p className="text-sm text-muted-foreground">
            Deine Arbeitsvertragsdaten wurden erfolgreich übermittelt. Wir werden uns in Kürze bei dir melden.
          </p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <div className="bg-background rounded-xl border border-border shadow-sm p-8 text-center">
          <p className="text-sm text-muted-foreground">Kein Vertrag gefunden.</p>
        </div>
      </div>
    );
  }

  const updateForm = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const isStepValid = () => {
    if (step === -1) return !!selectedTemplate;
    if (step === 0) {
      const bdMatch = form.birth_date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
      const bdValid = bdMatch ? !isNaN(new Date(`${bdMatch[3]}-${bdMatch[2]}-${bdMatch[1]}`).getTime()) : false;
      return form.first_name && form.last_name && form.email && form.phone && bdValid && form.birth_place && form.nationality && form.street && form.zip_code && form.city && form.marital_status && form.desired_start_date;
    }
    if (step === 1) return form.social_security_number && form.tax_id && form.health_insurance;
    if (step === 2) return form.iban && form.bic && form.bank_name;
    if (step === 3) {
      const hasFront = !!idFrontFile || !!savedIdFrontUrl;
      const hasBack = !!idBackFile || !!savedIdBackUrl;
      const idValid = idType === "reisepass" ? hasFront : (hasFront && hasBack);
      const proofValid = needsProofOfAddress ? (!!proofOfAddressFile || !!savedProofOfAddressUrl) : true;
      return idValid && proofValid;
    }
    return true;
  };

  const handleFileChange = async (side: "front" | "back", file: File | null) => {
    if (!file) return;
    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    if (side === "front") { setIdFrontFile(file); setIdFrontPreview(previewUrl); }
    else { setIdBackFile(file); setIdBackPreview(previewUrl); }

    // Upload immediately and save URL
    try {
      const url = await uploadDocImmediately(file, side === "front" ? "front" : "back");
      if (side === "front") {
        setSavedIdFrontUrl(url);
        await supabase.from("employment_contracts").update({ id_front_url: url } as any).eq("id", contract.id);
      } else {
        setSavedIdBackUrl(url);
        await supabase.from("employment_contracts").update({ id_back_url: url } as any).eq("id", contract.id);
      }
    } catch (err: any) {
      toast.error("Upload fehlgeschlagen: " + err.message);
    }
  };

  const handleProofUpload = async (file: File) => {
    setProofOfAddressFile(file);
    const preview = file.type.includes("pdf") ? "pdf:" + file.name : URL.createObjectURL(file);
    setProofOfAddressPreview(preview);

    try {
      const url = await uploadDocImmediately(file, "proof-of-address");
      setSavedProofOfAddressUrl(url);
      await supabase.from("employment_contracts").update({ proof_of_address_url: url } as any).eq("id", contract.id);
    } catch (err: any) {
      toast.error("Upload fehlgeschlagen: " + err.message);
    }
  };

  const removeDoc = async (type: "front" | "back" | "proof") => {
    if (type === "front") {
      setIdFrontFile(null); setIdFrontPreview(null); setSavedIdFrontUrl(null);
      await supabase.from("employment_contracts").update({ id_front_url: null } as any).eq("id", contract.id);
    } else if (type === "back") {
      setIdBackFile(null); setIdBackPreview(null); setSavedIdBackUrl(null);
      await supabase.from("employment_contracts").update({ id_back_url: null } as any).eq("id", contract.id);
    } else {
      setProofOfAddressFile(null); setProofOfAddressPreview(null); setSavedProofOfAddressUrl(null);
      await supabase.from("employment_contracts").update({ proof_of_address_url: null } as any).eq("id", contract.id);
    }
  };

  const replaceTemplatePlaceholders = (content: string) => {
    const replacements: Record<string, string> = {
      vorname: form.first_name,
      nachname: form.last_name,
      name: `${form.first_name} ${form.last_name}`,
      email: form.email,
      telefon: form.phone,
      geburtsdatum: form.birth_date,
      geburtsort: form.birth_place,
      nationalitaet: form.nationality,
      strasse: form.street,
      plz: form.zip_code,
      stadt: form.city,
      familienstand: form.marital_status,
      startdatum: form.desired_start_date ? format(form.desired_start_date, "dd.MM.yyyy") : "",
      gehalt: selectedTemplate?.salary ? `${selectedTemplate.salary} €` : "",
      anstellungsart: selectedTemplate?.employment_type || "",
      firma: brandingData?.company_name || "",
    };

    let result = content;
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi"), value);
    }
    return result;
  };

  // Canvas signing
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ("touches" in e) ? e.touches[0].clientY - rect.left : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x * (canvas.width / rect.width), y * (canvas.height / rect.height));
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ("touches" in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x * (canvas.width / rect.width), y * (canvas.height / rect.height));
    ctx.stroke();
  };

  const stopDrawing = () => { setIsDrawing(false); };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSign = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL("image/png");
    setSignatureData(data);
    setSigDialogOpen(false);
    await handleSubmit(data);
  };

  const handleSubmit = async (sigData: string) => {
    setSubmitting(true);
    try {
      // Use saved URLs (already uploaded during draft)
      const frontUrl = savedIdFrontUrl || "";
      const backUrl = idType === "personalausweis" ? (savedIdBackUrl || "") : "";
      const proofUrl = savedProofOfAddressUrl || null;

      const { error: rpcError } = await supabase.rpc("submit_employment_contract", {
        _contract_id: contract.id,
        _first_name: form.first_name,
        _last_name: form.last_name,
        _email: form.email.trim().toLowerCase(),
        _phone: form.phone,
        _birth_date: (() => { const p = form.birth_date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/); return p ? `${p[3]}-${p[2]}-${p[1]}` : ""; })(),
        _birth_place: form.birth_place,
        _nationality: form.nationality,
        _street: form.street,
        _zip_code: form.zip_code,
        _city: form.city,
        _marital_status: form.marital_status,
        _employment_type: selectedTemplate?.employment_type || form.employment_type,
        _desired_start_date: format(form.desired_start_date!, "yyyy-MM-dd"),
        _social_security_number: form.social_security_number,
        _tax_id: form.tax_id,
        _health_insurance: form.health_insurance,
        _iban: form.iban,
        _bic: form.bic,
        _bank_name: form.bank_name,
        _id_front_url: frontUrl,
        _id_back_url: backUrl,
        _id_type: idType,
        _proof_of_address_url: proofUrl,
      } as any);

      if (rpcError) throw rpcError;

      await supabase
        .from("employment_contracts")
        .update({
          signature_data: sigData,
          template_id: selectedTemplate?.id || null,
        } as any)
        .eq("id", contract.id);

      await sendTelegram("vertrag_eingereicht", `📋 Arbeitsvertrag eingereicht\n\nName: ${form.first_name} ${form.last_name}`);

      // Send vertrag_eingereicht email confirmation
      await sendEmail({
        to: form.email,
        recipient_name: `${form.first_name} ${form.last_name}`,
        subject: "Ihre Vertragsdaten wurden eingereicht",
        body_title: "Vertragsdaten eingereicht",
        body_lines: [
          `Sehr geehrte/r ${form.first_name} ${form.last_name},`,
          "Ihre Vertragsdaten wurden erfolgreich eingereicht und werden nun geprüft.",
          "Sie werden benachrichtigt, sobald Ihr Vertrag genehmigt wurde.",
        ],
        branding_id: contract.branding_id || null,
        event_type: "vertrag_eingereicht",
        metadata: { contract_id: contract.id },
      });

      setSubmitted(true);
      toast.success("Vertrag erfolgreich eingereicht!");
    } catch (err: any) {
      toast.error("Fehler beim Einreichen: " + (err.message || "Unbekannter Fehler"));
    } finally {
      setSubmitting(false);
    }
  };

  const employmentLabels: Record<string, string> = {
    minijob: "Minijob", teilzeit: "Teilzeit", vollzeit: "Vollzeit",
  };

  const DatePickerField = ({ label, value, onChange, disablePast = false }: {
    label: string; value: Date | null; onChange: (d: Date | undefined) => void; disablePast?: boolean;
  }) => (
    <div className="space-y-2">
      <Label>{label} <span className="text-destructive">*</span></Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", value ? "border-green-500" : "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "dd.MM.yyyy") : "Datum wählen"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value || undefined}
            onSelect={onChange}
            disabled={(date) => disablePast && isBefore(date, startOfDay(new Date()))}
            locale={de}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  const currentStepIndex = step + 1;
  const totalSteps = templates.length > 0 ? 7 : 6;

  // Helper to get the effective preview URL for a document
  const getDocPreview = (type: "front" | "back" | "proof") => {
    if (type === "front") return idFrontPreview;
    if (type === "back") return idBackPreview;
    return proofOfAddressPreview;
  };

  const isProofPdf = (preview: string | null) => {
    if (!preview) return false;
    return preview.startsWith("pdf:") || preview.endsWith(".pdf");
  };

  const getProofDisplayUrl = () => {
    if (proofOfAddressPreview?.startsWith("pdf:")) return proofOfAddressPreview.slice(4);
    return proofOfAddressPreview;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-background rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Stepper */}
        <div className="p-6 pb-4">
          <div className="flex items-center mb-6">
            {(templates.length > 0 ? STEPS : STEPS.slice(1)).map((s, i) => (
              <React.Fragment key={i}>
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors shrink-0",
                    i <= currentStepIndex ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground bg-background"
                  )}
                >
                  {i < currentStepIndex ? "✓" : i + 1}
                </div>
                {i < (templates.length > 0 ? STEPS.length : STEPS.length - 1) - 1 && (
                  <div className={cn("h-0.5 flex-1 mx-1", i < currentStepIndex ? "bg-primary" : "bg-border")} />
                )}
              </React.Fragment>
            ))}
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            {templates.length > 0 ? STEPS[currentStepIndex] : STEPS[currentStepIndex + 1]}
          </h2>
        </div>

        <div className="border-t border-border mx-6" />

        <div className="p-6 space-y-4">
          {/* Step -1: Template Selection */}
          {step === -1 && templates.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Wähle die Vertragsvorlage, die für dich zutrifft.</p>
              <div className="grid gap-3">
                {templates.map((t: any) => (
                  <Card
                    key={t.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      selectedTemplate?.id === t.id ? "ring-2 ring-primary border-primary" : ""
                    )}
                    onClick={() => {
                      setSelectedTemplate(t);
                      updateForm("employment_type", t.employment_type);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground">{t.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{employmentLabels[t.employment_type] || t.employment_type}</Badge>
                            {t.salary && <span className="text-sm text-muted-foreground">{t.salary} € / Monat</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {t.content && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewTemplate(t);
                              }}
                            >
                              <FileText className="h-4 w-4" />
                              Vorschau
                            </Button>
                          )}
                          {selectedTemplate?.id === t.id && (
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-4 w-4 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 0: Personal */}
          {step === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vorname <span className="text-destructive">*</span></Label>
                <Input className={cn(form.first_name.trim() && "border-green-500")} value={form.first_name} onChange={e => updateForm("first_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Nachname <span className="text-destructive">*</span></Label>
                <Input className={cn(form.last_name.trim() && "border-green-500")} value={form.last_name} onChange={e => updateForm("last_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>E-Mail <span className="text-destructive">*</span></Label>
                <Input className={cn(form.email.trim() && "border-green-500")} type="email" value={form.email} onChange={e => updateForm("email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Telefon <span className="text-destructive">*</span></Label>
                <Input className={cn(form.phone.trim() && "border-green-500")} type="tel" value={form.phone} onChange={e => updateForm("phone", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Geburtsdatum <span className="text-destructive">*</span></Label>
                <Input
                  className={cn(/^\d{2}\.\d{2}\.\d{4}$/.test(form.birth_date) && "border-green-500")}
                  placeholder="TT.MM.JJJJ"
                  maxLength={10}
                  value={form.birth_date}
                  onChange={e => {
                    let v = e.target.value.replace(/[^\d.]/g, "");
                    const digits = v.replace(/\./g, "");
                    if (digits.length >= 5) v = digits.slice(0, 2) + "." + digits.slice(2, 4) + "." + digits.slice(4, 8);
                    else if (digits.length >= 3) v = digits.slice(0, 2) + "." + digits.slice(2);
                    updateForm("birth_date", v);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Geburtsort <span className="text-destructive">*</span></Label>
                <Input className={cn(form.birth_place.trim() && "border-green-500")} value={form.birth_place} onChange={e => updateForm("birth_place", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Nationalität <span className="text-destructive">*</span></Label>
                <Popover open={nationalityOpen} onOpenChange={setNationalityOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal", form.nationality ? "border-green-500" : "text-muted-foreground")}>
                      {form.nationality || "Nationalität wählen"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Nationalität suchen..." />
                      <CommandList>
                        <CommandEmpty>Keine Nationalität gefunden.</CommandEmpty>
                        <CommandGroup>
                          {NATIONALITIES.map((nat) => (
                            <CommandItem key={nat} value={nat} onSelect={() => { updateForm("nationality", nat); setNationalityOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", form.nationality === nat ? "opacity-100" : "opacity-0")} />
                              {nat}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Straße & Hausnummer <span className="text-destructive">*</span></Label>
                <Input className={cn(form.street.trim() && "border-green-500")} value={form.street} onChange={e => updateForm("street", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>PLZ <span className="text-destructive">*</span></Label>
                <Input className={cn(form.zip_code.trim() && "border-green-500")} value={form.zip_code} onChange={e => updateForm("zip_code", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Stadt <span className="text-destructive">*</span></Label>
                <Input className={cn(form.city.trim() && "border-green-500")} value={form.city} onChange={e => updateForm("city", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Familienstand <span className="text-destructive">*</span></Label>
                <Select value={form.marital_status} onValueChange={v => updateForm("marital_status", v)}>
                  <SelectTrigger className={cn(form.marital_status && "border-green-500")}><SelectValue placeholder="Bitte wählen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ledig">Ledig</SelectItem>
                    <SelectItem value="verheiratet">Verheiratet</SelectItem>
                    <SelectItem value="geschieden">Geschieden</SelectItem>
                    <SelectItem value="verwitwet">Verwitwet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!selectedTemplate && (
                <div className="space-y-2">
                  <Label>Art der Beschäftigung <span className="text-destructive">*</span></Label>
                  <Select value={form.employment_type} onValueChange={v => updateForm("employment_type", v)}>
                    <SelectTrigger className={cn(form.employment_type && "border-green-500")}><SelectValue placeholder="Bitte wählen" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minijob">Minijob</SelectItem>
                      <SelectItem value="teilzeit">Teilzeit</SelectItem>
                      <SelectItem value="vollzeit">Vollzeit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <DatePickerField label="Gewünschtes Startdatum" value={form.desired_start_date} onChange={d => updateForm("desired_start_date", d || null)} disablePast />
            </div>
          )}

          {/* Step 1: Tax */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Sozialversicherungsnummer <span className="text-destructive">*</span></Label>
                <Input className={cn(form.social_security_number.trim() && "border-green-500")} placeholder="z.B. 12 010185 A 123" value={form.social_security_number} onChange={e => updateForm("social_security_number", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Steuerliche Identifikationsnummer <span className="text-destructive">*</span></Label>
                <Input className={cn(form.tax_id.trim() && "border-green-500")} placeholder="z.B. 12345678901" value={form.tax_id} onChange={e => updateForm("tax_id", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Krankenversicherung <span className="text-destructive">*</span></Label>
                <Input className={cn(form.health_insurance.trim() && "border-green-500")} placeholder="z.B. AOK Bayern" value={form.health_insurance} onChange={e => updateForm("health_insurance", e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 2: Bank */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>IBAN <span className="text-destructive">*</span></Label>
                <Input className={cn(form.iban.trim() && "border-green-500")} placeholder="DE89 3704 0044 0532 0130 00" value={form.iban} onChange={e => updateForm("iban", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>BIC <span className="text-destructive">*</span></Label>
                <Input className={cn(form.bic.trim() && "border-green-500")} placeholder="COBADEFFXXX" value={form.bic} onChange={e => updateForm("bic", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Name der Bank <span className="text-destructive">*</span></Label>
                <Input className={cn(form.bank_name.trim() && "border-green-500")} placeholder="z.B. Commerzbank" value={form.bank_name} onChange={e => updateForm("bank_name", e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 3: Documents */}
          {step === 3 && (
            <div className="space-y-6">
              {/* ID Type Selection */}
              <div className="space-y-3">
                <Label>Dokumenttyp <span className="text-destructive">*</span></Label>
                <RadioGroup value={idType} onValueChange={(v) => {
                  setIdType(v as "personalausweis" | "reisepass");
                  if (v === "reisepass") { removeDoc("back"); }
                }} className="flex gap-4">
                  <div className={cn("flex items-center space-x-2", !isGerman && "opacity-50")}>
                    <RadioGroupItem value="personalausweis" id="personalausweis" disabled={!isGerman} />
                    <Label htmlFor="personalausweis" className={cn("cursor-pointer", !isGerman && "cursor-not-allowed")}>Personalausweis</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="reisepass" id="reisepass" />
                    <Label htmlFor="reisepass" className="cursor-pointer">Reisepass</Label>
                  </div>
                </RadioGroup>
                {!isGerman && (
                  <p className="text-xs text-muted-foreground">Bei nicht-deutscher Staatsangehörigkeit ist nur ein Reisepass möglich.</p>
                )}
              </div>

              {/* ID Upload */}
              <div className={cn("grid gap-4", idType === "personalausweis" ? "grid-cols-2" : "grid-cols-1 max-w-xs")}>
                {(idType === "personalausweis" ? ["front", "back"] as const : ["front"] as const).map((side) => {
                  const preview = side === "front" ? idFrontPreview : idBackPreview;
                  const label = idType === "reisepass" ? "Reisepass" : (side === "front" ? "Vorderseite" : "Rückseite");
                  return preview ? (
                    <div key={side} className="relative rounded-lg border border-green-500 overflow-hidden aspect-[3/2]">
                      <img src={preview} alt={label} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeDoc(side)}
                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:bg-destructive/90"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label key={side} className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg aspect-[3/2] cursor-pointer hover:border-muted-foreground/50 transition-colors">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm font-medium text-muted-foreground">{label}</span>
                      <span className="text-xs text-muted-foreground mt-1">Klicken zum Hochladen</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(side, e.target.files?.[0] || null)} />
                    </label>
                  );
                })}
              </div>

              {/* Meldenachweis */}
              {needsProofOfAddress && (
                <div className="space-y-3 border-t border-border pt-4">
                  <Label>Meldenachweis <span className="text-destructive">*</span></Label>
                  <p className="text-xs text-muted-foreground">z.B. Stromrechnung, Meldebestätigung (Bild oder PDF)</p>
                  {proofOfAddressPreview ? (
                    <div className="relative rounded-lg border border-green-500 overflow-hidden max-w-xs">
                      {isProofPdf(proofOfAddressPreview) ? (
                        <div className="flex items-center gap-2 p-4 bg-muted/30">
                          <FileUp className="h-8 w-8 text-muted-foreground" />
                          <span className="text-sm font-medium truncate">{proofOfAddressFile?.name || "Meldenachweis.pdf"}</span>
                        </div>
                      ) : (
                        <img src={proofOfAddressPreview} alt="Meldenachweis" className="w-full object-cover" />
                      )}
                      <button
                        onClick={() => removeDoc("proof")}
                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:bg-destructive/90"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg py-8 cursor-pointer hover:border-muted-foreground/50 transition-colors max-w-xs">
                      <FileUp className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm font-medium text-muted-foreground">Meldenachweis hochladen</span>
                      <span className="text-xs text-muted-foreground mt-1">Bild oder PDF</span>
                      <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        handleProofUpload(file);
                      }} />
                    </label>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Summary */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                <h4 className="font-semibold text-sm mb-2">Persönliche Informationen</h4>
                <SummaryRow label="Name" value={`${form.first_name} ${form.last_name}`} />
                <SummaryRow label="E-Mail" value={form.email} />
                <SummaryRow label="Telefon" value={form.phone} />
                <SummaryRow label="Geburtsdatum" value={form.birth_date} />
                <SummaryRow label="Geburtsort" value={form.birth_place} />
                <SummaryRow label="Nationalität" value={form.nationality} />
                <SummaryRow label="Adresse" value={`${form.street}, ${form.zip_code} ${form.city}`} />
                <SummaryRow label="Familienstand" value={form.marital_status} />
                <SummaryRow label="Beschäftigung" value={employmentLabels[selectedTemplate?.employment_type || form.employment_type] || form.employment_type} />
                <SummaryRow label="Startdatum" value={form.desired_start_date ? format(form.desired_start_date, "dd.MM.yyyy") : ""} />
              </div>
              <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                <h4 className="font-semibold text-sm mb-2">Steuerliche Angaben</h4>
                <SummaryRow label="Sozialversicherungsnr." value={form.social_security_number} />
                <SummaryRow label="Steuer-ID" value={form.tax_id} />
                <SummaryRow label="Krankenversicherung" value={form.health_insurance} />
              </div>
              <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                <h4 className="font-semibold text-sm mb-2">Bankverbindung</h4>
                <SummaryRow label="IBAN" value={form.iban} />
                <SummaryRow label="BIC" value={form.bic} />
                <SummaryRow label="Bank" value={form.bank_name} />
              </div>
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-sm mb-2">Ausweisdokumente</h4>
                <p className="text-xs text-muted-foreground mb-1">
                  {idType === "reisepass" ? "Reisepass" : "Personalausweis"}
                </p>
                <div className="flex gap-4">
                  {idFrontPreview && <img src={idFrontPreview} alt={idType === "reisepass" ? "Reisepass" : "Vorderseite"} className="h-20 rounded border border-border object-cover" />}
                  {idBackPreview && idType === "personalausweis" && <img src={idBackPreview} alt="Rückseite" className="h-20 rounded border border-border object-cover" />}
                </div>
                {/* Meldenachweis in summary */}
                {proofOfAddressPreview && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">Meldenachweis</p>
                    {isProofPdf(proofOfAddressPreview) ? (
                      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border max-w-xs">
                        <FileUp className="h-6 w-6 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{proofOfAddressFile?.name || "Meldenachweis.pdf"}</span>
                        {savedProofOfAddressUrl && (
                          <a href={savedProofOfAddressUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline ml-auto shrink-0">
                            Öffnen
                          </a>
                        )}
                      </div>
                    ) : (
                      <img src={proofOfAddressPreview} alt="Meldenachweis" className="h-20 rounded border border-border object-cover" />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Contract Preview + Sign */}
          {step === 5 && selectedTemplate && !signatureLoaded && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Vertrag wird geladen…</p>
            </div>
          )}
          {step === 5 && selectedTemplate && signatureLoaded && (
            <div className="space-y-6">
              <div className="border border-border rounded-lg p-6 bg-white prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: replaceTemplatePlaceholders(selectedTemplate.content) }} />
              
              {brandingData?.signature_image_url && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground mb-2">Firmenunterschrift</p>
                  <img src={brandingData.signature_image_url} alt="Firmenunterschrift" className="h-16 object-contain" />
                  <p className="text-sm font-medium mt-1">{brandingData.signer_name}</p>
                  {brandingData.signer_title && <p className="text-xs text-muted-foreground">{brandingData.signer_title}</p>}
                </div>
              )}

              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={() => {
                    setSigDialogOpen(true);
                    setTimeout(initCanvas, 100);
                  }}
                  disabled={submitting}
                >
                  <PenTool className="h-4 w-4 mr-2" /> Unterschreiben
                </Button>
              </div>
            </div>
          )}

          {step === 5 && !selectedTemplate && null}
        </div>

        {/* Navigation */}
        <div className="border-t border-border p-6 flex justify-between">
          <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === (templates.length > 0 ? -1 : 0)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Zurück
          </Button>
          {step < (selectedTemplate ? 5 : 4) ? (
            <Button onClick={() => {
              if (step === -1 && !selectedTemplate && templates.length > 0) return;
              if (step === -1 && templates.length === 0) { setStep(0); return; }
              setStep(s => s + 1);
            }} disabled={!isStepValid()}>
              Weiter <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : step === 4 && !selectedTemplate ? (
            <Button onClick={() => handleSubmit("")} disabled={submitting}>
              {submitting ? "Wird eingereicht..." : "Daten einreichen"}
            </Button>
          ) : step === 4 && selectedTemplate ? (
            <Button onClick={() => setStep(5)} disabled={!isStepValid()}>
              Vertrag ansehen <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : null}
        </div>
      </div>

      {/* Signature Dialog */}
      <Dialog open={sigDialogOpen} onOpenChange={setSigDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Unterschrift</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Bitte unterschreiben Sie im Feld unten mit der Maus oder dem Finger.</p>
          <div className="border-2 border-border rounded-lg overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              width={460}
              height={200}
              className="w-full cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
          <DialogFooter className="flex flex-row justify-between items-center sm:justify-between">
            <Button variant="ghost" size="icon" onClick={clearCanvas} className="text-muted-foreground">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button onClick={handleSign} disabled={submitting}>
              {submitting ? "Wird eingereicht..." : "Bestätigen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.title}</DialogTitle>
          </DialogHeader>
          {previewTemplate?.content && (
            <div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: previewTemplate.content.replace(/<(p|li|tr|div|span)[^>]*>([^<]*\{\{[^}]*\}\}[^<]*)<\/\1>/gi, "").replace(/<(p|li|tr|div|span)[^>]*>[^<]*<[^>]+>[^<]*\{\{[^}]*\}\}.*?<\/\1>/gi, "") }} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
