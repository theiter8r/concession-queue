'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

// Themed date picker — matches MonthCalendar styling, replaces native
// <input type="date"> which renders with OS chrome that fights the dark theme.
// Value is the ISO yyyy-mm-dd string (same as native), so it's a drop-in swap.

type Props = {
  value: string;                       // yyyy-mm-dd
  onChange: (v: string) => void;
  min?: string;                        // yyyy-mm-dd
  max?: string;                        // yyyy-mm-dd
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

export function DatePicker({ value, onChange, min, max, disabled, placeholder = 'Select date' }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Esc
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const display = value ? formatDisplay(value) : '';
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const initial = value ? parseIso(value) : today;
  const [view, setView] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1));

  // When opened, sync view to the current value
  useEffect(() => {
    if (open) {
      const d = value ? parseIso(value) : today;
      setView(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [open, value, today]);

  const minDate = min ? parseIso(min) : null;
  const maxDate = max ? parseIso(max) : null;

  return (
    <div ref={rootRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="ui-btn"
        style={{
          width: '100%',
          height: 36,
          padding: '0 10px',
          borderRadius: 'var(--radius-sm)',
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: 'var(--border)',
          background: 'var(--bg-elevated)',
          color: display ? 'var(--fg)' : 'var(--fg-faint)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 400,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span>{display || placeholder}</span>
        <CalendarIcon />
      </button>

      {open && (
        <div
          className="dp-pop"
          style={{
            position: 'absolute',
            zIndex: 50,
            top: 'calc(100% + 6px)',
            left: 0,
            width: 300,
            maxWidth: 'calc(100vw - 32px)',
            padding: 12,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
            transformOrigin: 'top left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 10 }}>
            <button type="button" aria-label="Previous year" onClick={() => setView(v => new Date(v.getFullYear() - 1, v.getMonth(), 1))} className="ui-btn" style={navBtn}>«</button>
            <button type="button" aria-label="Previous month" onClick={() => setView(v => new Date(v.getFullYear(), v.getMonth() - 1, 1))} className="ui-btn" style={navBtn}>‹</button>
            <div style={{ flex: 1, textAlign: 'center', fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
              {view.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <button type="button" aria-label="Next month" onClick={() => setView(v => new Date(v.getFullYear(), v.getMonth() + 1, 1))} className="ui-btn" style={navBtn}>›</button>
            <button type="button" aria-label="Next year" onClick={() => setView(v => new Date(v.getFullYear() + 1, v.getMonth(), 1))} className="ui-btn" style={navBtn}>»</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 10, color: 'var(--fg-faint)', fontWeight: 500, padding: '2px 0' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {buildMonthGrid(view).map(({ date, inMonth }, idx) => {
              const iso = toIso(date);
              const isSelected = value === iso;
              const isToday = sameDay(date, today);
              const tooEarly = !!minDate && date < minDate;
              const tooLate = !!maxDate && date > maxDate;
              const dis = !inMonth || tooEarly || tooLate;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={dis}
                  onClick={() => { onChange(iso); setOpen(false); }}
                  className="ui-btn"
                  style={{
                    height: 32,
                    padding: 0,
                    border: '1px solid transparent',
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'var(--accent)' : 'transparent',
                    color: isSelected ? 'var(--accent-fg)' : dis ? 'var(--fg-faint)' : 'var(--fg)',
                    fontWeight: isToday ? 600 : 400,
                    fontSize: 13,
                    fontVariantNumeric: 'tabular-nums',
                    opacity: !inMonth ? 0 : 1,
                    cursor: dis ? 'not-allowed' : 'pointer',
                    transition: 'background-color 160ms var(--ease-out), color 160ms var(--ease-out)',
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <button type="button" className="ui-btn" style={smallBtn} onClick={() => { onChange(''); setOpen(false); }}>Clear</button>
            <button type="button" className="ui-btn" style={smallBtn} onClick={() => { onChange(toIso(today)); setOpen(false); }}>Today</button>
          </div>

          <style jsx>{`
            .dp-pop {
              opacity: 1;
              transform: translateY(0) scale(1);
              transition: opacity 160ms var(--ease-out), transform 160ms var(--ease-out);
            }
            @starting-style {
              .dp-pop {
                opacity: 0;
                transform: translateY(-4px) scale(0.98);
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

const navBtn: React.CSSProperties = {
  width: 28, height: 28, padding: 0,
  borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border)',
  background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
  fontSize: 13, lineHeight: 1, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};

const smallBtn: React.CSSProperties = {
  height: 28, padding: '0 10px', fontSize: 12,
  borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border)',
  background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
};

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M3 10h18M8 2v4M16 2v4"/>
    </svg>
  );
}

function buildMonthGrid(monthStart: Date) {
  const first = new Date(monthStart);
  const start = new Date(first);
  start.setDate(start.getDate() - start.getDay());
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ date: d, inMonth: d.getMonth() === first.getMonth() });
  }
  return cells;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDisplay(iso: string): string {
  const d = parseIso(iso);
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}
