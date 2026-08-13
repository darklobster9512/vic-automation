// Client-side mirror of the Edge Function buildEmailHtml

export function buildEmailHtml(opts: {
  companyName: string;
  brandColor: string;
  bodyTitle: string;
  bodyLines: string[];
  buttonText?: string;
  buttonUrl?: string;
  footerLines?: string[];
  footerAddress: string;
  footerDetails?: { managingDirector?: string; phone?: string; registerCourt?: string; tradeRegister?: string; vatId?: string };
  emailLogoEnabled?: boolean;
  emailLogoUrl?: string;
}): string {
  const { companyName, brandColor, bodyTitle, bodyLines, buttonText, buttonUrl, footerLines, footerAddress, footerDetails } = opts;

  // Detect "info" lines (containing : like "E-Mail: ...", "Auftrag: ...", "Datum: ...")
  const linesHtml = bodyLines
    .map((line) => {
      const isInfoLine = /^(E-Mail|Passwort|Auftrag|Datum|Uhrzeit|Startdatum|Ihr Startdatum):/i.test(line.trim());
      if (isInfoLine) {
        return `<div style="margin:4px 0;padding:10px 14px;background-color:#f8fafc;border-left:3px solid ${brandColor};border-radius:0 6px 6px 0;font-size:14px;line-height:1.5;color:#1e293b;font-family:'SF Mono',SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace;">${line}</div>`;
      }
      return `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">${line}</p>`;
    })
    .join("\n");

  const buttonHtml = buttonText && buttonUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 8px 0;">
        <tr>
          <td style="border-radius:8px;background-color:${brandColor};box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1);">
            <a href="${buttonUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;letter-spacing:0.2px;">${buttonText}</a>
          </td>
        </tr>
      </table>`
    : "";

  const emailLogoEnabled = opts.emailLogoEnabled || false;
  const emailLogoUrl = opts.emailLogoUrl || "";
  const logoHtml = emailLogoEnabled && emailLogoUrl
    ? `<img src="${emailLogoUrl}" alt="${companyName}" style="max-height:48px;max-width:280px;display:block;margin:0 auto;" />`
    : `<span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">${companyName}</span>`;

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;">
<tr><td align="center" style="padding:48px 16px;">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 20px 25px -5px rgba(0,0,0,0.08),0 8px 10px -6px rgba(0,0,0,0.04);">

<!-- Header -->
<tr>
  <td style="background:linear-gradient(135deg, ${brandColor} 0%, ${brandColor}dd 50%, ${brandColor}bb 100%);padding:40px 32px;text-align:center;">
    ${logoHtml}
  </td>
</tr>

<!-- Body -->
<tr>
  <td style="background-color:#ffffff;padding:40px 36px 20px 36px;">
    <h1 style="margin:0 0 24px 0;font-size:21px;font-weight:700;color:#0f172a;line-height:1.3;letter-spacing:-0.3px;">${bodyTitle}</h1>
    ${linesHtml}
    ${buttonHtml}
  </td>
</tr>

<!-- Footer -->
<tr>
  <td style="background-color:#ffffff;padding:0 36px 32px 36px;">
    ${(footerLines || []).map((line) => `<p style="margin:12px 0 0 0;font-size:14px;line-height:1.6;color:#374151;">${line}</p>`).join("\n")}
    <div style="margin:28px 0 0 0;padding:24px 20px;border-top:1px solid #e2e8f0;background-color:#f8fafc;border-radius:0 0 16px 16px;">
      <p style="margin:0 0 2px 0;font-size:14px;font-weight:600;color:#334155;text-align:center;">${companyName}</p>
      ${footerAddress ? '<p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">' + footerAddress + "</p>" : ""}
      ${(() => {
        if (!footerDetails) return "";
        const rows: string[] = [];
        if (footerDetails.managingDirector) rows.push('<tr><td style="padding:3px 12px 3px 0;font-size:12px;color:#94a3b8;white-space:nowrap;">Geschäftsführer</td><td style="padding:3px 0;font-size:12px;color:#64748b;">' + footerDetails.managingDirector + "</td></tr>");
        if (footerDetails.phone) rows.push('<tr><td style="padding:3px 12px 3px 0;font-size:12px;color:#94a3b8;white-space:nowrap;">Telefon</td><td style="padding:3px 0;font-size:12px;color:#64748b;">' + footerDetails.phone + "</td></tr>");
        if (footerDetails.registerCourt) rows.push('<tr><td style="padding:3px 12px 3px 0;font-size:12px;color:#94a3b8;white-space:nowrap;">Amtsgericht</td><td style="padding:3px 0;font-size:12px;color:#64748b;">' + footerDetails.registerCourt + "</td></tr>");
        if (footerDetails.tradeRegister) rows.push('<tr><td style="padding:3px 12px 3px 0;font-size:12px;color:#94a3b8;white-space:nowrap;">Handelsregister</td><td style="padding:3px 0;font-size:12px;color:#64748b;">' + footerDetails.tradeRegister + "</td></tr>");
        if (footerDetails.vatId) rows.push('<tr><td style="padding:3px 12px 3px 0;font-size:12px;color:#94a3b8;white-space:nowrap;">USt-ID</td><td style="padding:3px 0;font-size:12px;color:#64748b;">' + footerDetails.vatId + "</td></tr>");
        if (!rows.length) return "";
        return '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:12px auto 0 auto;">' + rows.join("") + "</table>";
      })()}
    </div>
  </td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
