import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';

// POST /api/requests/:id/renew — clone into a renewal (§7 Renewal).
// Sets reason='renewal' and previous_request_id; routing is prefilled from the
// prior form so the student only changes home station if they actually moved.
export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await ctx.params;
  const sb = await supabaseServer();

  const { data: prev, error: e1 } = await sb
    .from('concession_requests')
    .select('*')
    .eq('id', id)
    .eq('user_id', me.id)
    .single();
  if (e1 || !prev) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { data, error } = await sb
    .from('concession_requests')
    .insert({
      user_id: me.id,
      station_from: prev.station_from,
      station_to: prev.station_to,
      travel_class: prev.travel_class,
      period: prev.period,
      reason: 'renewal',
      previous_request_id: prev.id,
      status: 'draft',
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
