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

export async function sendIPChangeEmail(to: string, domain: string, oldIP: string, newIP: string) {
  const timestamp = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const fqdn = `${domain}.ddns.devops-monk.com`;
  await transporter.sendMail({
    from: config.SMTP_FROM,
    to,
    subject: `IP Changed — ${fqdn}`,
    text: `Your domain ${fqdn} IP has changed.\n\nOld IP: ${oldIP}\nNew IP: ${newIP}\nTime: ${timestamp}\n\nYou can manage notification settings in your dashboard.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
        <h2 style="color: #111827; margin-bottom: 0.5rem;">IP Address Changed</h2>
        <p style="color: #6b7280; line-height: 1.6; margin-bottom: 1rem;">
          Your domain <strong style="color: #111827;">${fqdn}</strong> has a new IP address.
        </p>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
            <tr>
              <td style="color: #6b7280; padding: 0.3rem 0;">Old IP</td>
              <td style="color: #111827; font-weight: 600; font-family: monospace; text-align: right;">${oldIP}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 0.3rem 0;">New IP</td>
              <td style="color: #059669; font-weight: 600; font-family: monospace; text-align: right;">${newIP}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 0.3rem 0;">Time</td>
              <td style="color: #111827; text-align: right;">${timestamp}</td>
            </tr>
          </table>
        </div>
        <p style="color: #9ca3af; font-size: 0.8rem; line-height: 1.6;">
          You're receiving this because email notifications are enabled for this domain. You can turn them off in your <a href="${config.APP_URL}/domain/${domain}" style="color: #4f46e5;">domain settings</a>.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0;" />
        <p style="color: #9ca3af; font-size: 0.75rem;">DDNS Service &mdash; devops-monk.com</p>
      </div>
    `,
  });
}

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
