import nodemailer from "nodemailer";

const SMTP_EMAIL = process.env.SMTP_EMAIL;
const SMTP_APP_PASSWORD = process.env.SMTP_APP_PASSWORD;

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!SMTP_EMAIL || !SMTP_APP_PASSWORD) {
    throw new Error(
      "SMTP_EMAIL and SMTP_APP_PASSWORD must be set to send emails (see backend/.env.example).",
    );
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: SMTP_EMAIL, pass: SMTP_APP_PASSWORD },
    });
  }
  return transporter;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await getTransporter().sendMail({
    from: `"AI Karobar" <${SMTP_EMAIL}>`,
    to,
    subject: "Reset your AI Karobar password",
    text:
      "We received a request to reset your password. Open the link below to choose a new one:\n\n" +
      `${resetUrl}\n\n` +
      "This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.",
    html:
      "<p>We received a request to reset your password. Click the link below to choose a new one:</p>" +
      `<p><a href="${resetUrl}">${resetUrl}</a></p>` +
      "<p>This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.</p>",
  });
}
