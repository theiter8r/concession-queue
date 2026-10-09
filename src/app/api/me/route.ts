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
  const required = ['name', 'dob', 'gender', 'enrollment_no', 'home_station',
    'department', 'academic_year', 'division'] as const;
  for (const k of required) {
    if (!b[k]) return NextResponse.json({ error: `${k}_required` }, { status: 400 });
  }

  const ALLOWED_YEARS = ['FE', 'SE', 'TE', 'BE'] as const;
  if (!ALLOWED_YEARS.includes(b.academic_year)) {
    return NextResponse.json({ error: 'invalid_academic_year' }, { status: 400 });
  }

  // Map pin is optional (typed addresses still work), but lat/lng travel together.
  const lat = typeof b.address_lat === 'number' && Number.isFinite(b.address_lat) ? b.address_lat : null;
  const lng = typeof b.address_lng === 'number' && Number.isFinite(b.address_lng) ? b.address_lng : null;
  const pinned = lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  // Pinned addresses arrive as parts; the printable line is built here so it
  // always matches what's stored. Typed (no-map fallback) addresses pass through.
  const flat = text(b.address_flat, 80);
  const building = text(b.address_building, 120);
  const landmark = text(b.address_landmark, 120);
  const mapLine = pinned ? text(b.address_map_line, 300) : null;
  if (mapLine && !flat) return NextResponse.json({ error: 'address_flat_required' }, { status: 400 });
  const address = mapLine
    ? [flat, building, landmark && `near ${landmark}`, mapLine].filter(Boolean).join(', ')
    : text(b.address, 500);

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
    address,
    address_lat: pinned ? lat : null,
    address_lng: pinned ? lng : null,
    address_locality: pinned ? text(b.address_locality, 80) : null,
    address_flat: mapLine ? flat : null,
    address_building: mapLine ? building : null,
    address_landmark: mapLine ? landmark : null,
    address_map_line: mapLine,
    department: b.department,
    academic_year: b.academic_year,
    division: b.division,
  };

  const { data: existing } = await sb.from('users').select('id, role').eq('auth_id', user.id).maybeSingle();
  if (existing) {
    const { data, error } = await sb.from('users').update(payload).eq('id', existing.id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  }
  const { data, error } = await sb.from('users').insert(payload).select().single();
  if (error?.code === '23505' && /enrollment_no/.test(error.message)) {
    return NextResponse.json(
      { error: 'This enrollment number is already registered. Check it, or contact the concession office.' },
      { status: 409 },
    );
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

function text(v: unknown, max: number): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
}
