'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Button, Card, Input, Label } from '@/components/ui';
import { COLLEGE_EMAIL_DOMAIN, isCollegeEmail } from '@/lib/email-domain';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState<'email' | 'otp' | 'done'>('email');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!isCollegeEmail(email)) {
      setErr(`Use your @${COLLEGE_EMAIL_DOMAIN} address.`);
      return;
    }
    setBusy(true); setErr(null);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setStage('otp');
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.verifyOtp({ email, token: otp, type: 'email' });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setStage('done');
    window.location.href = '/';
  }

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: -0.4 }}>Sign in</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--fg-muted)' }}>
            Use your college email to continue.
          </p>
        </div>

        <Card style={{ padding: 22 }}>
          {stage === 'email' && (
            <form onSubmit={sendOtp} style={{ display: 'grid', gap: 14 }}>
              <div>
                <Label>College email</Label>
                <Input
                  type="email"
                  required
                  autoFocus
                  placeholder={`you@${COLLEGE_EMAIL_DOMAIN}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {err && <Note tone="danger">{err}</Note>}
              <Button variant="primary" disabled={busy} type="submit">
                {busy ? 'Sending…' : 'Send code'}
              </Button>
            </form>
          )}

          {stage === 'otp' && (
            <form onSubmit={verifyOtp} style={{ display: 'grid', gap: 14 }}>
              <div>
                <Label>Code sent to {email}</Label>
                <Input
                  inputMode="numeric"
                  pattern="\d*"
                  autoFocus
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  style={{ letterSpacing: 4, fontVariantNumeric: 'tabular-nums' }}
                />
              </div>
              {err && <Note tone="danger">{err}</Note>}
              <Button variant="primary" disabled={busy || otp.length < 6} type="submit">
                {busy ? 'Verifying…' : 'Verify and continue'}
              </Button>
              <button
                type="button"
                onClick={() => { setStage('email'); setOtp(''); setErr(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', fontSize: 13, cursor: 'pointer' }}
              >
                Use a different email
              </button>
            </form>
          )}
        </Card>

        <p style={{ marginTop: 18, textAlign: 'center', color: 'var(--fg-faint)', fontSize: 12 }}>
          Your home → Thane railway concession form, signed and ready in one visit.
        </p>
      </div>
    </main>
  );
}

function Note({ children, tone }: { children: React.ReactNode; tone: 'danger' | 'ok' }) {
  return (
    <div
      style={{
        fontSize: 13,
        padding: '8px 10px',
        borderRadius: 'var(--radius-sm)',
        background: tone === 'danger'
          ? 'color-mix(in oklab, var(--danger) 8%, transparent)'
          : 'color-mix(in oklab, var(--ok) 8%, transparent)',
        color: tone === 'danger' ? 'var(--danger)' : 'var(--ok)',
        border: `1px solid color-mix(in oklab, var(--${tone === 'danger' ? 'danger' : 'ok'}) 25%, transparent)`,
      }}
    >
      {children}
    </div>
  );
}
