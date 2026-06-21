import { supabaseServer } from './supabase/server';

export async function currentUser() {
  const sb = await supabaseServer();
  const { data: { user: authUser } } = await sb.auth.getUser();
  if (!authUser) return null;
  const { data } = await sb
    .from('users')
    .select('*')
    .eq('auth_id', authUser.id)
    .single();
  return data;
}

export async function requireUser() {
  const u = await currentUser();
  if (!u) throw new Response('unauthorized', { status: 401 });
  return u;
}

export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== 'admin') throw new Response('forbidden', { status: 403 });
  return u;
}
