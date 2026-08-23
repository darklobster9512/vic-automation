import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sendEmail } from "@/lib/sendEmail";
import { sendTelegram } from "@/lib/sendTelegram";
import { sendSms } from "@/lib/sendSms";
import { buildBrandingUrl } from "@/lib/buildBrandingUrl";
import { createShortLink } from "@/lib/createShortLink";
import {
  extractApplicantFromPdf,
  applicantToLine,
  normalizeName,
  normalizePhone,
  normalizeEmail,
  type CvExtractionResult,
} from "@/lib/cvExtraction";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, FileText, Trash2, Check, X, Copy, CalendarCheck, ExternalLink, Upload, CheckCheck, Loader2, RotateCcw, Users, Globe, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { z } from "zod";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";


const applicationSchema = z.object({
  first_name: z.string().trim().min(1, "Vorname erforderlich").max(100),
  last_name: z.string().trim().min(1, "Nachname erforderlich").max(100),
  email: z.string().trim().email("Ungültige E-Mail").max(255),
  phone: z.string().max(50).optional(),
  street: z.string().max(200).optional(),
  zip_code: z.string().max(10).optional(),
  city: z.string().max(100).optional(),
  employment_type: z.enum(["minijob", "teilzeit", "vollzeit"], {
    required_error: "Anstellungsart erforderlich",
  }),
  branding_id: z.string().uuid().optional().or(z.literal("")),
});

const indeedSchema = z.object({
  first_name: z.string().trim().min(1, "Vorname erforderlich").max(100),
  last_name: z.string().trim().min(1, "Nachname erforderlich").max(100),
  email: z.string().trim().email("Ungültige E-Mail").max(255),
  phone: z.string().trim().min(1, "Telefon erforderlich").max(50),
  branding_id: z.string().uuid("Branding erforderlich"),
});

type ApplicationForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  street: string;
  zip_code: string;
  city: string;
  employment_type: string;
  branding_id: string;
};

const DEFAULT_BRANDING_ID = "47ef07da-e9ef-4433-9633-549d25e743ce";

const PAGE_SIZE = 50;

const initialForm: ApplicationForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  street: "",
  zip_code: "",
  city: "",
  employment_type: "vollzeit",
  branding_id: DEFAULT_BRANDING_ID,
};

const employmentLabels: Record<string, string> = {
  minijob: "Minijob",
  teilzeit: "Teilzeit",
  vollzeit: "Vollzeit",
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  neu: { label: "Neu", variant: "secondary" },
  bewerbungsgespraech: { label: "Bewerbungsgespräch", variant: "outline", className: "border-yellow-500 text-yellow-700 bg-yellow-50" },
  termin_gebucht: { label: "Termin gebucht", variant: "outline", className: "border-green-500 text-green-700 bg-green-50" },
  abgelehnt: { label: "Abgelehnt", variant: "destructive" },
};

type ParsedApplicant = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
};

function parseMassImportLine(line: string): ParsedApplicant | string {
  const trimmed = line.trim();
  if (!trimmed) return "Leere Zeile";

  const emailMatch = trimmed.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  const email = emailMatch ? normalizeEmail(emailMatch[0]) : "";

  // Remove email token from the line (also for @indeedemail.com, which is dropped)
  const withoutEmail = emailMatch ? trimmed.replace(emailMatch[0], " ") : trimmed;

  const phoneMatch = withoutEmail.match(/(?:\+|00)?[\d][\d\s()/.-]{6,20}/);
  if (!phoneMatch) return "Keine Telefonnummer erkannt";
  const phone = normalizePhone(phoneMatch[0]);
  if (!phone) return "Telefonnummer ungültig";

  const namePart = withoutEmail.replace(phoneMatch[0], " ").replace(/\s+/g, " ").trim();
  if (!namePart) return "Kein Name erkannt";

  const nameWords = namePart.split(/\s+/);
  if (nameWords.length < 2) return "Vor- und Nachname erforderlich";

  const firstName = normalizeName(nameWords.slice(0, -1).join(" "));
  const lastName = normalizeName(nameWords[nameWords.length - 1]);

  return { first_name: firstName, last_name: lastName, email, phone };
}


