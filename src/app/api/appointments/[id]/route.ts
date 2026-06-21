import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { sendStudentCancelEmail } from '@/lib/email';

// DELETE /api/appointments/:id — student self-cancel, reopens the slot (§9, §11).
export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await ctx.params;
  const sb = await supabaseServer();

  const { data: appt, error: e1 } = await sb
    .from('appointments')
    .select('id, slot_id, request_id, status, concession_requests!inner(user_id), slots!inner(slot_start)')
    .eq('id', id)
    .single();
  if (e1 || !appt) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if ((appt as any).concession_requests.user_id !== me.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { error } = await sb
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await sb
    .from('concession_requests')
    .update({ status: 'draft' })
    .eq('id', appt.request_id);

  await sendStudentCancelEmail({
    to: me.college_email,
    name: me.name,
    slotStart: (appt as any).slots.slot_start,
  });

  return NextResponse.json({ ok: true });
}
