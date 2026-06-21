import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { isCollegeEmail } from '@/lib/email-domain';

// GET /api/me — current profile (null if not yet signed up).
// POST /api/me — create or update profile for the authed user.

export async function GET() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json(null);
  const { data } = await sb.from('users').select('*').eq('auth_id', user.id).maybeSingle();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  if (!user.email || !isCollegeEmail(user.email)) {
    return NextResponse.json({ error: 'email_domain_not_allowed' }, { status: 403 });
  }

  const b = await req.json();
  const required = ['name', 'dob', 'gender', 'enrollment_no', 'home_station'] as const;
  for (const k of required) {
    if (!b[k]) return NextResponse.json({ error: `${k}_required` }, { status: 400 });
  }

  // Upsert keyed on auth_id; college_email comes from the verified auth identity.
  const payload = {
    auth_id: user.id,
    college_email: user.email!,
    name: b.name,
    dob: b.dob,
    gender: b.gender,
    phone: b.phone ?? null,
    enrollment_no: b.enrollment_no,
    home_station: b.home_station,
    address: b.address ?? null,
  };

  const { data: existing } = await sb.from('users').select('id, role').eq('auth_id', user.id).maybeSingle();
  if (existing) {
    const { data, error } = await sb.from('users').update(payload).eq('id', existing.id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  }
  const { data, error } = await sb.from('users').insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
