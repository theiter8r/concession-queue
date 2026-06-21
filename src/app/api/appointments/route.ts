import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { generateOtp } from '@/lib/otp';
import { sendBookingEmail } from '@/lib/email';

// POST /api/appointments — book a slot via the atomic RPC (§4, §11).
export async function POST(req: Request) {
  const me = await requireUser();
  const { slot_id, request_id } = await req.json();
  if (!slot_id || !request_id) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const sb = await supabaseServer();

  // Ownership: the request must belong to the calling student. RLS would block
  // the RPC's underlying update anyway, but a clean 404 is friendlier.
  const { data: r } = await sb
    .from('concession_requests')
    .select('id, user_id, station_from')
    .eq('id', request_id)
    .single();
  if (!r || r.user_id !== me.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const otp = generateOtp();
  const { data, error } = await sb.rpc('book_appointment', {
    p_slot_id: slot_id,
    p_request_id: request_id,
    p_otp_hash: otp.hash,
  });
  if (error) {
    console.error('[book_appointment] rpc failed:', error);
    const msg = error.message ?? '';
    // §4: surface slot_full so the UI can refresh + reprompt.
    if (/slot_full/.test(msg))      return NextResponse.json({ error: 'slot_full' }, { status: 409 });
    if (/slot_not_found/.test(msg)) return NextResponse.json({ error: 'slot_not_found' }, { status: 404 });
    // Partial unique index on appointments (one_active_appt_per_request).
    if (error.code === '23505' || /one_active_appt_per_request/.test(msg)) {
      return NextResponse.json({ error: 'one_active_per_request' }, { status: 409 });
    }
    return NextResponse.json({ error: msg || 'booking_failed' }, { status: 400 });
  }

  const { data: slot } = await sb
    .from('slots')
    .select('slot_start')
    .eq('id', slot_id)
    .single();

  await sendBookingEmail({
    to: me.college_email,
    name: me.name,
    slotStart: slot?.slot_start ?? '',
    otp: otp.code,
    appointmentId: data.id,
  });

  return NextResponse.json(data);
}
