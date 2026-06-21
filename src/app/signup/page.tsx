'use client';
import { useEffect, useState } from 'react';
import { Button, Card, Input, Label, Select } from '@/components/ui';
import { DatePicker } from '@/components/date-picker';
import { StationSelect } from '@/components/station-select';

// /signup — multi-step wizard. One thing at a time so mobile users aren't
// scrolling through a wall of inputs. Each step gates the next; Enter or
// "Continue" advances, "Back" rewinds. Final step posts to /api/me.

type Form = {
  name: string;
  dob: string;
  gender: 'female' | 'male' | 'other';
  phone: string;
  enrollment_no: string;
  home_station: string;
  address: string;
};

const TOTAL = 5;

export default function SignupPage() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [me, setMe] = useState<Form>({
    name: '', dob: '', gender: 'female',
    phone: '', enrollment_no: '', home_station: '', address: '',
  });

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then((p) => {
      if (p?.id) window.location.href = p.role === 'admin' ? '/admin' : '/me';
    });
  }, []);

  function next() {
    if (!canAdvance(step, me)) return;
    setErr(null);
    setDir(1);
    setStep(s => Math.min(TOTAL - 1, s + 1));
  }
  function back() {
    setErr(null);
    setDir(-1);
    setStep(s => Math.max(0, s - 1));
  }

  async function submit() {
    setBusy(true); setErr(null);
    const res = await fetch('/api/me', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(me),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? 'failed');
      return;
    }
    window.location.href = '/book';
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key === 'Enter' && step < TOTAL - 1) {
      e.preventDefault();
      next();
    }
  }

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: -0.3 }}>One last step</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--fg-muted)' }}>
            Details for your concession form.
          </p>
        </div>

        <Progress step={step} total={TOTAL} />

        <Card style={{ padding: 22, marginTop: 14, overflow: 'visible' }}>
          <form onSubmit={(e) => { e.preventDefault(); step === TOTAL - 1 ? submit() : next(); }} onKeyDown={onKeyDown}>
            <div className="wizard-stage" key={step} data-dir={dir}>
              {step === 0 && <StepName me={me} setMe={setMe} />}
              {step === 1 && <StepBasics me={me} setMe={setMe} />}
              {step === 2 && <StepStudent me={me} setMe={setMe} />}
              {step === 3 && <StepStation me={me} setMe={setMe} />}
              {step === 4 && <StepReview me={me} setMe={setMe} />}
            </div>

            {err && (
              <div style={{
                marginTop: 14,
                fontSize: 13, padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                background: 'color-mix(in oklab, var(--danger) 8%, transparent)',
                color: 'var(--danger)',
                border: '1px solid color-mix(in oklab, var(--danger) 25%, transparent)',
              }}>{err}</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 18 }}>
              <Button
                type="button"
                variant="ghost"
                onClick={back}
                style={{ visibility: step === 0 ? 'hidden' : 'visible' }}
              >
                ← Back
              </Button>
              <span style={{ fontSize: 12, color: 'var(--fg-faint)' }}>
                {step + 1} / {TOTAL}
              </span>
              <Button
                type="submit"
                variant="primary"
                disabled={busy || !canAdvance(step, me)}
              >
                {step === TOTAL - 1 ? (busy ? 'Saving…' : 'Finish') : 'Continue →'}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <style jsx>{`
        .wizard-stage {
          display: grid;
          gap: 12px;
          animation: slide 280ms var(--ease-out);
        }
        .wizard-stage[data-dir="-1"] { animation-name: slide-back; }
        @keyframes slide {
          from { opacity: 0; transform: translateX(14px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slide-back {
          from { opacity: 0; transform: translateX(-14px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .wizard-stage { animation-duration: 120ms; }
        }
      `}</style>
    </main>
  );
}

// Per-step validity — controls Continue/Finish enablement.
function canAdvance(step: number, me: Form): boolean {
  switch (step) {
    case 0: return me.name.trim().length > 1;
    case 1: return !!me.dob && !!me.gender;
    case 2: return me.enrollment_no.trim().length > 0;
    case 3: return me.home_station.trim().length > 0;
    case 4: return me.address.trim().length > 0;
    default: return false;
  }
}

