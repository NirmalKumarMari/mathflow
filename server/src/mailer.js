import nodemailer from 'nodemailer';

const hasSmtpConfig = !!process.env.SMTP_HOST;

const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    })
  : null;

// Falls back to logging the email when SMTP isn't configured, so local dev
// and first deploys work before an SMTP relay (e.g. SendGrid) is wired up.
export async function sendMail({ to, subject, html, text }) {
  if (!transporter) {
    console.log(`[mailer] SMTP not configured — would send to ${to}: ${subject}\n${text || html}`);
    return;
  }
  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'no-reply@mathflow.app',
    to,
    subject,
    html,
    text,
  });
}
