'use client';
import { useEffect, useRef, useState } from 'react';
import { Button, Card } from '@/components/ui';

// Landing page — mobile-first, cal.com-style: clean type, a faint dotted grid
// behind the hero, scroll-driven parallax on accent blobs, and a step-by-step
// process card. CTA is gated behind a data-collection T&C checkbox; we also
// nudge users to follow @theiter8r on GitHub.

export default function Landing() {
  const [agreed, setAgreed] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    function onScroll() {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        rafRef.current = null;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function getStarted() {
    if (!agreed) return;
    window.location.href = '/login';
  }

  return (
    <main className="landing">
      {/* Parallax background layers — translateY based on scroll. Pointer-events
          off so they never block taps. */}
      <div className="bg-grid" aria-hidden />
      <div
        className="blob blob-a"
        aria-hidden
        style={{ transform: `translate3d(0, ${scrollY * -0.18}px, 0)` }}
      />
      <div
        className="blob blob-b"
        aria-hidden
        style={{ transform: `translate3d(0, ${scrollY * -0.32}px, 0)` }}
      />
      <div
        className="blob blob-c"
        aria-hidden
        style={{ transform: `translate3d(0, ${scrollY * -0.08}px, 0)` }}
      />

      {/* Nav */}
      <nav className="nav">
        <div className="nav-brand">
          <span className="nav-dot" />
          <span>concession</span>
        </div>
        <div className="nav-right">
          <a
            href="https://github.com/theiter8r"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
          >
            <GhIcon /> Follow @theiter8r
          </a>
          <a href="/login"><Button size="sm" variant="ghost">Sign in</Button></a>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div
          className="hero-inner"
          style={{ transform: `translate3d(0, ${scrollY * 0.12}px, 0)`, opacity: Math.max(0, 1 - scrollY / 600) }}
        >
          <span className="pill">For KCCEMSR students</span>
          <h1 className="h1">
            Your railway concession,<br/>
            <span className="accent">booked in 60 seconds.</span>
          </h1>
          <p className="lede">
            Pick a slot. Walk in. Walk out with a signed form.
            No more standing in line outside the office.
          </p>

          <div className="cta-row">
            <Button variant="primary" onClick={getStarted} disabled={!agreed}>
              Get started →
            </Button>
            <a
              href="https://github.com/theiter8r"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary"><GhIcon /> Star on GitHub</Button>
            </a>
          </div>

          <label className="tc">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>
              I agree to the{' '}
              <a href="#privacy">terms &amp; data collection</a> —
              the app stores my name, DOB, enrollment number, home station,
              and address only to print on the concession form.
            </span>
          </label>
        </div>

        {/* Floating preview card — slight rotate-as-you-scroll parallax */}
        <div
          className="preview"
          style={{
            transform: `perspective(1200px) rotateX(${10 - Math.min(scrollY, 200) * 0.05}deg) translate3d(0, ${scrollY * -0.06}px, 0)`,
          }}
          aria-hidden
        >
          <PreviewCard />
        </div>
      </section>

      {/* Process steps */}
      <section className="section" id="how">
        <div className="section-head">
          <span className="eyebrow">How it works</span>
          <h2 className="h2">Three steps. That&apos;s it.</h2>
        </div>

        <div className="steps">
          {STEPS.map((s, i) => (
            <Step key={s.title} index={i} scrollY={scrollY} {...s} />
          ))}
        </div>
      </section>

      {/* GitHub follow */}
      <section className="section follow">
        <Card style={{ padding: 28, textAlign: 'center' }}>
          <div className="gh-row">
            <GhIcon size={28} />
            <h3 className="h3" style={{ margin: 0 }}>Built by Raaj Patkar</h3>
          </div>
          <p style={{ color: 'var(--fg-muted)', maxWidth: 460, margin: '10px auto 18px' }}>
            If this saved you a trip to the railway office, the nicest thing you
            can do is follow along on GitHub. New small projects every month.
          </p>
          <a
            href="https://github.com/theiter8r"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="primary"><GhIcon /> Follow @theiter8r on GitHub</Button>
          </a>
        </Card>
      </section>

      {/* Privacy / T&C */}
      <section className="section" id="privacy">
        <div className="section-head">
          <span className="eyebrow">Privacy</span>
          <h2 className="h2">What we collect, and why.</h2>
        </div>
        <Card style={{ padding: 22 }}>
          <ul className="privacy-list">
            <li><b>Name, DOB, gender, enrollment no.</b> — printed on the concession form. Required by railway authority.</li>
            <li><b>Home station &amp; address</b> — printed on the form; used to determine the concession route.</li>
            <li><b>College email</b> — to verify you&apos;re a KCCEMSR student. We send a 6-digit code, nothing else.</li>
            <li><b>Slot booking</b> — when you walked in, who signed. Used to avoid double-booking and to audit.</li>
            <li><b>No tracking, no ads, no third-party analytics.</b> Data stays on the college&apos;s Supabase project.</li>
          </ul>
        </Card>
      </section>

      <style jsx>{`
        .landing {
          position: relative;
          min-height: 100dvh;
          overflow-x: hidden;
          padding: 0 16px 0;
        }
        .bg-grid {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-image:
            radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--fg) 8%, transparent) 1px, transparent 0);
          background-size: 22px 22px;
          mask-image: radial-gradient(ellipse at 50% 0%, #000 30%, transparent 75%);
          -webkit-mask-image: radial-gradient(ellipse at 50% 0%, #000 30%, transparent 75%);
        }
        .blob {
          position: fixed;
          z-index: 0;
          pointer-events: none;
          filter: blur(60px);
          will-change: transform;
          border-radius: 999px;
        }
        .blob-a {
          top: -160px; right: -120px;
          width: 360px; height: 360px;
          background: color-mix(in oklab, var(--accent) 18%, transparent);
        }
        .blob-b {
          top: 30vh; left: -120px;
          width: 320px; height: 320px;
          background: color-mix(in oklab, #6366f1 22%, transparent);
        }
        .blob-c {
          top: 90vh; right: -80px;
          width: 280px; height: 280px;
          background: color-mix(in oklab, #14b8a6 16%, transparent);
        }

        .nav {
          position: relative; z-index: 2;
          max-width: 1100px; margin: 0 auto;
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 4px;
        }
        .nav-brand { display: flex; align-items: center; gap: 8px; font-weight: 600; letter-spacing: -0.2px; }
        .nav-dot {
          width: 9px; height: 9px; border-radius: 999px; background: var(--accent);
          box-shadow: 0 0 0 4px color-mix(in oklab, var(--accent) 18%, transparent);
        }
        .nav-right { display: flex; align-items: center; gap: 10px; }
        .nav-link {
          display: none; align-items: center; gap: 6px;
          font-size: 13px; color: var(--fg-muted);
          padding: 6px 10px; border-radius: var(--radius-sm);
          transition: color 160ms var(--ease-out), background 160ms var(--ease-out);
        }
        .nav-link:hover { color: var(--fg); background: color-mix(in oklab, var(--accent) 6%, transparent); }
        @media (min-width: 640px) { .nav-link { display: inline-flex; } }

        .hero {
          position: relative; z-index: 1;
          max-width: 1100px; margin: 0 auto;
          padding: 40px 0 60px;
          display: grid; gap: 36px;
        }
        @media (min-width: 880px) {
          .hero { grid-template-columns: 1.05fr 0.95fr; align-items: center; padding: 72px 0 96px; gap: 48px; }
        }
        .hero-inner { will-change: transform, opacity; }
        .pill {
          display: inline-flex; align-items: center;
          padding: 5px 10px; border-radius: 999px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          color: var(--fg-muted);
          font-size: 12px; font-weight: 500;
          margin-bottom: 18px;
        }
        .h1 {
          margin: 0; font-weight: 600;
          font-size: clamp(34px, 7vw, 60px);
          line-height: 1.04; letter-spacing: -1.2px;
        }
        .accent {
          background: linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent) 60%, #6366f1));
          -webkit-background-clip: text; background-clip: text;
          color: transparent;
        }
        .lede {
          margin: 18px 0 24px;
          color: var(--fg-muted);
          font-size: clamp(15px, 2.2vw, 17px);
          max-width: 480px;
        }
        .cta-row {
          display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
        }
        .tc {
          display: flex; gap: 10px; align-items: flex-start;
          margin-top: 18px;
          font-size: 13px; color: var(--fg-muted);
          max-width: 480px;
        }
        .tc input {
          margin-top: 3px;
          accent-color: var(--accent);
          width: 16px; height: 16px;
          flex-shrink: 0;
        }
        .tc a { text-decoration: underline; color: var(--fg); }

        .preview {
          will-change: transform;
          transform-style: preserve-3d;
          display: flex; justify-content: center;
        }

        .section {
          position: relative; z-index: 1;
          max-width: 1100px; margin: 0 auto;
          padding: 48px 0;
        }
        .section-head { margin-bottom: 24px; }
        .eyebrow {
          font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
          color: color-mix(in oklab, var(--accent) 70%, var(--fg-muted));
        }
        .h2 {
          margin: 6px 0 0;
          font-size: clamp(26px, 4vw, 36px);
          font-weight: 600; letter-spacing: -0.6px;
        }
        .h3 { font-size: 20px; font-weight: 600; letter-spacing: -0.3px; }

        .steps { display: grid; gap: 14px; }
        @media (min-width: 760px) {
          .steps { grid-template-columns: 1fr 1fr 1fr; gap: 18px; }
        }

        .follow { padding: 24px 0 48px; }
        .gh-row { display: inline-flex; align-items: center; gap: 10px; }

        .privacy-list {
          margin: 0; padding: 0; list-style: none; display: grid; gap: 10px;
          color: var(--fg-muted); font-size: 14px;
        }
        .privacy-list li b { color: var(--fg); font-weight: 600; }

        .footer {
          position: relative; z-index: 1;
          max-width: 1100px; margin: 0 auto;
          padding: 28px 4px 40px;
          display: flex; gap: 10px; align-items: center;
          color: var(--fg-faint); font-size: 13px;
        }
        .footer a { color: var(--fg-muted); text-decoration: underline; }
        .dot { color: var(--fg-faint); }

        @media (prefers-reduced-motion: reduce) {
          .blob, .hero-inner, .preview { transform: none !important; }
        }
      `}</style>
    </main>
  );
}

const STEPS = [
  {
    title: 'Sign in with college email',
    body: 'Verify your @kccemsr.edu.in address with a 6-digit code. No passwords to remember.',
    n: '01',
  },
  {
    title: 'Pick an open slot',
    body: 'Live calendar shows every free slot at the office. Book in two taps.',
    n: '02',
  },
  {
    title: 'Walk in, walk out',
    body: 'Show up at your slot. Form is pre-filled — just sign and go.',
    n: '03',
  },
];

function Step({ title, body, n, index, scrollY }: { title: string; body: string; n: string; index: number; scrollY: number }) {
  // Tiny per-card parallax — each card lifts slightly faster than the next so
  // they don't all move as a flat block.
  const offset = Math.max(-30, -scrollY * (0.02 + index * 0.01));
  return (
    <Card style={{
      padding: 22,
      transform: `translate3d(0, ${offset}px, 0)`,
      transition: 'transform 80ms linear',
      willChange: 'transform',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
          color: 'var(--fg-faint)',
          fontVariantNumeric: 'tabular-nums',
        }}>{n}</span>
        <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: '-0.2px' }}>{title}</h3>
      <p style={{ margin: '8px 0 0', color: 'var(--fg-muted)', fontSize: 14 }}>{body}</p>
    </Card>
  );
}

