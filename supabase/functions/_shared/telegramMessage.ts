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
  icon?: string;
  label?: string;
  value?: string | number | null;
  bold?: boolean;
}

export interface TelegramMessageOptions {
  icon?: string;
  title: string;
  fields?: TelegramField[];
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