// ── Steps ────────────────────────────────────────────────────────────────────

function StepHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.2px' }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 2 }}>{hint}</div>
    </div>
  );
}

function StepName({ me, setMe }: { me: Form; setMe: (f: (m: Form) => Form) => void }) {
  return (
    <>
      <StepHeader title="What's your full name?" hint="As it should appear on the concession form." />
      <div>
        <Label>Full name</Label>
        <Input
          required
          autoFocus
          value={me.name}
          onChange={(e) => setMe(m => ({ ...m, name: e.target.value }))}
          placeholder="Riya Sharma"
        />
      </div>
    </>
  );
}

function StepBasics({ me, setMe }: { me: Form; setMe: (f: (m: Form) => Form) => void }) {
  return (
    <>
      <StepHeader title="A couple of basics" hint="Required by railway authority for issuing a concession." />
      <div>
        <Label>Date of birth</Label>
        <DatePicker
          required
          value={me.dob}
          onChange={(v) => setMe(m => ({ ...m, dob: v }))}
          max={new Date().toISOString().slice(0,10)}
        />
      </div>
      <div>
        <Label>Gender</Label>
        <Select value={me.gender} onChange={(e) => setMe(m => ({ ...m, gender: e.target.value as Form['gender'] }))}>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
        </Select>
      </div>
    </>
  );
}

function StepStudent({ me, setMe }: { me: Form; setMe: (f: (m: Form) => Form) => void }) {
  return (
    <>
      <StepHeader title="Your student ID" hint="Enrollment number from your college ID card. Phone is optional." />
      <div>
        <Label>Enrollment number</Label>
        <Input
          required
          autoFocus
          value={me.enrollment_no}
          onChange={(e) => setMe(m => ({ ...m, enrollment_no: e.target.value }))}
          placeholder="e.g. 21102A0001"
        />
      </div>
      <div>
        <Label>Phone <span style={{ color: 'var(--fg-faint)' }}>(optional)</span></Label>
        <Input
          type="tel"
          inputMode="tel"
          value={me.phone}
          onChange={(e) => setMe(m => ({ ...m, phone: e.target.value }))}
          placeholder="10-digit mobile"
        />
      </div>
    </>
  );
}

function StepStation({ me, setMe }: { me: Form; setMe: (f: (m: Form) => Form) => void }) {
  return (
    <>
      <StepHeader title="Where do you board from?" hint="Your home railway station — this is the start of your concession route." />
      <div>
        <Label>Home station</Label>
        <StationSelect
          required
          autoFocus
          value={me.home_station}
          onChange={(v) => setMe(m => ({ ...m, home_station: v }))}
        />
      </div>
    </>
  );
}

function StepReview({ me, setMe }: { me: Form; setMe: (f: (m: Form) => Form) => void }) {
  return (
    <>
      <StepHeader title="Almost done" hint="Add your residential address — printed on the form. Review the rest below." />
      <div>
        <Label>Residential address</Label>
        <Input
          required
          autoFocus
          value={me.address}
          onChange={(e) => setMe(m => ({ ...m, address: e.target.value }))}
          placeholder="Street, area, PIN"
        />
      </div>

      <div style={{
        marginTop: 6,
        padding: 12,
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        display: 'grid',
        gap: 6,
      }}>
        <Row k="Name" v={me.name} />
        <Row k="DOB" v={me.dob} />
        <Row k="Gender" v={me.gender} />
        <Row k="Enrollment" v={me.enrollment_no} />
        {me.phone && <Row k="Phone" v={me.phone} />}
        <Row k="Home station" v={me.home_station} />
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
      <span style={{ color: 'var(--fg-faint)' }}>{k}</span>
      <span style={{ color: 'var(--fg)', fontWeight: 500, textAlign: 'right' }}>{v || '—'}</span>
    </div>
  );
}

// ── Progress bar ─────────────────────────────────────────────────────────────

function Progress({ step, total }: { step: number; total: number }) {
  const pct = ((step + 1) / total) * 100;
  return (
    <div style={{
      height: 4,
      background: 'var(--border)',
      borderRadius: 999,
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        background: 'var(--accent)',
        transition: 'width 280ms var(--ease-out)',
        borderRadius: 999,
      }} />
    </div>
  );
}
