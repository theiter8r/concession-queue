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

  const { error: e1 } = await sb.from('concession_forms').insert({
    request_id: id,
    booklet_no,
    railway_form_no,
    issued_by: admin.id,
  });
  if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });

  const { error: e2 } = await sb
    .from('concession_requests')
    .update({ status: 'issued' })
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
