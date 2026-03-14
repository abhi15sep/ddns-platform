import nodemailer from 'nodemailer';
import { config } from './config.js';

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: Number(config.SMTP_PORT),
  secure: Number(config.SMTP_PORT) === 465,
  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await transporter.sendMail({
    from: config.SMTP_FROM,
    to,
    subject: 'Reset your DDNS password',
    text: `You requested a password reset for your DDNS account.\n\nClick this link to reset your password (valid for 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
        <h2 style="color: #111827; margin-bottom: 0.5rem;">Reset your password</h2>
        <p style="color: #6b7280; line-height: 1.6;">
          You requested a password reset for your DDNS account. Click the button below to choose a new password.
        </p>
        <a href="${resetUrl}" style="display: inline-block; padding: 0.75rem 1.5rem; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 1rem 0;">
          Reset Password
        </a>
        <p style="color: #9ca3af; font-size: 0.85rem; line-height: 1.6;">
          This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0;" />
        <p style="color: #9ca3af; font-size: 0.75rem;">DDNS Service &mdash; devops-monk.com</p>
      </div>
    `,
  });
}
