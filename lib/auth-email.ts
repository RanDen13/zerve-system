type AuthEmailTone = "primary" | "success";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toneColor(tone: AuthEmailTone) {
  return tone === "success" ? "#047857" : "#2563eb";
}

export function authEmailLayout({
  preview,
  eyebrow,
  headline,
  message,
  badge,
  tone = "primary",
  rows,
  ctaHref,
  ctaLabel,
  footer,
}: {
  preview: string;
  eyebrow: string;
  headline: string;
  message: string;
  badge: string;
  tone?: AuthEmailTone;
  rows: Array<[string, string]>;
  ctaHref: string;
  ctaLabel: string;
  footer: string;
}) {
  const color = toneColor(tone);

  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${escapeHtml(headline)}</title>
  </head>
  <body style="margin:0;background:#eef2f7;font-family:Inter,Segoe UI,Arial,sans-serif;color:#111827;">
    <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(preview)}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f7;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,.14);">
            <tr>
              <td style="padding:0;background:linear-gradient(135deg,#064e3b 0%,#0f766e 45%,#2563eb 100%);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:28px 32px 44px;">
                      <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#d1fae5;font-weight:800;">Unispace Account Security</div>
                      <h1 style="margin:18px 0 0;color:#ffffff;font-size:30px;line-height:1.18;font-weight:850;">${escapeHtml(headline)}</h1>
                      <p style="margin:14px 0 0;color:#dbeafe;font-size:15px;line-height:1.65;">${escapeHtml(message)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;">
                <div style="margin-top:14px;display:inline-block;background:${color};color:#ffffff;border-radius:999px;padding:10px 16px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;box-shadow:0 10px 24px rgba(15,23,42,.18);">${escapeHtml(badge)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 32px 8px;">
                <div style="font-size:12px;font-weight:850;letter-spacing:.16em;text-transform:uppercase;color:#64748b;">${escapeHtml(eyebrow)}</div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
                  ${rows
                    .map(
                      ([label, value]) => `
                  <tr>
                    <td style="width:34%;padding:15px 18px;background:#f8fafc;border-bottom:1px solid #e5e7eb;color:#64748b;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">${escapeHtml(label)}</td>
                    <td style="padding:15px 18px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;line-height:1.55;font-weight:650;">${value}</td>
                  </tr>`,
                    )
                    .join("")}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 34px;">
                <a href="${escapeHtml(ctaHref)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;border-radius:12px;padding:14px 20px;font-size:14px;font-weight:850;">${escapeHtml(ctaLabel)}</a>
                <p style="margin:18px 0 0;color:#64748b;font-size:12px;line-height:1.55;">${escapeHtml(footer)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
