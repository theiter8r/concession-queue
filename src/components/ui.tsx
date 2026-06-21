'use client';
import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from 'react';

// Shared primitives. Inline styles so the v1 ships without a CSS framework.

const baseButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: 36,
  padding: '0 14px',
  borderRadius: 'var(--radius-sm)',
  // Split shorthand so variant overrides of borderColor don't fight React's
  // diff on rerender (warning: "Removing a style property during rerender").
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'var(--border)',
  background: 'var(--bg-elevated)',
  color: 'var(--fg)',
  fontWeight: 500,
  cursor: 'pointer',
  // Specify exact properties (Emil §Review). Sub-300ms.
  transition: 'transform 140ms var(--ease-out), background-color 160ms var(--ease-out), border-color 160ms var(--ease-out), opacity 160ms var(--ease-out)',
  willChange: 'transform',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  children,
  style,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}) {
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--accent)', color: 'var(--accent-fg)', borderColor: 'var(--accent)' },
    secondary: {},
    ghost: { background: 'transparent', borderColor: 'transparent' },
    danger: { background: 'var(--danger)', color: 'white', borderColor: 'var(--danger)' },
  };
  const sizes: Record<string, React.CSSProperties> = {
    sm: { height: 28, padding: '0 10px', fontSize: 13 },
    md: {},
  };
  return (
    <button
      {...rest}
      className={`ui-btn ${rest.className ?? ''}`}
      style={{ ...baseButton, ...variants[variant], ...sizes[size], ...style }}
    >
      {children}
    </button>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        height: 36,
        padding: '0 10px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
        outline: 'none',
        transition: 'border-color 160ms var(--ease-out), box-shadow 160ms var(--ease-out)',
        width: '100%',
        ...props.style,
      }}
    />
  );
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select
      {...props}
      style={{
        height: 36,
        padding: '0 10px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
        outline: 'none',
        width: '100%',
        ...props.style,
      }}
    >
      {children}
    </select>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: 12, color: 'var(--fg-muted)', marginBottom: 6, fontWeight: 500 }}>
      {children}
    </label>
  );
}

export function Page({ children, title, subtitle, action }: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <main className="page-shell">
      <header className="page-head">
        <div>
          <h1 style={{ margin: 0, fontSize: 24, letterSpacing: -0.3, fontWeight: 600 }}>{title}</h1>
          {subtitle && <p style={{ margin: '4px 0 0', color: 'var(--fg-muted)' }}>{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </main>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'ok' | 'warn' | 'danger' }) {
  const tones: Record<string, React.CSSProperties> = {
    neutral: { background: 'var(--bg)', color: 'var(--fg-muted)', borderColor: 'var(--border)' },
    ok: { background: 'color-mix(in oklab, var(--ok) 12%, transparent)', color: 'var(--ok)', borderColor: 'color-mix(in oklab, var(--ok) 30%, transparent)' },
    warn: { background: 'color-mix(in oklab, var(--warn) 12%, transparent)', color: 'var(--warn)', borderColor: 'color-mix(in oklab, var(--warn) 30%, transparent)' },
    danger: { background: 'color-mix(in oklab, var(--danger) 12%, transparent)', color: 'var(--danger)', borderColor: 'color-mix(in oklab, var(--danger) 30%, transparent)' },
  };
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      height: 22,
      padding: '0 8px',
      fontSize: 12,
      fontWeight: 500,
      borderRadius: 999,
      border: '1px solid',
      ...tones[tone],
    }}>{children}</span>
  );
}
