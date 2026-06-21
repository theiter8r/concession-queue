import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';

// GET /api/season-ticket/prompt — should /book show the capture prompt?
//
// Prompt only when BOTH:
//   1. The student hasn't recorded a season ticket number anywhere in the
//      current calendar month (don't nag on every booking).
//   2. They have a prior issued request whose season_ticket_no is still null.
//
// Returns { request_id, route } | { request_id: null } so the client just
// reads .request_id to decide.

export async function GET() {
  const me = await requireUser();
  const sb = await supabaseServer();

  // Start of the current calendar month, in the server's local zone — close
  // enough for a "once per month" prompt throttle.
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: recent } = await sb
    .from('concession_requests')
    .select('id')
    .eq('user_id', me.id)
    .not('season_ticket_recorded_at', 'is', null)
    .gte('season_ticket_recorded_at', monthStart)
    .limit(1);

  if (recent && recent.length > 0) {
    return NextResponse.json({ request_id: null });
  }

  const { data: pending } = await sb
    .from('concession_requests')
    .select('id, station_from, station_to')
    .eq('user_id', me.id)
    .eq('status', 'issued')
    .is('season_ticket_no', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pending) return NextResponse.json({ request_id: null });

  return NextResponse.json({
    request_id: pending.id,
    route: `${pending.station_from} → ${pending.station_to}`,
  });
}
