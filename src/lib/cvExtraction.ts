import { pdfjs } from "react-pdf";
import { supabase } from "@/integrations/supabase/client";

if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

export type ExtractedApplicant = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
};

export type CvExtractionResult = {
  fileName: string;
  data: ExtractedApplicant | null;
  status: "ok" | "incomplete" | "failed";
  message?: string;
};

/** "SARAH HINKE" -> "Sarah Hinke", keeps already mixed-case names (McDonald, van Dijk). */
export function normalizeName(raw: string): string {
  return (raw || "")
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (word !== word.toUpperCase() && word !== word.toLowerCase()) return word; // already mixed case
      return word
        .split(/([-'’])/)
        .map((part) =>
          /^[-'’]$/.test(part) || !part
            ? part
            : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        )
        .join("");
    })
    .join(" ");
}

/** Any German number -> +49XXXXXXXXX (no spaces, brackets, dashes). Returns "" if invalid. */
export function normalizePhone(raw: string): string {
  if (!raw) return "";
  let cleaned = raw.replace(/[^\d+]/g, "");
  cleaned = cleaned.replace(/(?!^)\+/g, "");
  if (cleaned.startsWith("00")) cleaned = "+" + cleaned.slice(2);
  if (cleaned.startsWith("+")) {
    if (cleaned.startsWith("+490")) cleaned = "+49" + cleaned.slice(4);
  } else if (cleaned.startsWith("0")) {
    cleaned = "+49" + cleaned.slice(1);
  } else if (cleaned.startsWith("49")) {
    cleaned = "+" + cleaned;
  } else {
    cleaned = "+49" + cleaned;
  }
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 11 || digits.length > 15) return "";
  return cleaned;
}

export function normalizeEmail(raw: string): string {
  const email = (raw || "").trim().toLowerCase();
  if (!email) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "";
  if (email.endsWith("@indeedemail.com")) return "";
  return email;
}

/** Extract plain text from a PDF file using pdf.js in the browser. */
export async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  const maxPages = Math.min(doc.numPages, 5);
  for (let i = 1; i <= maxPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      (content.items as Array<{ str?: string }>)
        .map((item) => item.str ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
    );
  }
  return pages.join("\n");
}

function nameFromFileName(fileName: string): { first: string; last: string } | null {
  let base = fileName.replace(/\.pdf$/i, "");
  base = base.replace(/^(lebenslauf|cv|resume)[-_ ]*/i, "");
  base = base.replace(/[_-]+/g, " ");
  // Split CamelCase / consecutive caps boundaries
  base = base
    .replace(/([a-zäöüß])([A-ZÄÖÜ])/g, "$1 $2")
    .replace(/([A-ZÄÖÜ]+)([A-ZÄÖÜ][a-zäöüß])/g, "$1 $2");
  const words = base.split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;
  return {
    first: normalizeName(words.slice(0, -1).join(" ")),
    last: normalizeName(words[words.length - 1]),
  };
}

/** Pure regex fallback extraction from raw CV text. */
export function fallbackExtract(text: string, fileName: string): Partial<ExtractedApplicant> {
  const result: Partial<ExtractedApplicant> = {};

  const emailMatch = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  if (emailMatch) {
    const email = normalizeEmail(emailMatch[0]);
    if (email) result.email = email;
  }

  const phoneCandidates =
    text.match(/(?:\+49|0049|0)\s?1[5-7][\d\s()/.-]{6,16}/g) ?? [];
  for (const candidate of phoneCandidates) {
    const phone = normalizePhone(candidate);
    if (phone) {
      result.phone = phone;
      break;
    }
  }

  const fromFile = nameFromFileName(fileName);
  if (fromFile) {
    result.first_name = fromFile.first;
    result.last_name = fromFile.last;
  }

  return result;
}

/** Full extraction for one PDF: pdf.js text -> AI edge function -> normalize -> fallback. */
export async function extractApplicantFromPdf(file: File): Promise<CvExtractionResult> {
  let text = "";
  try {
    text = await extractPdfText(file);
  } catch (e) {
    return {
      fileName: file.name,
      data: null,
      status: "failed",
      message: "PDF konnte nicht gelesen werden",
    };
  }

  if (!text.trim()) {
    return { fileName: file.name, data: null, status: "failed", message: "Kein Text im PDF gefunden" };
  }

  let ai: Partial<ExtractedApplicant> = {};
  try {
    const { data, error } = await supabase.functions.invoke("extract-cv-data", {
      body: { text: text.slice(0, 12000), file_name: file.name },
    });
    if (error) throw error;
    if (data?.applicant) ai = data.applicant;
  } catch (e) {
    console.error("extract-cv-data failed", e);
  }

  const fb = fallbackExtract(text, file.name);

  const first_name = normalizeName(ai.first_name || fb.first_name || "");
  const last_name = normalizeName(ai.last_name || fb.last_name || "");
  const email = normalizeEmail(ai.email || "") || fb.email || "";
  const phone = normalizePhone(ai.phone || "") || fb.phone || "";

  if (!first_name || !last_name || !phone) {
    const missing = [
      !first_name || !last_name ? "Name" : null,
      !phone ? "Telefonnummer" : null,
    ].filter(Boolean);
    return {
      fileName: file.name,
      data: { first_name, last_name, email, phone },
      status: "incomplete",
      message: `Fehlend: ${missing.join(", ")}`,
    };
  }

  return { fileName: file.name, data: { first_name, last_name, email, phone }, status: "ok" };
}

export function applicantToLine(a: ExtractedApplicant): string {
  return [`${a.first_name} ${a.last_name}`, a.email, a.phone].filter(Boolean).join(" ");
}
