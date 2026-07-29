/**
 * Einheitliche Formatierung für Telegram-Benachrichtigungen (parse_mode: HTML).
 * Kein Zeitstempel – Telegram zeigt die Uhrzeit selbst an.
 */

const DIVIDER = "━━━━━━━━━━━━━━━━━";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export interface TelegramField {
  /** Emoji vor dem Label, z.B. "👤" */
  icon?: string;
  /** Label, z.B. "Name". Weglassen für eine reine Wert-Zeile. */
  label?: string;
  /** Wert – leere/undefined Werte werden automatisch ausgelassen. */
  value?: string | number | null;
  /** Wert fett darstellen */
  bold?: boolean;
}

export interface TelegramMessageOptions {
  icon?: string;
  title: string;
  fields?: TelegramField[];
  /** Optionaler Footer mit Branding-Namen (🏢 …) */
  brandingName?: string | null;
}

export function buildTelegramMessage({
  icon,
  title,
  fields = [],
  brandingName,
}: TelegramMessageOptions): string {
  const lines: string[] = [];
  lines.push(`${icon ? icon + " " : ""}<b>${escapeHtml(title)}</b>`);
  lines.push(DIVIDER);

  for (const f of fields) {
    if (f.value === null || f.value === undefined) continue;
    const raw = String(f.value).trim();
    if (!raw) continue;
    const val = f.bold ? `<b>${escapeHtml(raw)}</b>` : escapeHtml(raw);
    const prefix = f.icon ? `${f.icon} ` : "";
    lines.push(f.label ? `${prefix}${escapeHtml(f.label)}: ${val}` : `${prefix}${val}`);
  }

  if (brandingName && brandingName.trim()) {
    lines.push(`🏢 ${escapeHtml(brandingName.trim())}`);
  }

  return lines.join("\n");
}

/** ★★★★☆ 4,0 / 5 */
export function renderStars(avg: number): string {
  const rounded = Math.round(avg);
  const filled = "★".repeat(Math.max(0, Math.min(5, rounded)));
  const empty = "☆".repeat(Math.max(0, 5 - Math.max(0, Math.min(5, rounded))));
  return `${filled}${empty} ${avg.toFixed(1).replace(".", ",")} / 5`;
}

const WEEKDAYS = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

/** "Mittwoch, 05.08.2026" */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return typeof date === "string" ? date : "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${WEEKDAYS[d.getDay()]}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** Text auf maxLen kürzen und in Anführungszeichen setzen */
export function quoteText(text: string, maxLen = 140): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return "";
  return `„${t.length > maxLen ? t.slice(0, maxLen) + "…" : t}“`;
}
