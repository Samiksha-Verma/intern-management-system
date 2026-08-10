import nodemailer from "nodemailer";
import { env } from "../config/env";

const transporter = env.smtp.host
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    })
  : null;

interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export async function sendMail(
  to: string,
  subject: string,
  html: string,
  attachments?: MailAttachment[],
  suppress?: boolean
) {
  if (suppress) {
    console.log(
      `\n[mailer] Suppressed (demo account) — logging instead of sending.\nTo: ${to}\nSubject: ${subject}\n`
    );
    return;
  }
  if (!transporter) {
    console.log(
      `\n[mailer] SMTP not configured — logging email instead of sending.\nTo: ${to}\nSubject: ${subject}\n${html}` +
        (attachments?.length ? `\nAttachments: ${attachments.map((a) => a.filename).join(", ")}` : "") +
        "\n"
    );
    return;
  }
  return transporter.sendMail({ from: env.smtp.from, to, subject, html, attachments });
}

function setPasswordLinkEmail(opts: {
  heading: string;
  greeting: string;
  buttonLabel: string;
  token: string;
}) {
  const link = `${env.frontendUrl}/set-password?token=${opts.token}`;
  return `
    <div style="font-family: Arial, sans-serif; color: #111; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #FF6A33;">${opts.heading}</h2>
      <p>${opts.greeting}</p>
      <p>
        <a href="${link}" style="display:inline-block;background:#FF6A33;color:#000;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold;">
          ${opts.buttonLabel}
        </a>
      </p>
      <p style="color:#666;font-size:13px;">Or copy this link into your browser: ${link}</p>
      <p style="color:#666;font-size:13px;">This link expires in 7 days. If you didn't request this, you can ignore this email.</p>
    </div>
  `;
}

export async function sendInviteEmail(
  to: string,
  name: string,
  inviteToken: string,
  suppress?: boolean
) {
  const html = setPasswordLinkEmail({
    heading: "You've been invited",
    greeting: `Hi ${name}, you've been added to the Intern Management System. Click below to set your password and activate your account:`,
    buttonLabel: "Set your password",
    token: inviteToken,
  });
  return sendMail(to, "You're invited to the Intern Management System", html, undefined, suppress);
}

export async function sendDocumentEmail(
  to: string,
  internName: string,
  documentLabel: string,
  pdfBuffer: Buffer,
  pdfFilename: string,
  suppress?: boolean
) {
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #FF6A33;">${documentLabel}</h2>
      <p>Hi ${internName}, please find your ${documentLabel.toLowerCase()} attached to this email.</p>
    </div>
  `;
  return sendMail(
    to,
    documentLabel,
    html,
    [{ filename: pdfFilename, content: pdfBuffer, contentType: "application/pdf" }],
    suppress
  );
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetToken: string,
  suppress?: boolean
) {
  const html = setPasswordLinkEmail({
    heading: "Reset your password",
    greeting: `Hi ${name}, we received a request to reset your password. Click below to set a new one:`,
    buttonLabel: "Reset your password",
    token: resetToken,
  });
  return sendMail(to, "Reset your Intern Management System password", html, undefined, suppress);
}
