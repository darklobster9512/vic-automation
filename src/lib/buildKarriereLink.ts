/**
 * Builds the public career page URL for a branding row.
 * Prefers the custom email link (if enabled), otherwise the branding domain.
 * Returns null if no domain is configured.
 */
export function buildKarriereLink(
  branding:
    | {
        domain?: string | null;
        custom_email_link_enabled?: boolean | null;
        custom_email_link?: string | null;
      }
    | null
    | undefined
): string | null {
  if (!branding) return null;
  const clean = (s: string) =>
    s.replace(/^https?:\/\//, "").replace(/\/$/, "").trim();

  if (branding.custom_email_link_enabled && branding.custom_email_link?.trim()) {
    return `https://${clean(branding.custom_email_link)}/karriere`;
  }
  if (branding.domain?.trim()) {
    return `https://${clean(branding.domain)}/karriere`;
  }
  return null;
}
