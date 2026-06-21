import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// GET /api/slots — open future slots with spots_left (§8).
// Realtime is the preferred UI path; this is the initial fetch and the polling
// fallback.
export async function GET() {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from('slots')
    .select('id, slot_start, slot_end, capacity, appointments(status)')
    .gt('slot_start', new Date().toISOString())
    .eq('is_active', true)
    .order('slot_start', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = (data ?? []).map((s: any) => {
    const taken = (s.appointments ?? []).filter(
      (a: any) => a.status === 'booked' || a.status === 'checked_in',
    ).length;
    return {
      id: s.id,
      slot_start: s.slot_start,
      slot_end: s.slot_end,
      capacity: s.capacity,
      spots_left: s.capacity - taken,
    };
  }).filter((s) => s.spots_left > 0);

  return NextResponse.json(rows);
}
