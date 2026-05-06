import { getEmailSettings } from "@/app/components/pages/Settings/SystemSettingsActions";
import nodemailer from "nodemailer";

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  options?: { html?: string },
) {
  const settings = await getEmailSettings();
  const host = settings.smtpHost || process.env.SMTP_HOST;
  const port = settings.smtpPort ?? Number(process.env.SMTP_PORT || 465);
  const user =
    settings.smtpUser ||
    process.env.SMTP_USER ||
    settings.senderEmail ||
    process.env.SENDER_EMAIL;
  const pass =
    settings.smtpPass ||
    process.env.SMTP_PASSWORD ||
    process.env.SENDER_PASSWORD;
  const senderEmail = settings.senderEmail || process.env.SENDER_EMAIL || user;
  const senderName =
    settings.senderName || process.env.SENDER_NAME || "Zerve";

  if (!host || !port || !user || !pass || !senderEmail) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[dev email fallback]", {
        to,
        subject,
        text,
        html: options?.html,
      });
      return true;
    }

    console.error("Incomplete SMTP settings.");
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE
        ? process.env.SMTP_SECURE === "true"
        : port === 465,
      auth: {
        user,
        pass,
      },
    });

    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject,
      text,
      html: options?.html || `<p>${escapeHtml(text).replace(/\n/g, "<br />")}</p>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}
