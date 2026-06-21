import nodemailer, { Transporter } from 'nodemailer';

// Round-robin pool of Gmail SMTP accounts. Each free Gmail account caps at
// ~500 sends/day; Workspace ~2000. If account #1 hits its quota, we skip it
// until next UTC midnight and try #2, then #3.

type Account = { user: string; pass: string; transporter: Transporter };

let accounts: Account[] | null = null;

// In-memory skip-until map. On a serverless cold start this resets, which is
// fine — the worst case is one extra failing send per cold instance before
// the skip re-engages.
const skipUntil = new Map<string /* email */, number /* epoch ms */>();

function parseAccounts(): Account[] {
  if (accounts) return accounts;

  // Primary source: GMAIL_ACCOUNTS=email:pass,email:pass
  const raw = process.env.GMAIL_ACCOUNTS ?? '';
  const pairs = raw.split(',').map(s => s.trim()).filter(Boolean);

  accounts = pairs
    .map((p) => {
      const idx = p.indexOf(':');
      if (idx < 0) return null;
      const user = p.slice(0, idx).trim();
      const pass = p.slice(idx + 1).trim().replace(/\s+/g, ''); // app passwords often shown with spaces
      if (!user || !pass) return null;
      return {
        user,
        pass,
        transporter: nodemailer.createTransport({
          service: 'gmail',
          auth: { user, pass },
        }),
      };
    })
    .filter((a): a is Account => a !== null);

  return accounts;
}

// Detect Gmail quota-style errors so we can take that account out of rotation.
// Gmail responses include things like "Daily user sending quota exceeded",
// "Message rate exceeded", "421 4.7.0 Try again later", or nodemailer's own
// rate-limit codes.
function looksLikeQuota(err: any): boolean {
  const code = String(err?.code ?? '').toUpperCase();
  if (code === 'EENVELOPE' || code === 'EMESSAGE') return false; // bad recipient — not quota
  const msg = String(err?.response ?? err?.message ?? '').toLowerCase();
  return (
    msg.includes('quota') ||
    msg.includes('rate exceeded') ||
    msg.includes('try again later') ||
    msg.includes('throttle') ||
    msg.includes('4.7.0') ||  // Gmail's "temporary failure / over quota"
    msg.includes('5.4.5') ||  // hard daily quota
    (code !== 'EAUTH' && msg.includes('limit'))
  );
}

function nextUtcMidnight(): number {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

export async function sendViaGmailPool(mail: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: true; via: string } | { ok: false }> {
  const pool = parseAccounts();
  if (pool.length === 0) return { ok: false };

  const fromName = process.env.GMAIL_FROM_NAME ?? 'Concession Office';
  const now = Date.now();

  for (const acct of pool) {
    const skipTs = skipUntil.get(acct.user);
    if (skipTs && skipTs > now) continue;

    try {
      await acct.transporter.sendMail({
        from: `"${fromName}" <${acct.user}>`,
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
      });
      return { ok: true, via: `gmail:${acct.user}` };
    } catch (e: any) {
      if (looksLikeQuota(e)) {
        skipUntil.set(acct.user, nextUtcMidnight());
        console.warn(`[email] gmail account ${acct.user} hit quota, skipping until UTC midnight`);
      } else {
        console.warn(`[email] gmail account ${acct.user} failed:`, e?.message ?? e);
      }
      // Fall through to next account.
    }
  }

  return { ok: false };
}

// For tests / health endpoint.
export function poolStatus() {
  const now = Date.now();
  return parseAccounts().map((a) => ({
    user: a.user,
    skipped: (skipUntil.get(a.user) ?? 0) > now,
    skipUntil: skipUntil.get(a.user) ?? null,
  }));
}
