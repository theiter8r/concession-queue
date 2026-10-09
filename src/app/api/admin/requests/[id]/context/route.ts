import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

// GET /api/admin/requests/:id/context — what the desk needs to process a visit:
//   location — full address + map pin only on the student's first visit (no
//              earlier issued form). After that, just the area ("Thane").
//   history  — previously issued forms, newest first, so a returning student
//              can be compared against last time and issued straight away.
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  const sb = await supabaseServer();

  const { data: r, error } = await sb
    .from('concession_requests')
    .select('id, user_id, users:users(home_station, address, address_lat, address_lng, address_locality)')
    .eq('id', id)
    .single();
  if (error || !r) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { data: prev } = await sb
    .from('concession_requests')
    .select('id, station_from, station_to, travel_class, period, reason, due_date, season_ticket_no, created_at, concession_forms(booklet_no, railway_form_no, issued_at)')
    .eq('user_id', r.user_id)
    .eq('status', 'issued')
    .neq('id', id)
    .order('created_at', { ascending: false })
    .limit(5);

  const history = (prev ?? []).map((p: any) => {
    const f = Array.isArray(p.concession_forms) ? p.concession_forms[0] : p.concession_forms;
    return {
      id: p.id,
      station_from: p.station_from,
      station_to: p.station_to,
      travel_class: p.travel_class,
      period: p.period,
      reason: p.reason,
      due_date: p.due_date,
      season_ticket_no: p.season_ticket_no,
      booklet_no: f?.booklet_no ?? null,
      railway_form_no: f?.railway_form_no ?? null,
      issued_at: f?.issued_at ?? p.created_at,
    };
  });

  const u: any = Array.isArray(r.users) ? r.users[0] : r.users;
  const firstVisit = history.length === 0;
  const location = firstVisit
    ? {
        mode: 'full' as const,
        address: u?.address ?? null,
        lat: u?.address_lat ?? null,
        lng: u?.address_lng ?? null,
        area: u?.address_locality ?? u?.home_station ?? null,
      }
    : { mode: 'area' as const, area: u?.address_locality ?? u?.home_station ?? null };

  return NextResponse.json({ firstVisit, location, history });
}
