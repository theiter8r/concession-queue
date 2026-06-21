import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { sendAdminCancelEmail } from '@/lib/email';

// DELETE /api/admin/appointments/:id — admin cancel; sends email (§9, §11).
export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  const sb = await supabaseServer();

  const { data: appt, error: e1 } = await sb
    .from('appointments')
    .select('id, request_id, slots!inner(slot_start), concession_requests!inner(users!inner(name, college_email))')
    .eq('id', id)
    .single();
  if (e1 || !appt) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { error } = await sb
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await sb
    .from('concession_requests')
    .update({ status: 'draft' })
    .eq('id', appt.request_id);

  await sendAdminCancelEmail({
    to: (appt as any).concession_requests.users.college_email,
    name: (appt as any).concession_requests.users.name,
    slotStart: (appt as any).slots.slot_start,
  });

  return NextResponse.json({ ok: true });
}
