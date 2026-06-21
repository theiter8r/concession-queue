import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { hashOtp } from '@/lib/otp';

// POST /api/admin/requests/:id/verify (§7 first-time issue, §11).
// At the slot: admin matches college ID, verifies OTP, flips id_verified,
// marks the request 'verified'.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const { otp } = await req.json();
  if (!otp) return NextResponse.json({ error: 'otp_required' }, { status: 400 });
  const sb = await supabaseServer();

  const { data: appt, error: e1 } = await sb
    .from('appointments')
    .select('id, otp_hash, status, request_id, concession_requests!inner(user_id)')
    .eq('request_id', id)
    .in('status', ['booked', 'checked_in'])
    .single();
  if (e1 || !appt) return NextResponse.json({ error: 'no_active_appointment' }, { status: 404 });

  if (appt.otp_hash !== hashOtp(String(otp))) {
    return NextResponse.json({ error: 'otp_mismatch' }, { status: 400 });
  }

  await sb
    .from('appointments')
    .update({ otp_verified_at: new Date().toISOString(), status: 'checked_in' })
    .eq('id', appt.id);

  await sb
    .from('users')
    .update({
      id_verified: true,
      verified_by: admin.id,
      verified_at: new Date().toISOString(),
    })
    .eq('id', (appt as any).concession_requests.user_id);

  const { error: e2 } = await sb
    .from('concession_requests')
    .update({ status: 'verified' })
    .eq('id', id);
  if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
