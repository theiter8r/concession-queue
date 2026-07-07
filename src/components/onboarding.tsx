'use client';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui';

const LS_KEY = 'con_onboarding_done';

const STEPS = [
  {
    icon: '✦',
    title: 'Welcome to Railway Concession',
    body: 'Your one-stop platform for booking railway concession forms. No more standing in line outside the office — pick a slot, walk in, and walk out with a signed form.',
  },
  {
    icon: '⊙',
    title: 'Your Profile',
    body: 'All your details in one place — name, enrollment number, department, and concession route. Update anything that changes.',
  },
  {
    icon: '◈',
    title: 'Active Season Ticket',
    body: 'Once your form is issued, your active pass appears here with the route, class, and expiry date. Add the season ticket number and renew with one click.',
  },
  {
    icon: '▤',
    title: 'Navigate with Ease',
    body: 'Use the tabs to book new slots, check live availability, or browse your request history. Everything is a tap away.',
  },
  {
    icon: '→',
    title: "You're all set!",
    body: 'Book your first slot and show up at the office. Your concession form will be ready, signed, and waiting.',
  },
];

export function Onboarding({ onDone }: { onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(LS_KEY);
    if (!done) {
      setOpen(true);
      requestAnimationFrame(() => setEntering(true));
    }
  }, []);

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => {
      localStorage.setItem(LS_KEY, '1');
      setOpen(false);
      onDone?.();
    }, 260);
  }, [onDone]);

  if (!open) return null;

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function next() {
    if (isLast) { dismiss(); return; }
    setEntering(false);
    setTimeout(() => {
      setStep(s => s + 1);
      requestAnimationFrame(() => setEntering(true));
    }, 200);
  }

  function skip() { dismiss(); }

  return (
    <div className={`onboarding-overlay${leaving ? ' leaving' : ''}`} style={{
      position: 'fixed',
      inset: 0,
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      {/* Backdrop */}
      <div
        onClick={skip}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(12, 10, 9, 0.48)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Card */}
      <div className={`onboarding-card${entering ? ' enter' : ''}`} style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: 400,
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 24px 64px -12px rgba(0,0,0,0.32), 0 4px 16px rgba(0,0,0,0.08)',
        padding: '32px 28px 24px',
      }}>
        {/* Skip */}
        <button
          onClick={skip}
          style={{
            position: 'absolute',
            top: 12, right: 14,
            background: 'none',
            border: 'none',
            padding: '6px 10px',
            fontSize: 12,
            color: 'var(--fg-faint)',
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm)',
            transition: 'color 160ms var(--ease-out)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--fg-muted)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--fg-faint)'}
        >
          Skip
        </button>

        {/* Icon */}
        <div style={{
          width: 48, height: 48,
          borderRadius: 999,
          background: 'var(--accent)',
          color: 'var(--accent-fg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          marginBottom: 18,
          transition: 'transform 300ms var(--ease-out)',
        }}>
          {s.icon}
        </div>

        {/* Title */}
        <h2 style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: '-0.3px',
          lineHeight: 1.3,
        }}>
          {s.title}
        </h2>

        {/* Body */}
        <p style={{
          margin: '10px 0 0',
          fontSize: 14,
          color: 'var(--fg-muted)',
          lineHeight: 1.6,
        }}>
          {s.body}
        </p>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 28,
          paddingTop: 18,
          borderTop: '1px solid var(--border)',
        }}>
          {/* Dots */}
          <div style={{ display: 'flex', gap: 6 }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === step ? 20 : 6,
                  height: 6,
                  borderRadius: 999,
                  background: i === step ? 'var(--accent)' : 'var(--border)',
                  transition: 'width 280ms var(--ease-out), background 280ms var(--ease-out)',
                }}
              />
            ))}
          </div>

          {/* Next / Done */}
          <Button variant="primary" onClick={next}>
            {isLast ? 'Get started' : 'Next'}
          </Button>
        </div>
      </div>

      <style jsx>{`
        .onboarding-overlay {
          opacity: 0;
          transition: opacity 260ms var(--ease-out);
        }
        .onboarding-overlay.leaving {
          opacity: 0;
        }
        .onboarding-overlay:not(.leaving) {
          opacity: 1;
        }
        .onboarding-card {
          transform: translateY(12px) scale(0.97);
          opacity: 0;
          transition: transform 300ms var(--ease-out), opacity 300ms var(--ease-out);
        }
        .onboarding-card.enter {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
        @media (prefers-reduced-motion: reduce) {
          .onboarding-card, .onboarding-overlay {
            transition-duration: 80ms;
          }
        }
      `}</style>
    </div>
  );
}
