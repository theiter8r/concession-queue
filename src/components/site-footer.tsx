'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

// Global footer — same chrome as the landing page so every screen ends with
// the credit + GitHub link. When the user is logged in, the trailing "Sign in"
// link flips to a "Sign out" action that clears the Supabase session.

export function SiteFooter() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const sb = supabaseBrowser();
    sb.auth.getUser().then(({ data }) => setAuthed(!!data.user));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const sb = supabaseBrowser();
    await sb.auth.signOut();
    window.location.href = '/';
  }

  return (
    <footer
      style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: 1100,
        margin: '0 auto',
        padding: '28px 16px 40px',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        color: 'var(--fg-faint)',
        fontSize: 13,
        flexWrap: 'wrap',
      }}
    >
      <span>
        made by{' '}
        <a
          href="https://github.com/theiter8r"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--fg-muted)', textDecoration: 'underline' }}
        >
          raajpatkar
        </a>
      </span>
      <span>·</span>
      {authed ? (
        <button
          onClick={signOut}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'var(--fg-muted)',
            textDecoration: 'underline',
            cursor: 'pointer',
            font: 'inherit',
          }}
        >
          Sign out
        </button>
      ) : (
        <a href="/login" style={{ color: 'var(--fg-muted)', textDecoration: 'underline' }}>
          Sign in
        </a>
      )}
    </footer>
  );
}