function PreviewCard() {
  return (
    <div style={{
      width: '100%', maxWidth: 380,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: '0 24px 60px -28px rgba(0,0,0,0.25), 0 4px 12px -6px rgba(0,0,0,0.08)',
      padding: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Tue, 23 Jun</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <Dot /><Dot /><Dot active />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {['09:00', '09:15', '09:30', '09:45', '10:00', '10:15'].map((t, i) => (
          <div key={t} style={{
            padding: '10px 0',
            textAlign: 'center',
            borderRadius: 'var(--radius-sm)',
            background: i === 2 ? 'var(--accent)' : 'transparent',
            color: i === 2 ? 'var(--accent-fg)' : 'var(--fg)',
            border: '1px solid',
            borderColor: i === 2 ? 'var(--accent)' : 'var(--border)',
            fontSize: 13, fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
          }}>{t}</div>
        ))}
      </div>
      <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, color: 'var(--fg-faint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Selected</div>
        <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>Dadar → Thane · 09:30</div>
      </div>
    </div>
  );
}

function Dot({ active }: { active?: boolean }) {
  return <span style={{
    width: 5, height: 5, borderRadius: 999,
    background: active ? 'var(--accent)' : 'var(--border-strong)',
  }} />;
}

function GhIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.18-.02-2.13-3.2.69-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.7-1.28-1.7-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.73.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"/>
    </svg>
  );
}
