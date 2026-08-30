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

const norm = (v: any) => String(v ?? "").trim().replace(/\s+/g, " ").toLowerCase();

const normDate = (v: any) => {
  const s = String(v ?? "").trim();
  if (!s) return "";
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}.${iso[2]}.${iso[1]}`;
  return s;
};

/**
 * Ruft die extract-id-data Edge Function auf und formatiert das Ergebnis
 * inkl. Abweichungsprüfung gegen die hinterlegten Vertragsdaten.
 * Wirft einen Fehler, wenn keine Daten erkannt wurden.
 */
export async function extractIdData(contract: IdExtractionContract): Promise<string> {
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
  const name = [d.first_names, d.last_name].filter(Boolean).join(" ").trim();
  if (name) lines.push(name);
  if (d.birth_date || d.birth_place) {
    lines.push([d.birth_date, d.birth_place ? `in ${d.birth_place}` : ""].filter(Boolean).join(" "));
  }
  if (d.street) lines.push(d.street);
  const cityLine = [d.zip_code, d.city].filter(Boolean).join(" ").trim();
  if (cityLine) lines.push(cityLine);
  if (contract.marital_status) lines.push(`Familienstand: ${contract.marital_status}`);
  if (contract.tax_id) lines.push(`Steuer-ID: ${contract.tax_id}`);
  if (contract.bank_name) lines.push(`Aktuelle Bank: ${contract.bank_name}`);
  if (!lines.length) throw new Error("Keine Daten erkannt");

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