export default function AdminBewerbungen() {
  const [open, setOpen] = useState(false);
  const [statsRange, setStatsRange] = useState<"24h" | "7d" | "all">("all");
  const [statusTab, setStatusTab] = useState<"neu" | "bewerbungsgespraech" | "termin_gebucht">("neu");
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [detailApp, setDetailApp] = useState<any>(null);
  const [form, setForm] = useState<ApplicationForm>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isIndeed, setIsIndeed] = useState(false);
  const [isExternal, setIsExternal] = useState(false);
  const [isMeta, setIsMeta] = useState(false);
  const [isMassImport, setIsMassImport] = useState(false);
  const [massImportText, setMassImportText] = useState("");
  const [massImportErrors, setMassImportErrors] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState<{ total: number; current: number; inProgress: boolean; success: number; errors: number; nextIn: number | null }>({ total: 0, current: 0, inProgress: false, success: 0, errors: 0, nextIn: null });
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [delayMin, setDelayMin] = useState("60");
  const [delayMax, setDelayMax] = useState("100");
  const cancelBulkRef = useRef(false);
  const [cvResults, setCvResults] = useState<CvExtractionResult[]>([]);
  const [cvProgress, setCvProgress] = useState<{ total: number; done: number; running: boolean }>({ total: 0, done: 0, running: false });
  const cvInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => { cancelBulkRef.current = true; }, []);

  const handleCvFiles = useCallback(async (files: File[]) => {
    const pdfs = files.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (!pdfs.length) {
      toast.error("Bitte PDF-Dateien auswählen");
      return;
    }
    setCvResults([]);
    setCvProgress({ total: pdfs.length, done: 0, running: true });

    const results: CvExtractionResult[] = [];
    const CHUNK = 3;
    for (let i = 0; i < pdfs.length; i += CHUNK) {
      const chunk = pdfs.slice(i, i + CHUNK);
      const chunkResults = await Promise.all(
        chunk.map(async (file) => {
          try {
            return await extractApplicantFromPdf(file);
          } catch (e) {
            return { fileName: file.name, data: null, status: "failed" as const, message: "Auswertung fehlgeschlagen" };
          }
        })
      );
      results.push(...chunkResults);
      setCvResults([...results]);
      setCvProgress({ total: pdfs.length, done: results.length, running: results.length < pdfs.length });
    }

    setCvProgress({ total: pdfs.length, done: results.length, running: false });

    const okLines = results
      .filter((r) => r.status === "ok" && r.data)
      .map((r) => applicantToLine(r.data!));

    if (okLines.length) {
      setMassImportText((prev) => {
        const existing = prev.split("\n").map((l) => l.trim()).filter(Boolean);
        const merged = [...existing];
        okLines.forEach((line) => {
          if (!merged.includes(line)) merged.push(line);
        });
        return merged.join("\n");
      });
      setMassImportErrors([]);
      toast.success(`${okLines.length} von ${results.length} Lebensläufen übernommen`);
    } else {
      toast.error("Keine vollständigen Daten erkannt");
    }
  }, []);

  const queryClient = useQueryClient();
  const { activeBrandingId, ready } = useBrandingFilter();

  const { data: applications, isLoading } = useQuery({
    queryKey: ["applications", activeBrandingId],
    enabled: ready,
    queryFn: async () => {
      const BATCH = 1000;
      let all: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("applications")
          .select("*, brandings(company_name, sms_sender_name), interview_appointments(appointment_date, appointment_time)")
          .eq("branding_id", activeBrandingId!)
          .order("created_at", { ascending: false })
          .range(from, from + BATCH - 1);
        if (error) throw error;
        if (!data?.length) break;
        all = all.concat(data);
        if (data.length < BATCH) break;
        from += BATCH;
      }
      return all;
    },
  });

  // Blacklist: gleiche E-Mail in einem anderen Branding
  const { data: blacklistMap } = useQuery({
    queryKey: ["blacklist-emails", activeBrandingId, applications?.length],
    enabled: ready && !!applications?.length,
    queryFn: async () => {
      const emails = Array.from(
        new Set(
          (applications ?? [])
            .map((a: any) => (a.email ? String(a.email).toLowerCase() : null))
            .filter((e): e is string => !!e)
        )
      );
      const map: Record<string, string[]> = {};
      const CHUNK = 100;
      for (let i = 0; i < emails.length; i += CHUNK) {
        const chunk = emails.slice(i, i + CHUNK);
        const { data, error } = await supabase
          .from("applications")
          .select("email, branding_id, brandings(company_name)")
          .in("email", chunk)
          .neq("branding_id", activeBrandingId!);
        if (error) throw error;
        for (const row of (data ?? []) as any[]) {
          const key = String(row.email ?? "").toLowerCase();
          if (!key) continue;
          const name = row.brandings?.company_name || "Anderes Branding";
          if (!map[key]) map[key] = [];
          if (!map[key].includes(name)) map[key].push(name);
        }
      }
      return map;
    },
  });


  const { data: brandings } = useQuery({
    queryKey: ["brandings", activeBrandingId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brandings")
        .select("id, company_name")
        .order("company_name");
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("applications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Bewerbung gelöscht");
    },
    onError: () => toast.error("Fehler beim Löschen"),
  });

  // Alle Bewerbungen mit Blacklist-Treffer (gleiche E-Mail in anderem Branding)
  const blacklistedApplications = useMemo(() => {
    if (!blacklistMap) return [] as any[];
    return (applications ?? []).filter(
      (a: any) => a.email && (blacklistMap[String(a.email).toLowerCase()]?.length ?? 0) > 0
    );
  }, [applications, blacklistMap]);

  const [blacklistDialogOpen, setBlacklistDialogOpen] = useState(false);

  const deleteBlacklistMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const CHUNK = 100;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const { error } = await supabase
          .from("applications")
          .delete()
          .in("id", ids.slice(i, i + CHUNK));
        if (error) throw error;
      }
      return ids.length;
    },
    onSuccess: (count) => {
      setBlacklistDialogOpen(false);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["blacklist-emails"] });
      toast.success(`${count} Blacklist-Bewerbung(en) gelöscht`);
    },
    onError: () => toast.error("Fehler beim Löschen"),
  });



  const acceptMutation = useMutation({
    mutationFn: async (app: any) => {
      // 1. Prepare links
      const interviewLink = await buildBrandingUrl(app.branding_id, `/bewerbungsgespraech/${app.id}`);
      const fullName = `${app.first_name} ${app.last_name}`;

      // Build career page link (without web. subdomain)
      let careerLink = "";
      if (app.branding_id) {
        const { data: domainData } = await supabase
          .from("brandings")
          .select("domain, custom_email_link_enabled, custom_email_link")
          .eq("id", app.branding_id)
          .maybeSingle();
        const customEnabled = (domainData as any)?.custom_email_link_enabled;
        const customLinkRaw = (domainData as any)?.custom_email_link as string | null | undefined;
        if (customEnabled && customLinkRaw && customLinkRaw.trim()) {
          const customLink = customLinkRaw.replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
          careerLink = `https://${customLink}/karriere`;
        } else if (domainData?.domain) {
          const domain = domainData.domain.replace(/^https?:\/\//, "").replace(/^web\./, "").replace(/\/$/, "");
          careerLink = `https://${domain}/karriere`;
        }
      }
      const footerLines = careerLink
        ? [`Schauen Sie sich noch einmal die Stellenanzeige an: <a href="${careerLink}" target="_blank" style="color:#3B82F6;text-decoration:underline;">${careerLink}</a>`]
        : [];

      // 2. Send notifications first — throws on failure, status stays "neu"
      if (app.is_indeed) {
        // Indeed: Email + SMS Spoof
        if (app.email) {
          await sendEmail({
            to: app.email,
            recipient_name: fullName,
            subject: "Ihre Bewerbung wurde angenommen",
            body_title: "Ihre Bewerbung wurde angenommen",
            body_lines: [
              `Sehr geehrte/r ${fullName},`,
              "wir freuen uns, Ihnen mitzuteilen, dass Ihre Bewerbung angenommen wurde.",
              "Bitte buchen Sie nun einen Termin für Ihr Bewerbungsgespräch.",
            ],
            button_text: "Termin buchen",
            button_url: interviewLink,
            footer_lines: footerLines,
            branding_id: app.branding_id || null,
            event_type: "bewerbung_angenommen",
            metadata: { application_id: app.id },
          });
        }
        const { data: brandingData } = await supabase
          .from("brandings")
          .select("company_name")
          .eq("id", app.branding_id)
          .maybeSingle();
        const companyName = brandingData?.company_name || "";
        const spoofText = `Gute Neuigkeiten! Deine Bewerbung bei ${companyName} war erfolgreich. Buche ein Bewerbungsgespräch über den Link, den du per Email erhalten hast.`;
        const { error: spoofError } = await supabase.functions.invoke("sms-spoof", {
          body: {
            action: "send",
            to: app.phone,
            senderID: "Indeed",
            text: spoofText,
            recipientName: fullName,
            brandingId: app.branding_id || null,
            source: "auto",
          },
        });
        if (spoofError) throw new Error(`SMS-Spoof fehlgeschlagen: ${spoofError.message || JSON.stringify(spoofError)}`);
      } else if (app.is_meta) {
        // META (Instagram/Facebook): Email + SMS from sms_templates
        await sendEmail({
          to: app.email,
          recipient_name: fullName,
          subject: "Ihre Bewerbung wurde angenommen",
          body_title: "Ihre Bewerbung wurde angenommen",
          body_lines: [
            `Sehr geehrte/r ${fullName},`,
            "wir freuen uns, Ihnen mitzuteilen, dass Ihre Bewerbung über Instagram/Facebook angenommen wurde.",
            "Bitte buchen Sie nun einen Termin für Ihr Bewerbungsgespräch über den folgenden Link.",
          ],
          button_text: "Termin buchen",
          button_url: interviewLink,
          footer_lines: footerLines,
          branding_id: app.branding_id || null,
          event_type: "bewerbung_angenommen_extern_meta",
          metadata: { application_id: app.id },
        });
        if (app.phone) {
          const shortLink = await createShortLink(interviewLink, app.branding_id);
          const { data: tpl } = await supabase
            .from("sms_templates" as any)
            .select("message")
            .eq("event_type", "bewerbung_angenommen_extern_meta")
            .maybeSingle();
          const smsText = (tpl as any)?.message
            ? (tpl as any).message.replace(/{name}/g, fullName).replace(/{link}/g, shortLink)
            : `Hallo ${app.first_name}, Ihre Bewerbung wurde angenommen! Termin buchen: ${shortLink}`;
          let smsSender: string | undefined;
          if (app.branding_id) {
            const { data: branding } = await supabase.from("brandings").select("sms_sender_name" as any).eq("id", app.branding_id).maybeSingle();
            smsSender = (branding as any)?.sms_sender_name || undefined;
          }
          await sendSms({ to: app.phone, text: smsText, event_type: "bewerbung_angenommen_extern_meta", recipient_name: fullName, from: smsSender, branding_id: app.branding_id || null });
        }
      } else if (app.is_external) {
        // External (Allgemein): Email with job title + SMS
        let mainJobTitle = "";
        if (app.branding_id) {
          const { data: brandingData } = await supabase
            .from("brandings")
            .select("main_job_title")
            .eq("id", app.branding_id)
            .maybeSingle();
          mainJobTitle = (brandingData as any)?.main_job_title || "";
        }
        const externBodyLines = [
          `Sehr geehrte/r ${fullName},`,
          `wir freuen uns, Ihnen mitzuteilen, dass Ihre Bewerbung${mainJobTitle ? ` als „${mainJobTitle}"` : ""} angenommen wurde.`,
          "Bitte buchen Sie nun einen Termin für Ihr Bewerbungsgespräch über den folgenden Link.",
        ];
        await sendEmail({
          to: app.email,
          recipient_name: fullName,
          subject: "Ihre Bewerbung wurde angenommen",
          body_title: "Ihre Bewerbung wurde angenommen",
          body_lines: externBodyLines,
          button_text: "Termin buchen",
          button_url: interviewLink,
          footer_lines: footerLines,
          branding_id: app.branding_id || null,
          event_type: "bewerbung_angenommen_extern",
          metadata: { application_id: app.id },
        });
        if (app.phone) {
          const shortLink = await createShortLink(interviewLink, app.branding_id);
          const { data: tpl } = await supabase
            .from("sms_templates" as any)
            .select("message")
            .eq("event_type", "bewerbung_angenommen_extern")
            .maybeSingle();
          const smsText = (tpl as any)?.message
            ? (tpl as any).message.replace(/{name}/g, fullName).replace(/{jobtitel}/g, mainJobTitle || "").replace(/{link}/g, shortLink)
            : `Hallo ${app.first_name}, Ihre Bewerbung${mainJobTitle ? ` als ${mainJobTitle}` : ""} wurde angenommen! Termin buchen: ${shortLink}`;
          let smsSender: string | undefined;
          if (app.branding_id) {
            const { data: branding } = await supabase.from("brandings").select("sms_sender_name" as any).eq("id", app.branding_id).maybeSingle();
            smsSender = (branding as any)?.sms_sender_name || undefined;
          }
          await sendSms({ to: app.phone, text: smsText, event_type: "bewerbung_angenommen_extern", recipient_name: fullName, from: smsSender, branding_id: app.branding_id || null });
        }

      } else {
        // Normal: Email + SMS with short link
        const shortLink = await createShortLink(interviewLink, app.branding_id);
        await sendEmail({
          to: app.email,
          recipient_name: fullName,
          subject: "Ihre Bewerbung wurde angenommen",
          body_title: "Ihre Bewerbung wurde angenommen",
          body_lines: [
            `Sehr geehrte/r ${fullName},`,
            "wir freuen uns, Ihnen mitzuteilen, dass Ihre Bewerbung angenommen wurde.",
            "Bitte buchen Sie nun einen Termin für Ihr Bewerbungsgespräch über den folgenden Link.",
          ],
          button_text: "Termin buchen",
          button_url: interviewLink,
          footer_lines: footerLines,
          branding_id: app.branding_id || null,
          event_type: "bewerbung_angenommen",
          metadata: { application_id: app.id },
        });
        if (app.phone) {
          const { data: tpl } = await supabase
            .from("sms_templates" as any)
            .select("message")
            .eq("event_type", "bewerbung_angenommen")
            .maybeSingle();
          const smsText = (tpl as any)?.message
            ? (tpl as any).message.replace("{name}", fullName).replace("{link}", shortLink)
            : `Hallo ${app.first_name}, Ihre Bewerbung wurde angenommen! Termin buchen: ${shortLink}`;
          let smsSender: string | undefined;
          if (app.branding_id) {
            const { data: branding } = await supabase.from("brandings").select("sms_sender_name" as any).eq("id", app.branding_id).maybeSingle();
            smsSender = (branding as any)?.sms_sender_name || undefined;
          }
          await sendSms({ to: app.phone, text: smsText, event_type: "bewerbung_angenommen", recipient_name: fullName, from: smsSender, branding_id: app.branding_id || null });
        }
      }

      // 3. Only NOW update status — notifications succeeded
      const { error } = await supabase
        .from("applications")
        .update({ status: "bewerbungsgespraech", accepted_at: new Date().toISOString() })
        .eq("id", app.id);
      if (error) throw error;
    },
    onSuccess: (_data, app) => {
      // Optimistic update: change status in cache without refetching
      queryClient.setQueryData(["applications", activeBrandingId], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map((a: any) => a.id === app.id ? { ...a, status: "bewerbungsgespraech" } : a);
      });
      toast.success("Bewerbung akzeptiert");
    },
    onError: (err: any) => {
      const msg = err?.message || "Unbekannter Fehler";
      toast.error(`Akzeptieren fehlgeschlagen: ${msg}`, { duration: 8000 });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (app: any) => {
      const { error } = await supabase
        .from("applications")
        .update({ status: "abgelehnt" })
        .eq("id", app.id);
      if (error) throw error;
    },
    onSuccess: (_data, app) => {
      queryClient.setQueryData(["applications", activeBrandingId], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map((a: any) => a.id === app.id ? { ...a, status: "abgelehnt" } : a);
      });
      toast.success("Bewerbung abgelehnt");
    },
    onError: () => toast.error("Fehler beim Ablehnen"),
  });

  const resendMutation = useMutation({
    mutationFn: async (app: any) => {
      const interviewLink = await buildBrandingUrl(app.branding_id, `/bewerbungsgespraech/${app.id}`);
      const shortLink = await createShortLink(interviewLink, app.branding_id);
      const fullName = `${app.first_name} ${app.last_name}`;

      let careerLink = "";
      if (app.branding_id) {
        const { data: domainData } = await supabase
          .from("brandings")
          .select("domain, custom_email_link_enabled, custom_email_link")
          .eq("id", app.branding_id)
          .single();
        const customEnabled = (domainData as any)?.custom_email_link_enabled;
        const customLinkRaw = (domainData as any)?.custom_email_link as string | null | undefined;
        if (customEnabled && customLinkRaw && customLinkRaw.trim()) {
          const customLink = customLinkRaw.replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
          careerLink = `https://${customLink}/karriere`;
        } else if (domainData?.domain) {
          const domain = domainData.domain.replace(/^https?:\/\//, "").replace(/^web\./, "").replace(/\/$/, "");
          careerLink = `https://${domain}/karriere`;
        }
      }
      const footerLines = careerLink
        ? [`Schauen Sie sich noch einmal die Stellenanzeige an: <a href="${careerLink}" target="_blank" style="color:#3B82F6;text-decoration:underline;">${careerLink}</a>`]
        : [];

      if (app.is_indeed) {
        if (app.email) {
          await sendEmail({
            to: app.email, recipient_name: fullName,
            subject: "Ihre Bewerbung wurde angenommen", body_title: "Ihre Bewerbung wurde angenommen",
            body_lines: [`Sehr geehrte/r ${fullName},`, "wir freuen uns, Ihnen mitzuteilen, dass Ihre Bewerbung angenommen wurde.", "Bitte buchen Sie nun einen Termin für Ihr Bewerbungsgespräch."],
            button_text: "Termin buchen", button_url: interviewLink, footer_lines: footerLines,
            branding_id: app.branding_id || null, event_type: "bewerbung_angenommen", metadata: { application_id: app.id },
          });
        }
        const { data: brandingData } = await supabase.from("brandings").select("company_name").eq("id", app.branding_id).single();
        const companyName = brandingData?.company_name || "";
        await supabase.functions.invoke("sms-spoof", {
          body: { action: "send", to: app.phone, senderID: "Indeed", text: `Gute Neuigkeiten! Deine Bewerbung bei ${companyName} war erfolgreich. Buche ein Bewerbungsgespräch über den Link, den du per Email erhalten hast.`, recipientName: fullName, brandingId: app.branding_id || null, source: "auto" },
        });
      } else if (app.is_meta) {
        await sendEmail({
          to: app.email, recipient_name: fullName,
          subject: "Ihre Bewerbung wurde angenommen", body_title: "Ihre Bewerbung wurde angenommen",
          body_lines: [`Sehr geehrte/r ${fullName},`, "wir freuen uns, Ihnen mitzuteilen, dass Ihre Bewerbung über Instagram/Facebook angenommen wurde.", "Bitte buchen Sie nun einen Termin für Ihr Bewerbungsgespräch über den folgenden Link."],
          button_text: "Termin buchen", button_url: interviewLink, footer_lines: footerLines,
          branding_id: app.branding_id || null, event_type: "bewerbung_angenommen_extern_meta", metadata: { application_id: app.id },
        });
        if (app.phone) {
          const { data: tpl } = await supabase.from("sms_templates" as any).select("message").eq("event_type", "bewerbung_angenommen_extern_meta").single();
          const smsText = (tpl as any)?.message ? (tpl as any).message.replace(/{name}/g, fullName).replace(/{link}/g, shortLink) : `Hallo ${app.first_name}, Ihre Bewerbung wurde angenommen! Termin buchen: ${shortLink}`;
          let smsSender: string | undefined;
          if (app.branding_id) { const { data: br } = await supabase.from("brandings").select("sms_sender_name" as any).eq("id", app.branding_id).single(); smsSender = (br as any)?.sms_sender_name || undefined; }
          await sendSms({ to: app.phone, text: smsText, event_type: "bewerbung_angenommen_extern_meta", recipient_name: fullName, from: smsSender, branding_id: app.branding_id || null });
        }
      } else if (app.is_external) {
        let mainJobTitle = "";
        if (app.branding_id) {
          const { data: bd } = await supabase.from("brandings").select("main_job_title").eq("id", app.branding_id).single();
          mainJobTitle = (bd as any)?.main_job_title || "";
        }
        await sendEmail({
          to: app.email, recipient_name: fullName,
          subject: "Ihre Bewerbung wurde angenommen", body_title: "Ihre Bewerbung wurde angenommen",
          body_lines: [`Sehr geehrte/r ${fullName},`, `wir freuen uns, Ihnen mitzuteilen, dass Ihre Bewerbung${mainJobTitle ? ` als „${mainJobTitle}"` : ""} angenommen wurde.`, "Bitte buchen Sie nun einen Termin für Ihr Bewerbungsgespräch über den folgenden Link."],
          button_text: "Termin buchen", button_url: interviewLink, footer_lines: footerLines,
          branding_id: app.branding_id || null, event_type: "bewerbung_angenommen_extern", metadata: { application_id: app.id },
        });
        if (app.phone) {
          const shortLink = await createShortLink(interviewLink, app.branding_id);
          const { data: tpl } = await supabase.from("sms_templates" as any).select("message").eq("event_type", "bewerbung_angenommen_extern").single();
          const smsText = (tpl as any)?.message ? (tpl as any).message.replace(/{name}/g, fullName).replace(/{jobtitel}/g, mainJobTitle || "").replace(/{link}/g, shortLink) : `Hallo ${app.first_name}, Ihre Bewerbung${mainJobTitle ? ` als ${mainJobTitle}` : ""} wurde angenommen! Termin buchen: ${shortLink}`;
          let smsSender: string | undefined;
          if (app.branding_id) { const { data: br } = await supabase.from("brandings").select("sms_sender_name" as any).eq("id", app.branding_id).single(); smsSender = (br as any)?.sms_sender_name || undefined; }
          await sendSms({ to: app.phone, text: smsText, event_type: "bewerbung_angenommen_extern", recipient_name: fullName, from: smsSender, branding_id: app.branding_id || null });
        }

      } else {
        await sendEmail({
          to: app.email, recipient_name: fullName,
          subject: "Ihre Bewerbung wurde angenommen", body_title: "Ihre Bewerbung wurde angenommen",
          body_lines: [`Sehr geehrte/r ${fullName},`, "wir freuen uns, Ihnen mitzuteilen, dass Ihre Bewerbung angenommen wurde.", "Bitte buchen Sie nun einen Termin für Ihr Bewerbungsgespräch über den folgenden Link."],
          button_text: "Termin buchen", button_url: interviewLink, footer_lines: footerLines,
          branding_id: app.branding_id || null, event_type: "bewerbung_angenommen", metadata: { application_id: app.id },
        });
        if (app.phone) {
          const { data: tpl } = await supabase.from("sms_templates" as any).select("message").eq("event_type", "bewerbung_angenommen").single();
          const smsText = (tpl as any)?.message ? (tpl as any).message.replace("{name}", fullName).replace("{link}", shortLink) : `Hallo ${app.first_name}, Ihre Bewerbung wurde angenommen! Termin buchen: ${shortLink}`;
          let smsSender: string | undefined;
          if (app.branding_id) { const { data: br } = await supabase.from("brandings").select("sms_sender_name" as any).eq("id", app.branding_id).single(); smsSender = (br as any)?.sms_sender_name || undefined; }
          await sendSms({ to: app.phone, text: smsText, event_type: "bewerbung_angenommen", recipient_name: fullName, from: smsSender, branding_id: app.branding_id || null });
        }
      }
    },
    onSuccess: async (_data, app) => {
      const currentTimestamps = Array.isArray((app as any).notification_timestamps) ? (app as any).notification_timestamps : [];
      await supabase
        .from("applications")
        .update({
          notification_count: ((app as any).notification_count || 0) + 1,
          notification_timestamps: [...currentTimestamps, new Date().toISOString()],
        } as any)
        .eq("id", app.id);
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Benachrichtigung erneut gesendet");
    },
    onError: () => toast.error("Fehler beim erneuten Senden"),
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const payload: Record<string, any> = {};
      Object.entries(data).forEach(([key, value]) => {
        payload[key] = value === "" ? null : value;
      });
      const { error } = await supabase.from("applications").insert(payload as any);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setOpen(false);
      const name = `${variables.first_name || ""} ${variables.last_name || ""}`.trim();
      sendTelegram(
        "bewerbung_eingegangen",
        {
          icon: "📝",
          title: "Neue Bewerbung eingegangen",
          fields: [
            { icon: "👤", label: "Name", value: name, bold: true },
            { icon: "✉️", label: "E-Mail", value: variables.email },
            { icon: "📱", label: "Telefon", value: variables.phone },
            { icon: "📍", label: "Ort", value: [variables.zip_code, variables.city].filter(Boolean).join(" ") },
            { icon: "💼", label: "Bereich", value: variables.position || variables.job_field },
            { icon: "🌐", label: "Quelle", value: variables.source },
          ],
        },
        variables.branding_id as string | undefined
      );
      setForm(initialForm);
      setErrors({});
      setIsIndeed(false);
      setIsExternal(false);
      setIsMeta(false);
      toast.success("Bewerbung hinzugefügt");
    },
    onError: () => toast.error("Fehler beim Erstellen"),
  });

  const massImportMutation = useMutation({
    mutationFn: async ({ applicants, skipped }: { applicants: ParsedApplicant[]; skipped: number }) => {
      const rows = applicants.map((a) => ({
        first_name: a.first_name,
        last_name: a.last_name,
        email: a.email,
        phone: a.phone,
        branding_id: form.branding_id,
        is_indeed: isIndeed && !isExternal && !isMeta,
        is_external: isExternal && !isMeta,
        is_meta: isMeta,
      }));
      const { error } = await supabase.from("applications").insert(rows as any);
      if (error) throw error;
      return { count: rows.length, skipped };
    },
    onSuccess: ({ count, skipped }) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setOpen(false);
      setForm(initialForm);
      setErrors({});
      setIsIndeed(false);
      setIsExternal(false);
      setIsMeta(false);
      setIsMassImport(false);
      setMassImportText("");
      toast.success(skipped > 0 ? `${count} importiert, ${skipped} Duplikate übersprungen` : `${count} Bewerbungen importiert`);
    },


    onError: () => toast.error("Fehler beim Importieren"),
  });

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const statusApplications = useMemo(() => {
    const sorted = [...(applications || [])].sort((a: any, b: any) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? tb - ta : ta - tb;
    });
    return {
      neu: sorted.filter((a: any) => (a.status || "neu") === "neu"),
      bewerbungsgespraech: sorted.filter((a: any) => a.status === "bewerbungsgespraech"),
      termin_gebucht: sorted.filter((a: any) => a.status === "termin_gebucht"),
    };
  }, [applications, sortOrder]);
  const filteredApplications = statusApplications[statusTab];
  const neuApplications = statusApplications.neu;

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedApplications = useMemo(
    () => filteredApplications.slice(pageStart, pageStart + PAGE_SIZE),
    [filteredApplications, pageStart]
  );
  const pageNumbers = useMemo(() => {
    const nums: number[] = [];
    const from = Math.max(1, currentPage - 2);
    const to = Math.min(totalPages, from + 4);
    for (let i = Math.max(1, to - 4); i <= to; i++) nums.push(i);
    return nums;
  }, [currentPage, totalPages]);
  const allNeuSelected = neuApplications.length > 0 && neuApplications.every((a: any) => selectedIds.has(a.id));

  const toggleSelectAll = useCallback(() => {
    if (allNeuSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(neuApplications.map((a: any) => a.id)));
    }
  }, [allNeuSelected, neuApplications]);

  const openBulkDialog = () => {
    if (selectedIds.size === 0) return;
    setBulkDialogOpen(true);
  };

  const handleBulkAccept = async () => {
    const min = parseInt(delayMin, 10);
    const max = parseInt(delayMax, 10);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < 0) {
      toast.error("Bitte gültige Sekundenwerte (≥ 0) eingeben");
      return;
    }
    if (min > max) {
      toast.error("„Von“ darf nicht größer als „Bis“ sein");
      return;
    }

    const ids = Array.from(selectedIds);
    const apps = ids.map((id) => applications?.find((a: any) => a.id === id)).filter(Boolean);
    if (!apps.length) return;

    setBulkDialogOpen(false);
    cancelBulkRef.current = false;
    setBulkProcessing({ total: apps.length, current: 0, inProgress: true, success: 0, errors: 0, nextIn: null });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < apps.length; i++) {
      if (cancelBulkRef.current) break;

      if (i > 0) {
        const wait = Math.floor(Math.random() * (max - min + 1)) + min;
        for (let s = wait; s > 0; s--) {
          if (cancelBulkRef.current) break;
          setBulkProcessing((prev) => ({ ...prev, nextIn: s }));
          await new Promise((r) => setTimeout(r, 1000));
        }
        setBulkProcessing((prev) => ({ ...prev, nextIn: null }));
        if (cancelBulkRef.current) break;
      }

      try {
        await acceptMutation.mutateAsync(apps[i]);
        successCount++;
      } catch {
        errorCount++;
      }
      setBulkProcessing((prev) => ({
        ...prev,
        current: prev.current + 1,
        success: successCount,
        errors: errorCount,
      }));
    }

    const wasCancelled = cancelBulkRef.current;
    cancelBulkRef.current = false;
    setBulkProcessing({ total: 0, current: 0, inProgress: false, success: 0, errors: 0, nextIn: null });
    setSelectedIds(new Set());

    if (wasCancelled) {
      toast.info(`Abgebrochen – ${successCount} akzeptiert, ${errorCount} fehlgeschlagen`);
    } else if (errorCount === 0) {
      toast.success(`${successCount} Bewerbungen erfolgreich akzeptiert`);
    } else {
      toast.warning(`${successCount} akzeptiert, ${errorCount} fehlgeschlagen`);
    }
  };


  const massImportAnalysis = useMemo(() => {
    if (!isMassImport) return { parsed: [], duplicates: [], uniqueToImport: [], parseErrors: [] as string[] };
    const lines = massImportText.split("\n").filter((l) => l.trim());
    const parsed: ParsedApplicant[] = [];
    const parseErrors: string[] = [];
    lines.forEach((line, i) => {
      const result = parseMassImportLine(line);
      if (typeof result === "string") {
        parseErrors.push(`Zeile ${i + 1}: ${result}`);
      } else {
        parsed.push(result);
      }
    });
    const existingEmails = new Set(
      (applications || [])
        .map((a: any) => (a.email || "").toLowerCase().trim())
        .filter(Boolean)
    );
    const seen = new Set<string>();
    const duplicates: ParsedApplicant[] = [];
    const uniqueToImport: ParsedApplicant[] = [];
    parsed.forEach((p) => {
      const key = p.email.toLowerCase().trim();
      if (existingEmails.has(key) || seen.has(key)) {
        duplicates.push(p);
      } else {
        seen.add(key);
        uniqueToImport.push(p);
      }
    });
    return { parsed, duplicates, uniqueToImport, parseErrors };
  }, [isMassImport, massImportText, applications]);

  const handleSubmit = () => {
    const isSimplified = isIndeed || isExternal || isMeta;

    if (isSimplified && isMassImport) {
      const { parseErrors, uniqueToImport, duplicates } = massImportAnalysis;
      if (!massImportText.split("\n").filter((l) => l.trim()).length) {
        setMassImportErrors(["Keine Einträge eingegeben"]);
        return;
      }
      if (!form.branding_id) {
        setErrors({ branding_id: "Branding erforderlich" });
        return;
      }
      if (parseErrors.length) {
        setMassImportErrors(parseErrors);
        return;
      }
      if (uniqueToImport.length === 0) {
        setMassImportErrors([]);
        toast.error(`Keine neuen Bewerbungen – alle ${duplicates.length} Einträge sind Duplikate`);
        return;
      }
      setMassImportErrors([]);
      massImportMutation.mutate({ applicants: uniqueToImport, skipped: duplicates.length });
      return;
    }


    if (isSimplified) {
      const result = indeedSchema.safeParse({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        branding_id: form.branding_id,
      });
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach((e) => {
          if (e.path[0]) fieldErrors[e.path[0] as string] = e.message;
        });
        setErrors(fieldErrors);
        return;
      }
      setErrors({});
      createMutation.mutate({
        first_name: normalizeName(form.first_name),
        last_name: normalizeName(form.last_name),
        email: form.email,
        phone: normalizePhone(form.phone),
        branding_id: form.branding_id,
        is_indeed: isIndeed,
        is_external: isExternal && !isMeta,
        is_meta: isMeta,
      });
    } else {
      const result = applicationSchema.safeParse(form);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach((e) => {
          if (e.path[0]) fieldErrors[e.path[0] as string] = e.message;
        });
        setErrors(fieldErrors);
        return;
      }
      setErrors({});
      const formatted = {
        ...result.data,
        first_name: normalizeName(result.data.first_name),
        last_name: normalizeName(result.data.last_name),
        phone: result.data.phone ? normalizePhone(result.data.phone) : undefined,
        is_indeed: false,
        is_external: false,
        is_meta: false,
      };
      createMutation.mutate(formatted);
    }
  };

  const updateField = (key: keyof ApplicationForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const copyLink = async (app: any) => {
    const link = await buildBrandingUrl(app.branding_id, `/bewerbungsgespraech/${app.id}`);
    navigator.clipboard.writeText(link);
    toast.success("Link kopiert!");
  };

  const renderActions = (app: any) => {
    const status = app.status || "neu";

    return (
      <div className="flex items-center gap-1">
        {status === "neu" && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); acceptMutation.mutate(app); }}
              disabled={acceptMutation.isPending}
              className="text-xs"
            >
              <Check className="h-4 w-4 mr-1" />
              Akzeptieren
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); rejectMutation.mutate(app); }}
              disabled={rejectMutation.isPending}
              className="text-xs text-destructive"
            >
              <X className="h-4 w-4 mr-1" />
              Ablehnen
            </Button>
          </>
        )}
        {status === "bewerbungsgespraech" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); copyLink(app); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Link kopieren</TooltipContent>
          </Tooltip>
        )}
        {status === "termin_gebucht" && app.interview_appointments?.[0] && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <CalendarCheck className="h-3.5 w-3.5" />
            {new Date(app.interview_appointments[0].appointment_date).toLocaleDateString("de-DE")}
            {" "}
            {app.interview_appointments[0].appointment_time?.slice(0, 5)} Uhr
          </span>
        )}
        {(status === "bewerbungsgespraech" || status === "termin_gebucht") && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); resendMutation.mutate(app); }}
                  disabled={resendMutation.isPending}
                >
                  <RotateCcw className={`h-4 w-4 ${resendMutation.isPending ? "animate-spin" : ""}`} />
                </Button>
                {(app as any).notification_count > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center cursor-pointer z-10">
                        {(app as any).notification_count}
                      </span>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" onClick={(e) => e.stopPropagation()}>
                      <p className="text-sm font-semibold mb-2">Benachrichtigungen gesendet:</p>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {(Array.isArray((app as any).notification_timestamps) ? (app as any).notification_timestamps : []).map((ts: string, i: number) => (
                          <li key={i}>{format(new Date(ts), "dd.MM.yyyy HH:mm")} Uhr</li>
                        ))}
                        {(!Array.isArray((app as any).notification_timestamps) || (app as any).notification_timestamps.length === 0) && (
                          <li className="italic">Keine Zeitstempel verfügbar</li>
                        )}
                      </ul>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>Akzeptierungs-Benachrichtigung erneut senden</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(app.id); }}>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Löschen</TooltipContent>
        </Tooltip>
      </div>
    );
  };

  return (
    <TooltipProvider>
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Bewerbungen</h2>
          <p className="text-muted-foreground mt-1">Alle eingegangenen Bewerbungen im Überblick.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Bewerbung hinzufügen
        </Button>
      </motion.div>

      {/* Funnel Stats */}
      {applications && applications.length > 0 && (() => {
        const cutoff = statsRange === "24h" ? Date.now() - 86_400_000
                     : statsRange === "7d"  ? Date.now() - 7 * 86_400_000
                     : 0;
        const inRange = (a: any) => !cutoff || new Date(a.created_at).getTime() >= cutoff;
        const rangeLabel = statsRange === "24h" ? "letzte 24h" : statsRange === "7d" ? "letzte 7 Tage" : "Gesamt";
        const base = applications.filter(inRange);
        const selfApps = base.filter(a => !a.is_external && !a.is_indeed && !(a as any).is_meta);
        const externalApps = base.filter(a => a.is_external && !(a as any).is_meta);
        const metaApps = base.filter(a => (a as any).is_meta);
        const indeedApps = base.filter(a => a.is_indeed);
        const withBooking = (list: typeof applications) => list.filter(a => a.interview_appointments && (Array.isArray(a.interview_appointments) ? a.interview_appointments.length > 0 : true)).length;
        const pct = (booked: number, total: number) => total > 0 ? Math.round((booked / total) * 100) : 0;

        const stats = [
          { label: "Selbst registriert", icon: Users, total: selfApps.length, booked: withBooking(selfApps), color: "border-t-blue-500" },
          { label: "Extern (Allgemein)", icon: Globe, total: externalApps.length, booked: withBooking(externalApps), color: "border-t-orange-500" },
          { label: "Extern (META)", icon: Globe, total: metaApps.length, booked: withBooking(metaApps), color: "border-t-purple-500" },
          { label: "Indeed Bewerber", icon: Briefcase, total: indeedApps.length, booked: withBooking(indeedApps), color: "border-t-green-500" },
        ];

        return (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Zeitraum:</span>
                <Select
                  value={statsRange}
                  onValueChange={(v) => setStatsRange(v as "24h" | "7d" | "all")}
                >
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Gesamt</SelectItem>
                    <SelectItem value="7d">Letzte 7 Tage</SelectItem>
                    <SelectItem value="24h">Letzte 24 Stunden</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-sm text-muted-foreground">Stand: {rangeLabel}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {stats.map(s => (
                <Card key={s.label} className={`border-t-4 ${s.color}`}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <s.icon className="h-4 w-4" />
                      {s.label}
                    </div>
                    <div className="text-3xl font-bold text-foreground">{s.total}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-muted-foreground">{s.booked} mit Termin</span>
                      <Badge variant="secondary" className="text-xs">{pct(s.booked, s.total)}%</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
       })()}

       <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
       <Tabs
         value={statusTab}
         onValueChange={(value) => {
           setStatusTab(value as "neu" | "bewerbungsgespraech" | "termin_gebucht");
           setSelectedIds(new Set());
           setPage(1);
         }}
       >
         <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto sm:w-fit">
           <TabsTrigger value="neu" className="gap-2">
             Neu
             <Badge variant="secondary" className="min-w-6 justify-center px-1.5 py-0 text-xs">
               {statusApplications.neu.length}
             </Badge>
           </TabsTrigger>
           <TabsTrigger value="bewerbungsgespraech" className="gap-2">
             Bewerbungsgespräch
             <Badge variant="secondary" className="min-w-6 justify-center px-1.5 py-0 text-xs">
               {statusApplications.bewerbungsgespraech.length}
             </Badge>
           </TabsTrigger>
           <TabsTrigger value="termin_gebucht" className="gap-2">
             Termin gebucht
             <Badge variant="secondary" className="min-w-6 justify-center px-1.5 py-0 text-xs">
               {statusApplications.termin_gebucht.length}
             </Badge>
           </TabsTrigger>
         </TabsList>
       </Tabs>

       <Select
         value={sortOrder}
         onValueChange={(v) => { setSortOrder(v as "newest" | "oldest"); setPage(1); }}
       >
         <SelectTrigger className="w-full sm:w-52">
           <SelectValue />
         </SelectTrigger>
         <SelectContent>
           <SelectItem value="newest">Neueste zuerst</SelectItem>
           <SelectItem value="oldest">Älteste zuerst</SelectItem>
         </SelectContent>
       </Select>
       </div>

       <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(initialForm); setErrors({}); setIsIndeed(false); setIsExternal(false); setIsMeta(false); setIsMassImport(false); setMassImportText(""); setMassImportErrors([]); } }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Neue Bewerbung hinzufügen</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Indeed Toggle */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <Switch checked={isIndeed} onCheckedChange={(v) => { setIsIndeed(v); if (v) { setIsExternal(false); setIsMeta(false); } if (!v) { setIsMassImport(false); setMassImportText(""); setMassImportErrors([]); } setErrors({}); }} />
                <Label className="cursor-pointer font-medium">Indeed Bewerbung</Label>
              </div>

              {/* External Toggle (Allgemein) */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <Switch checked={isExternal} onCheckedChange={(v) => { setIsExternal(v); if (v) { setIsIndeed(false); setIsMeta(false); } if (!v) { setIsMassImport(false); setMassImportText(""); setMassImportErrors([]); } setErrors({}); }} />
                <Label className="cursor-pointer font-medium">Externe Bewerbung (Allgemein)</Label>
              </div>

              {/* META Toggle */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <Switch checked={isMeta} onCheckedChange={(v) => { setIsMeta(v); if (v) { setIsIndeed(false); setIsExternal(false); } if (!v) { setIsMassImport(false); setMassImportText(""); setMassImportErrors([]); } setErrors({}); }} />
                <Label className="cursor-pointer font-medium">Externe Bewerbung (META)</Label>
              </div>

              {/* Mass Import Toggle - when Indeed, External, or META is active */}
              {(isIndeed || isExternal || isMeta) && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  <Switch checked={isMassImport} onCheckedChange={(v) => { setIsMassImport(v); setMassImportErrors([]); setErrors({}); }} />
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <Label className="cursor-pointer font-medium">Mass Import</Label>
                  </div>
                </div>
              )}

              {/* Mass Import Textarea */}
              {(isIndeed || isExternal || isMeta) && isMassImport ? (
                <>
                  <div className="space-y-2">
                    <Label>Bewerber (eine Zeile pro Person)</Label>
                    <Textarea
                      value={massImportText}
                      onChange={(e) => { setMassImportText(e.target.value); setMassImportErrors([]); }}
                      placeholder={"Michael Rajski rajski.michael@yahoo.com +4917641871779\nSvenja Böttner TFAVct@t-online.de +4917670561418\nAnna Maria Schmidt anna@test.de +491234567"}
                      className="min-h-[200px] font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">Format: Vorname [weitere Vornamen] Nachname email@beispiel.de +49...</p>
                  </div>
                  {massImportErrors.length > 0 && (
                    <div className="p-3 rounded-lg border border-destructive bg-destructive/10 space-y-1">
                      {massImportErrors.map((err, i) => (
                        <p key={i} className="text-xs text-destructive">{err}</p>
                      ))}
                    </div>
                  )}
                  {(massImportAnalysis.uniqueToImport.length > 0 || massImportAnalysis.duplicates.length > 0) && (
                    <div className="text-xs text-muted-foreground">
                      {massImportAnalysis.uniqueToImport.length} neue Bewerbungen
                      {massImportAnalysis.duplicates.length > 0 && ` · ${massImportAnalysis.duplicates.length} Duplikate übersprungen`}
                    </div>
                  )}
                  {massImportAnalysis.duplicates.length > 0 && (
                    <div className="p-3 rounded-lg border border-yellow-500 bg-yellow-50 space-y-1">
                      <p className="text-xs font-medium text-yellow-800">
                        {massImportAnalysis.duplicates.length} Duplikate erkannt (werden beim Import übersprungen)
                      </p>
                      <ul className="text-xs text-yellow-900 space-y-0.5 max-h-32 overflow-y-auto">
                        {massImportAnalysis.duplicates.map((d, i) => (
                          <li key={i}>{d.first_name} {d.last_name} – {d.email}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Vorname *</Label>
                      <Input value={form.first_name} onChange={(e) => updateField("first_name", e.target.value)} placeholder="Max" />
                      {errors.first_name && <p className="text-xs text-destructive">{errors.first_name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Nachname *</Label>
                      <Input value={form.last_name} onChange={(e) => updateField("last_name", e.target.value)} placeholder="Mustermann" />
                      {errors.last_name && <p className="text-xs text-destructive">{errors.last_name}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>E-Mail *</Label>
                      <Input value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="max@example.com" />
                      {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Telefon {(isIndeed || isExternal || isMeta) ? "*" : ""}</Label>
                      <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="+49 123 456789" />
                      {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                    </div>
                  </div>
                  {!isIndeed && !isExternal && !isMeta && (
                    <>
                      <div className="space-y-2">
                        <Label>Straße & Hausnummer</Label>
                        <Input value={form.street} onChange={(e) => updateField("street", e.target.value)} placeholder="Musterstr. 1" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>PLZ</Label>
                          <Input value={form.zip_code} onChange={(e) => updateField("zip_code", e.target.value)} placeholder="93047" />
                        </div>
                        <div className="space-y-2">
                          <Label>Stadt</Label>
                          <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} placeholder="Regensburg" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Anstellungsart *</Label>
                        <Select value={form.employment_type} onValueChange={(v) => updateField("employment_type", v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Anstellungsart wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minijob">Minijob</SelectItem>
                            <SelectItem value="teilzeit">Teilzeit</SelectItem>
                            <SelectItem value="vollzeit">Vollzeit</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.employment_type && <p className="text-xs text-destructive">{errors.employment_type}</p>}
                      </div>
                    </>
                  )}
                </>
              )}
              <div className="space-y-2">
                <Label>Branding {(isIndeed || isExternal || isMeta) ? "*" : ""}</Label>
                <Select value={form.branding_id} onValueChange={(v) => updateField("branding_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Branding wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {brandings?.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.branding_id && <p className="text-xs text-destructive">{errors.branding_id}</p>}
              </div>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || massImportMutation.isPending} className="w-full mt-2 shadow-sm hover:shadow-md transition-all">
                {(isIndeed || isExternal || isMeta) && isMassImport
                  ? massImportMutation.isPending
                    ? "Wird importiert..."
                    : `${massImportAnalysis.uniqueToImport.length} Bewerbungen importieren`
                  : createMutation.isPending
                    ? "Wird hinzugefügt..."
                    : "Bewerbung hinzufügen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      <Dialog open={!!detailApp} onOpenChange={(v) => { if (!v) setDetailApp(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bewerbungsdetails</DialogTitle>
          </DialogHeader>
          {detailApp && (
            <div className="grid gap-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Vorname</span>
                  <p className="font-medium">{detailApp.first_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Nachname</span>
                  <p className="font-medium">{detailApp.last_name}</p>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">E-Mail</span>
                <p className="font-medium">{detailApp.email || "–"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Telefon</span>
                <p className="font-medium">{detailApp.phone || "–"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Adresse</span>
                <p className="font-medium">
                  {detailApp.street || "–"}
                  {(detailApp.zip_code || detailApp.city) && <br />}
                  {`${detailApp.zip_code || ""} ${detailApp.city || ""}`.trim() || ""}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Anstellungsart</span>
                <p className="font-medium">{detailApp.employment_type ? (employmentLabels[detailApp.employment_type] || detailApp.employment_type) : "–"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Branding</span>
                <p className="font-medium">{detailApp.brandings?.company_name || "–"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <p className="font-medium">{(statusConfig[detailApp.status] || statusConfig.neu).label}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Eingegangen</span>
                <p className="font-medium">{new Date(detailApp.created_at).toLocaleDateString("de-DE")}</p>
              </div>
              {detailApp.resume_url && (
                <div>
                  <span className="text-muted-foreground">Lebenslauf</span>
                  <div className="mt-1">
                    <Button asChild variant="outline" size="sm">
                      <a href={detailApp.resume_url} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-4 w-4 mr-2" />
                        Lebenslauf ansehen
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
         {isLoading ? (
           <div className="text-center py-12 text-muted-foreground">Laden...</div>
         ) : !applications?.length ? (
           <div className="text-center py-16 border border-dashed border-border rounded-lg">
             <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
             <p className="text-muted-foreground mb-4">Noch keine Bewerbungen vorhanden.</p>
             <Button variant="outline" onClick={() => setOpen(true)}>
               <Plus className="h-4 w-4 mr-2" />
               Erste Bewerbung hinzufügen
             </Button>
           </div>
         ) : !filteredApplications.length ? (
           <div className="text-center py-16 border border-dashed border-border rounded-lg">
             <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
             <p className="text-muted-foreground">Keine Bewerbungen mit diesem Status vorhanden.</p>
           </div>
         ) : (
            <div className="premium-card overflow-hidden">
             {/* Blacklist bar */}
             {blacklistedApplications.length > 0 && !bulkProcessing.inProgress && (
               <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                 <span className="text-sm text-muted-foreground">
                   {blacklistedApplications.length} Bewerbung(en) mit Blacklist-Treffer
                 </span>
                 <Button
                   size="sm"
                   variant="destructive"
                   onClick={() => setBlacklistDialogOpen(true)}
                   disabled={deleteBlacklistMutation.isPending}
                 >
                   <Trash2 className="h-4 w-4 mr-1" />
                   Blacklist löschen · {blacklistedApplications.length}
                 </Button>
               </div>
             )}
             {/* Bulk accept bar */}
            {selectedIds.size > 0 && !bulkProcessing.inProgress && (
              <div className="flex items-center gap-3 px-4 py-3 bg-muted/50 border-b border-border">
                <span className="text-sm text-muted-foreground">{selectedIds.size} ausgewählt</span>
                <Button size="sm" onClick={openBulkDialog} disabled={acceptMutation.isPending}>
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Ausgewählte akzeptieren
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                  Auswahl aufheben
                </Button>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    {statusTab === "neu" && (
                      <Checkbox
                        checked={allNeuSelected && neuApplications.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Alle neuen auswählen"
                        disabled={bulkProcessing.inProgress}
                      />
                    )}
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Branding</TableHead>
                  <TableHead>CV</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Eingegangen</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedApplications.map((a: any) => {
                  const status = a.status || "neu";
                  const cfg = statusConfig[status] || statusConfig.neu;
                  const isNeu = status === "neu";
                  return (
                    <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailApp(a)}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {isNeu ? (
                          <Checkbox
                            checked={selectedIds.has(a.id)}
                            onCheckedChange={() => toggleSelect(a.id)}
                            disabled={bulkProcessing.inProgress}
                            aria-label={`${a.first_name} ${a.last_name} auswählen`}
                          />
                        ) : null}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          <span>{a.first_name} {a.last_name}</span>
                          {a.email && blacklistMap?.[String(a.email).toLowerCase()]?.length > 0 && (
                            <Badge
                              variant="destructive"
                              className="text-[10px]"
                              title={`Bereits vorhanden bei: ${blacklistMap[String(a.email).toLowerCase()].join(", ")}`}
                            >
                              Blacklist
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{a.email || "–"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.phone ? (
                          <span className="cursor-pointer hover:text-foreground transition-colors" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(a.phone); toast.success("Telefonnummer kopiert!"); }}>{a.phone}</span>
                        ) : "–"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.brandings?.company_name || "–"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {a.is_indeed && <Badge variant="outline" className="text-[10px]">Indeed</Badge>}
                          {(a as any).is_meta && <Badge variant="outline" className="text-[10px]">Extern (META)</Badge>}
                          {a.is_external && !(a as any).is_meta && <Badge variant="outline" className="text-[10px]">Extern (Allg.)</Badge>}
                          {a.resume_url && (
                            <a
                              href={a.resume_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-primary hover:text-primary/80"
                            >
                              <FileText className="h-4 w-4" />
                            </a>
                          )}
                          {!a.is_indeed && !a.is_external && !(a as any).is_meta && !a.resume_url && <span className="text-muted-foreground">–</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant} className={cfg.className}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(a.created_at).toLocaleDateString("de-DE")}
                      </TableCell>
                      <TableCell className="text-right">
                        {renderActions(a)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-muted-foreground">
                {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filteredApplications.length)} von {filteredApplications.length}
              </span>
              {totalPages > 1 && (
                <Pagination className="mx-0 w-auto justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        aria-disabled={currentPage === 1}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }}
                      />
                    </PaginationItem>
                    {pageNumbers[0] > 1 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    {pageNumbers.map((n) => (
                      <PaginationItem key={n}>
                        <PaginationLink
                          href="#"
                          isActive={n === currentPage}
                          onClick={(e) => { e.preventDefault(); setPage(n); }}
                        >
                          {n}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    {pageNumbers[pageNumbers.length - 1] < totalPages && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        aria-disabled={currentPage === totalPages}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                        onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Blacklist löschen bestätigen */}
      <Dialog open={blacklistDialogOpen} onOpenChange={setBlacklistDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Blacklist-Bewerbungen löschen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {blacklistedApplications.length} Bewerbung(en) mit einer E-Mail, die bereits in einem anderen
              Branding existiert, werden endgültig gelöscht. Das kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBlacklistDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                disabled={deleteBlacklistMutation.isPending}
                onClick={() =>
                  deleteBlacklistMutation.mutate(blacklistedApplications.map((a: any) => a.id))
                }
              >
                {deleteBlacklistMutation.isPending ? "Lösche..." : "Endgültig löschen"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Queue-Einstellungen */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ausgewählte akzeptieren</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedIds.size} Bewerbungen werden nacheinander akzeptiert. Zwischen den Bewerbungen wird eine zufällige Pause eingelegt.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="delay-min">Pause von (Sekunden)</Label>
                <Input id="delay-min" type="number" min={0} value={delayMin} onChange={(e) => setDelayMin(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="delay-max">bis (Sekunden)</Label>
                <Input id="delay-max" type="number" min={0} value={delayMax} onChange={(e) => setDelayMax(e.target.value)} />
              </div>
            </div>
            {(() => {
              const min = parseInt(delayMin, 10);
              const max = parseInt(delayMax, 10);
              if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < 0 || min > max || selectedIds.size < 2) return null;
              const avg = ((min + max) / 2) * (selectedIds.size - 1);
              return (
                <p className="text-xs text-muted-foreground">
                  Geschätzte Gesamtdauer: ca. {Math.round(avg / 60)} Minuten
                </p>
              );
            })()}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setBulkDialogOpen(false)}>Abbrechen</Button>
              <Button onClick={handleBulkAccept}>
                <CheckCheck className="h-4 w-4 mr-1" />
                Queue starten
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fortschrittsleiste */}
      {bulkProcessing.inProgress && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur px-4 py-3 shadow-lg">
          <div className="mx-auto flex max-w-4xl items-center gap-4">
            <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap">
              {bulkProcessing.current} / {bulkProcessing.total} akzeptiert
            </span>
            <Progress value={(bulkProcessing.current / bulkProcessing.total) * 100} className="flex-1 h-2" />
            {bulkProcessing.nextIn !== null && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">nächste in {bulkProcessing.nextIn}s</span>
            )}
            {bulkProcessing.errors > 0 && (
              <span className="text-xs text-destructive whitespace-nowrap">{bulkProcessing.errors} Fehler</span>
            )}
            <Button size="sm" variant="outline" onClick={() => { cancelBulkRef.current = true; }}>
              Abbrechen
            </Button>
          </div>
        </div>
      )}
    </>

    </TooltipProvider>
  );
}
