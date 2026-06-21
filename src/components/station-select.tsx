'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { STATIONS } from '@/lib/stations';

// Searchable combobox for picking a Mumbai Suburban station. Themed to match
// the rest of the app: behaves like an <Input>, opens a list on focus, filters
// as the user types, keyboard-navigable.

type Props = {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
};

export function StationSelect({ value, onChange, required, placeholder = 'Search station…', autoFocus }: Props) {
  const [query, setQuery] = useState(value ?? '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Keep local input synced when the parent resets the value externally.
  useEffect(() => { setQuery(value ?? ''); }, [value]);

  // Close on outside click / Esc.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        // If user typed something that doesn't match a station, drop it to
        // avoid persisting a freeform value (we want the canonical name).
        if (!STATIONS.includes(query)) setQuery(value ?? '');
      }
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, query, value]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return STATIONS.slice(0, 100);
    // Rank: startsWith hits first, then includes hits.
    const starts: string[] = [];
    const includes: string[] = [];
    for (const s of STATIONS) {
      const lo = s.toLowerCase();
      if (lo.startsWith(q)) starts.push(s);
      else if (lo.includes(q)) includes.push(s);
    }
    return [...starts, ...includes].slice(0, 50);
  }, [query]);

  // Reset highlight when results change
  useEffect(() => { setActive(0); }, [results.length]);

  // Keep active row in view when navigating via keyboard
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLLIElement>(`li[data-i="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  function commit(s: string) {
    onChange(s);
    setQuery(s);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive(a => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(a => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      if (open && results[active]) {
        e.preventDefault();
        commit(results[active]);
      }
    } else if (e.key === 'Tab') {
      // Soft-commit on tab if there's an exact-ish match.
      if (open && results[active]) commit(results[active]);
    }
  }

  return (
    <div ref={rootRef} style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        required={required}
        autoFocus={autoFocus}
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => { setQuery(e.target.value); setOpen(true); onChange(e.target.value); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        style={{
          height: 36,
          padding: '0 10px',
          borderRadius: 'var(--radius-sm)',
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: 'var(--border)',
          background: 'var(--bg-elevated)',
          outline: 'none',
          width: '100%',
          transition: 'border-color 160ms var(--ease-out), box-shadow 160ms var(--ease-out)',
        }}
      />

      {open && results.length > 0 && (
        <ul
          ref={listRef}
          className="station-pop"
          role="listbox"
          style={{
            position: 'absolute',
            zIndex: 50,
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            margin: 0,
            padding: 4,
            listStyle: 'none',
            maxHeight: 260,
            overflowY: 'auto',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
            transformOrigin: 'top',
          }}
        >
          {results.map((s, i) => {
            const isActive = i === active;
            return (
              <li
                key={s}
                data-i={i}
                role="option"
                aria-selected={isActive}
                onMouseDown={(e) => { e.preventDefault(); commit(s); }}
                onMouseEnter={() => setActive(i)}
                style={{
                  padding: '7px 10px',
                  fontSize: 14,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  background: isActive ? 'color-mix(in oklab, var(--accent) 8%, transparent)' : 'transparent',
                  color: 'var(--fg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{highlight(s, query)}</span>
                {value === s && (
                  <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>selected</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {open && results.length === 0 && (
        <div className="station-pop" style={{
          position: 'absolute', zIndex: 50, top: 'calc(100% + 6px)', left: 0, right: 0,
          padding: '10px 12px', fontSize: 13, color: 'var(--fg-muted)',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)',
        }}>
          No station matches "{query}".
        </div>
      )}

      <style jsx>{`
        .station-pop {
          opacity: 1;
          transform: translateY(0) scale(1);
          transition: opacity 160ms var(--ease-out), transform 160ms var(--ease-out);
        }
        @starting-style {
          .station-pop {
            opacity: 0;
            transform: translateY(-4px) scale(0.98);
          }
        }
      `}</style>
    </div>
  );
}

// Wrap the matched substring in <strong> for visual feedback during typing.
function highlight(s: string, q: string) {
  const query = q.trim();
  if (!query) return s;
  const idx = s.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return s;
  return (
    <>
      {s.slice(0, idx)}
      <strong style={{ fontWeight: 600 }}>{s.slice(idx, idx + query.length)}</strong>
      {s.slice(idx + query.length)}
    </>
  );
}
