import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

// POST /api/requests/:id/season-ticket — student records the railway-issued
// season ticket number after they've bought the actual pass.
//
// Why this is a server-only endpoint instead of a direct client update:
// the student RLS update policy on concession_requests only permits updates
// while status='draft' (0003_rls.sql:38). Loosening RLS isn't an option —
// Postgres row-level security can't restrict *which* columns a student edits,
// so a broader UPDATE policy would let them tamper with status, due_date, etc.
// Instead we use supabaseAdmin() here with an explicit ownership check and a
// hardcoded two-column update.

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const raw = String(body?.season_ticket_no ?? '').trim();
  if (!raw) return NextResponse.json({ error: 'missing_season_ticket_no' }, { status: 400 });
  if (raw.length > 40) return NextResponse.json({ error: 'too_long' }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: row, error: readErr } = await sb
    .from('concession_requests')
    .select('id, user_id, status')
    .eq('id', id)
    .single();
  if (readErr || !row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (row.user_id !== me.id) {
    console.warn('[season-ticket] ownership mismatch', {
      request_id: id,
      request_user_id: row.user_id,
      me_id: me.id,
      me_role: me.role,
    });
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (row.status !== 'issued') {
    return NextResponse.json({ error: 'request_not_issued' }, { status: 400 });
  }

  const { error } = await sb
    .from('concession_requests')
    .update({
      season_ticket_no: raw,
      season_ticket_recorded_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
