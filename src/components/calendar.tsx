'use client';
import { useMemo, useState } from 'react';

type Props = {
  selected: Date | null;
  onSelect: (d: Date) => void;
  isDateAvailable: (d: Date) => boolean;
};

export function MonthCalendar({ selected, onSelect, isDateAvailable }: Props) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const grid = useMemo(() => buildMonthGrid(view), [view]);
  const monthLabel = view.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button
          aria-label="Previous month"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
          className="ui-btn"
          style={navBtn}
        >‹</button>
        <div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{monthLabel}</div>
        <button
          aria-label="Next month"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
          className="ui-btn"
          style={navBtn}
        >›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 11, color: 'var(--fg-faint)', fontWeight: 500 }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {grid.map(({ date, inMonth }, idx) => {
          const isToday = sameDay(date, today);
          const isSelected = selected && sameDay(date, selected);
          const past = date < today;
          const avail = !past && inMonth && isDateAvailable(date);
          const disabled = past || !inMonth || !avail;
          return (
            <button
              key={idx}
              onClick={() => !disabled && onSelect(date)}
              disabled={disabled}
              className="ui-btn"
              style={{
                height: 38,
                padding: 0,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid transparent',
                background: isSelected ? 'var(--accent)' : 'transparent',
                color: isSelected
                  ? 'var(--accent-fg)'
                  : disabled
                    ? 'var(--fg-faint)'
                    : 'var(--fg)',
                fontWeight: isToday ? 600 : 400,
                fontVariantNumeric: 'tabular-nums',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: !inMonth ? 0 : 1,
                // transform handled by global .ui-btn:active; only animate color here
                transition: 'background-color 160ms var(--ease-out), color 160ms var(--ease-out)',
                position: 'relative',
              }}
            >
              {date.getDate()}
              {avail && !isSelected && (
                <span style={{
                  position: 'absolute',
                  bottom: 5,
                  left: '50%',
                  width: 4, height: 4,
                  borderRadius: 999,
                  background: 'var(--accent)',
                  transform: 'translateX(-50%)',
                }}/>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  width: 32, height: 32, padding: 0, border: '1px solid var(--border)',
  background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
  fontSize: 16, lineHeight: 1,
};

function buildMonthGrid(monthStart: Date) {
  const first = new Date(monthStart);
  const start = new Date(first);
  start.setDate(start.getDate() - start.getDay()); // back to Sunday
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
