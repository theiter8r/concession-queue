import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { ageEligibility, policyEligibility } from '@/lib/eligibility';

// POST /api/requests — create a concession request (§11).
export async function POST(req: Request) {
  const me = await requireUser();
  const body = await req.json();
  const { station_from, station_to, travel_class, period, reason, due_date } = body ?? {};

  if (!station_from || !travel_class || !period) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const age = ageEligibility(me.dob, me.gender);
  if (!age.ok) return NextResponse.json({ error: age.reason }, { status: 400 });

  const sb = await supabaseServer();
  const pol = await policyEligibility(sb, travel_class, period);
  if (!pol.ok) return NextResponse.json({ error: pol.reason }, { status: 400 });

  const { data, error } = await sb
    .from('concession_requests')
    .insert({
      user_id: me.id,
      station_from,
      station_to: station_to ?? 'Thane', // §1: route is always home→Thane
      travel_class,
      period,
      reason: reason ?? 'new',
      due_date: due_date ?? null,
      status: 'draft',
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// GET /api/requests — my requests + statuses + due dates (§11).
export async function GET() {
  await requireUser();
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from('concession_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
