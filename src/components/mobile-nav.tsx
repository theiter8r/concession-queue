'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { href: '/profile', label: 'Profile' },
  { href: '/book', label: 'Book' },
  { href: '/slots', label: 'Slots' },
  { href: '/me', label: 'Requests' },
];

const HIDDEN_PATHS = ['/', '/login', '/signup'];

export function MobileNav() {
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    const sb = supabaseBrowser();
    sb.auth.getUser().then(({ data }) => {
      if (data.user) {
        setAuthed(true);
        fetch('/api/me')
          .then(r => r.json())
          .then((p) => {
            if (p?.name) setName(p.name);
          })
          .catch(() => {});
      }
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session?.user);
      if (!session?.user) setName('');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!authed || HIDDEN_PATHS.includes(pathname) || pathname.startsWith('/admin')) return null;

  async function signOut() {
    const sb = supabaseBrowser();
    await sb.auth.signOut();
    window.location.href = '/';
  }

  return (
    <>
      <header className="app-topbar">
        <div className="app-topbar-left">
          <span className="app-dot" aria-hidden />
          <span className="app-brand">concession</span>
        </div>
        <div className="app-topbar-right">
          {name && (
            <a href="/profile" className="app-name-link" title="Edit profile">
              <span className="app-avatar">{name.charAt(0).toUpperCase()}</span>
              <span className="app-name">{name}</span>
            </a>
          )}
          <button className="app-signout" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <nav className="mobile-nav" aria-label="Main navigation">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              className={`mobile-nav-item${active ? ' active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              {item.label}
            </a>
          );
        })}
      </nav>
    </>
  );
}
