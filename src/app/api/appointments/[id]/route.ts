import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { sendStudentCancelEmail } from '@/lib/email';

// DELETE /api/appointments/:id — student self-cancel, reopens the slot (§9, §11).
export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await ctx.params;
  const sb = await supabaseServer();

  const { data: appt, error } = await sb
    .rpc('cancel_appointment', { p_appointment_id: id })
    .maybeSingle();
  if (error) {
    if (/unauthorized/i.test(error.message ?? '')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!appt) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await sendStudentCancelEmail({
    to: me.college_email,
    name: me.name,
    slotStart: (appt as any).slot_start,
  });

  return NextResponse.json({ ok: true });
}
