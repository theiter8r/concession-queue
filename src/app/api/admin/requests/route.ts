import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

// GET /api/admin/requests — list + filter (§11).
export async function GET(req: Request) {
  await requireAdmin();
  const sb = await supabaseServer();
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const station = url.searchParams.get('station');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  let q = sb
    .from('concession_requests')
    .select('*, users:users(name, enrollment_no, college_email, department, academic_year, division)')
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  if (station) q = q.eq('station_from', station);
  if (from) q = q.gte('created_at', from);
  if (to) q = q.lte('created_at', to);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
