import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

// POST /api/admin/requests/:id/issue — assign booklet_no + railway_form_no
// and flip status to 'issued' (§7, §11).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const { booklet_no, railway_form_no } = await req.json();
  if (!booklet_no || !railway_form_no) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }
  const sb = await supabaseServer();

  // Read current request so we know period + whether due_date is already set.
  const { data: reqRow, error: e0 } = await sb
    .from('concession_requests')
    .select('period, due_date')
    .eq('id', id)
    .single();
  if (e0 || !reqRow) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { error: e1 } = await sb.from('concession_forms').insert({
    request_id: id,
    booklet_no,
    railway_form_no,
    issued_by: admin.id,
  });
  if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });

  // Compute due_date from period if the request didn't already have one. This
  // is what powers the pass-card expiry + "Renew now" CTA on /me.
  const computedDue = reqRow.due_date
    ? null
    : (() => {
        const d = new Date();
        if (reqRow.period === 'quarterly') d.setMonth(d.getMonth() + 3);
        else d.setMonth(d.getMonth() + 1);
        return d.toISOString().slice(0, 10);
      })();

  const update: Record<string, unknown> = { status: 'issued' };
  if (computedDue) update.due_date = computedDue;

  const { error: e2 } = await sb
    .from('concession_requests')
    .update(update)
    .eq('id', id);
  if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });

  // Mark the active appointment as done.
  await sb
    .from('appointments')
    .update({ status: 'done' })
    .eq('request_id', id)
    .in('status', ['booked', 'checked_in']);

  return NextResponse.json({ ok: true });
}
