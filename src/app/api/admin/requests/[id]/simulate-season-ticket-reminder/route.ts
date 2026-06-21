import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendSeasonTicketReminder } from '@/lib/email';

// POST /api/admin/requests/:id/simulate-season-ticket-reminder
// Admin-only test trigger: sends the season-ticket reminder email for a given
// issued request right now, regardless of the 24–48h window the real cron
// uses. Does NOT stamp `season_ticket_reminder_sent_at`, so the real cron will
// still fire its (single) production reminder on schedule.

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  const sb = supabaseAdmin();

  const { data: r, error } = await sb
    .from('concession_requests')
    .select(`
      id, station_from, station_to, status, season_ticket_no,
      users:user_id ( name, college_email )
    `)
    .eq('id', id)
    .single();

  if (error || !r) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (r.status !== 'issued') {
    return NextResponse.json({ error: 'request_not_issued' }, { status: 400 });
  }
  if (r.season_ticket_no) {
    return NextResponse.json({ error: 'season_ticket_already_recorded' }, { status: 400 });
  }
  const rawUsers = (r as { users: unknown }).users;
  const u = (Array.isArray(rawUsers) ? rawUsers[0] : rawUsers) as { name: string | null; college_email: string | null } | null;
  if (!u?.college_email) return NextResponse.json({ error: 'no_email' }, { status: 400 });

  const APP_URL = process.env.APP_URL ?? '';
  const result = await sendSeasonTicketReminder({
    to: u.college_email,
    name: u.name ?? 'there',
    route: `${r.station_from} → ${r.station_to}`,
    meUrl: `${APP_URL}/me`,
  });

  return NextResponse.json({ ok: result.ok, to: u.college_email, via: 'ok' in result ? (result as { via?: string }).via : null });
}
