import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Route guard:
//   /admin/*               → must be authed + role='admin'
//   /book, /me, /slots     → must be authed + have a profile (else /signup)
//   /                      → if already authed, push to /me
// Public: /, /signup, /api/*, _next, static.

const PROTECTED_STUDENT = ['/book', '/me'];
const PROTECTED_ADMIN = ['/admin'];

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const res = NextResponse.next();

  // Build a Supabase client that can read/write the session cookies on `res`.
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (all: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          for (const { name, value, options } of all) {
            res.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data: { user } } = await sb.auth.getUser();
  const path = url.pathname;

  const needsAuth =
    PROTECTED_STUDENT.some(p => path.startsWith(p)) ||
    PROTECTED_ADMIN.some(p => path.startsWith(p));

  if (needsAuth && !user) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (user) {
    const { data: profile } = await sb
      .from('users')
      .select('id, role')
      .eq('auth_id', user.id)
      .maybeSingle();

    // Authed but no profile → finish signup before anything else.
    if (!profile && path !== '/signup' && !path.startsWith('/api')) {
      return NextResponse.redirect(new URL('/signup', req.url));
    }

    // Admin gate.
    if (PROTECTED_ADMIN.some(p => path.startsWith(p)) && profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/me', req.url));
    }

    // If profile exists and they hit the landing page, send them in.
    if (profile && path === '/') {
      return NextResponse.redirect(new URL(profile.role === 'admin' ? '/admin' : '/me', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
