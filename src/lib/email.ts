import { Resend } from 'resend';
import { sendViaGmailPool } from './gmail-pool';

// Emails — SPEC §9.
// Primary: Resend (free tier 100/day, 3000/mo).
// Fallback: Gmail SMTP pool — rotates through accounts, skipping any one that
// hit its daily quota until next UTC midnight.
// Nothing thrown out of this module — bookings stay successful even if every
// provider is down. Failures are logged.

const APP_URL = process.env.APP_URL ?? '';
const RESEND_FROM = process.env.RESEND_FROM_EMAIL;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

type Mail = { to: string; subject: string; html: string };

async function deliver(mail: Mail): Promise<{ ok: true; via: string } | { ok: false }> {
  if (resend && RESEND_FROM) {
    try {
      const r = await resend.emails.send({ from: RESEND_FROM, ...mail });
      if (!r.error) return { ok: true, via: 'resend' };
      console.warn('[email] resend rejected, falling back to gmail pool:', r.error);
    } catch (e) {
      console.warn('[email] resend threw, falling back to gmail pool:', e);
    }
  }

  const pool = await sendViaGmailPool(mail);
  if (pool.ok) return pool;

  console.error('[email] all providers failed for', mail.to, mail.subject);
  return { ok: false };
}

export async function sendBookingEmail(args: {
  to: string;
  name: string;
  slotStart: string;
  otp: string;
  appointmentId: string;
}) {
  const cancel = `${APP_URL}/me?cancel=${args.appointmentId}`;
  return deliver({
    to: args.to,
    subject: 'Your concession-form appointment is booked',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Appointment</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        
        <!-- Main Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
          
          <!-- Top Badge -->
          <tr>
            <td style="padding: 32px 32px 0 32px;">
              <div style="display: inline-block; background-color: #111827; color: #ffffff; font-size: 11px; font-weight: 600; letter-spacing: 1px; padding: 4px 10px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;">
                APPOINTMENT CONFIRMED
              </div>
            </td>
          </tr>

          <!-- Header & Copy -->
          <tr>
            <td style="padding: 24px 32px 8px 32px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #111827; letter-spacing: -0.02em;">
                Hi ${args.name},
              </h1>
              <p style="margin: 12px 0 0 0; font-size: 15px; line-height: 1.5; color: #4b5563;">
                Your appointment is scheduled for <span style="font-weight: 600; color: #111827;">${args.slotStart}</span>. Please keep your check-in OTP handy.
              </p>
            </td>
          </tr>

          <!-- OTP Code Box -->
          <tr>
            <td style="padding: 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
                <tr>
                  <td align="center" style="padding: 20px;">
                    <div style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                      Check-in OTP
                    </div>
                    <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111827;">
                      ${args.otp}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer / Action -->
          <tr>
            <td style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 32px;" align="center">
              <p style="margin: 0; font-size: 13px; color: #6b7280;">
                Need to make a change? 
                <a href="${cancel}" style="color: #4b5563; text-decoration: underline; font-weight: 500;">Cancel this appointment</a>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
  
</body>
</html>`,
  });
}

export async function sendAdminCancelEmail(args: {
  to: string;
  name: string;
  slotStart: string;
}) {
  return deliver({
    to: args.to,
    subject: 'Your concession-form appointment was cancelled',
    html: `<p>Hi ${args.name},</p>
<p>Your ${args.slotStart} appointment was cancelled by the admin office.</p>
<p><a href="${APP_URL}/slots">Pick a new slot</a></p>`,
  });
}

export async function sendStudentCancelEmail(args: {
  to: string;
  name: string;
  slotStart: string;
}) {
  return deliver({
    to: args.to,
    subject: 'Appointment cancelled',
    html: `<p>Hi ${args.name},</p>
<p>Your ${args.slotStart} appointment has been cancelled. The slot is now open again.</p>`,
  });
}
