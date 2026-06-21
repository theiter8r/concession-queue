import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendSeasonTicketReminder } from '@/lib/email';

// Daily Vercel Cron — one-shot reminder ~24h after a form is issued, asking
// the student to record their season ticket number. Auth pattern mirrors
// /api/cron/generate-slots.

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  const fromVercelCron = req.headers.get('x-vercel-cron');
  const ok =
    fromVercelCron === '1' ||
    (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`);
  if (!ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const sb = supabaseAdmin();

  // Window: forms issued between 48h and 24h ago. Anything older was either
  // already reminded or fell outside the daily-cron catchment.
  const now = Date.now();
  const windowEnd = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const windowStart = new Date(now - 48 * 60 * 60 * 1000).toISOString();

  const { data: forms, error } = await sb
    .from('concession_forms')
    .select(`
      request_id,
      issued_at,
      concession_requests!inner (
        id,
        station_from,
        station_to,
        season_ticket_no,
        season_ticket_reminder_sent_at,
        users:user_id ( name, college_email )
      )
    `)
    .gte('issued_at', windowStart)
    .lte('issued_at', windowEnd);

  if (error) {
    console.error('[cron/season-ticket-reminders] query failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const APP_URL = process.env.APP_URL ?? '';
  let sent = 0;
  let skipped = 0;

  for (const f of forms ?? []) {
    const r = (f as { concession_requests: any }).concession_requests;
    if (!r) { skipped++; continue; }
    if (r.season_ticket_no || r.season_ticket_reminder_sent_at) { skipped++; continue; }
    const u = r.users;
    if (!u?.college_email) { skipped++; continue; }

    const result = await sendSeasonTicketReminder({
      to: u.college_email,
      name: u.name ?? 'there',
      route: `${r.station_from} → ${r.station_to}`,
      meUrl: `${APP_URL}/me`,
    });

    // Stamp the dedup flag regardless of send result. If email failed we don't
    // want to retry tomorrow and double-send; we'd rather miss one reminder
    // than spam a student.
    await sb
      .from('concession_requests')
      .update({ season_ticket_reminder_sent_at: new Date().toISOString() })
      .eq('id', r.id);

    if (result.ok) sent++;
    else skipped++;
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
