import { supabase } from "@/integrations/supabase/client";

export interface IdExtractionContract {
  id_front_url?: string | null;
  id_back_url?: string | null;
  id_type?: string | null;
  proof_of_address_url?: string | null;
  marital_status?: string | null;
  tax_id?: string | null;
  bank_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  birth_date?: string | null;
  birth_place?: string | null;
  street?: string | null;
  zip_code?: string | null;
  city?: string | null;
}

export interface ExtractContext {
  appointmentTime?: string | null;
  brandingName?: string | null;
}

const norm = (v: any) => String(v ?? "").trim().replace(/\s+/g, " ").toLowerCase();

const normDate = (v: any) => {
  const s = String(v ?? "").trim();
  if (!s) return "";
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}.${iso[2]}.${iso[1]}`;
  return s;
};

export function shortBrandingName(name?: string | null): string {
  if (!name) return "";
  const cleaned = String(name)
    .replace(/\b(GmbH|UG|AG|KG|OHG|e\.?K\.?|mbH|SE|Ltd\.?|Inc\.?|Co\.?)\b/gi, "")
    .trim();
  const first = cleaned.split(/[\s.,-]+/)[0] || "";
  return first.toUpperCase();
}

function formatTime(t?: string | null): string {
  if (!t) return "";
  const m = String(t).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

/**
 * Ruft die extract-id-data Edge Function auf und formatiert das Ergebnis
 * inkl. Abweichungsprüfung gegen die hinterlegten Vertragsdaten.
 */
export async function extractIdData(
  contract: IdExtractionContract,
  context?: ExtractContext,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("extract-id-data", {
    body: {
      front_url: contract.id_front_url,
      back_url: contract.id_type === "reisepass" ? null : contract.id_back_url,
      id_type: contract.id_type ?? "personalausweis",
      proof_of_address_url: contract.proof_of_address_url ?? null,
    },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  const d = data as any;

  const lines: string[] = [];

  const time = formatTime(context?.appointmentTime);
  const brand = shortBrandingName(context?.brandingName);
  if (time || brand) {
    const header = [time ? `${time} Uhr` : "", brand ? `(${brand})` : ""]
      .filter(Boolean)
      .join(" ");
    lines.push(header);
  }

  const firstNames = String(d.first_names || "").trim();
  const lastName = String(d.last_name || "").trim();
  const birthName = String(d.birth_name || "").trim();
  if (firstNames) lines.push(`Vorname: ${firstNames}`);
  if (lastName) lines.push(`Nachname: ${lastName}`);
  if (birthName) lines.push(`Geburtsname: ${birthName}`);
  if (d.birth_date) lines.push(`Geburtsdatum: ${d.birth_date}`);
  if (d.birth_place) lines.push(`Geburtsort: ${d.birth_place}`);
  if (d.street) lines.push(d.street);
  const cityLine = [d.zip_code, d.city].filter(Boolean).join(" ").trim();
  if (cityLine) lines.push(cityLine);
  if (contract.marital_status) lines.push(`Familienstand: ${contract.marital_status}`);
  if (contract.tax_id) lines.push(`Steuer-ID: ${contract.tax_id}`);
  if (contract.bank_name) lines.push(`Aktuelle Bank: ${contract.bank_name}`);

  const hasContent = firstNames || lastName || d.birth_date || d.birth_place || d.street || cityLine;
  if (!hasContent) throw new Error("Keine Daten erkannt");

  const diffs: Array<{ label: string; original: string }> = [];
  const check = (
    label: string,
    extracted: string,
    original: any,
    normalizer: (v: any) => string = norm,
  ) => {
    const ex = normalizer(extracted);
    const or = normalizer(original);
    if (!ex || !or) return;
    if (ex !== or) diffs.push({ label, original: String(original).trim() });
  };
  check("Vorname", d.first_names, contract.first_name);
  check("Nachname", d.last_name, contract.last_name);
  check("Geburtsdatum", d.birth_date, contract.birth_date, normDate);
  check("Geburtsort", d.birth_place, contract.birth_place);
  check("Straße", d.street, contract.street);
  check("PLZ", d.zip_code, contract.zip_code);
  check("Ort", d.city, contract.city);

  let text = lines.join("\n");
  if (diffs.length) {
    text +=
      "\n\n⚠️ Abweichungen zu hinterlegten Bewerberdaten:\n" +
      diffs.map((x) => `${x.label}: ${x.original}`).join("\n");
  }
  return text;
}
