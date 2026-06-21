import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { sendAdminCancelEmail } from '@/lib/email';

// POST /api/admin/holidays — add a holiday; suppresses + cancels affected slots (§4b, §11).
export async function POST(req: Request) {
  const me = await requireAdmin();
  const { holiday_date, reason } = await req.json();
  if (!holiday_date) return NextResponse.json({ error: 'date_required' }, { status: 400 });
  const sb = await supabaseServer();

  const { error: e1 } = await sb
    .from('holidays')
    .insert({ holiday_date, reason, created_by: me.id });
  if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });

  // Suppress every slot on that date.
  const dayStart = `${holiday_date}T00:00:00Z`;
  const dayEnd = `${holiday_date}T23:59:59Z`;

  const { data: slots } = await sb
    .from('slots')
    .select('id')
    .gte('slot_start', dayStart)
    .lte('slot_start', dayEnd);

  if (slots && slots.length > 0) {
    const ids = slots.map((s: any) => s.id);
    await sb.from('slots').update({ is_active: false }).in('id', ids);

    // Cancel active bookings on those slots and notify the students.
    const { data: appts } = await sb
      .from('appointments')
      .select('id, slot_id, request_id, slots!inner(slot_start), concession_requests!inner(users!inner(name, college_email))')
      .in('slot_id', ids)
      .in('status', ['booked', 'checked_in']);

    if (appts && appts.length > 0) {
      await sb
        .from('appointments')
        .update({ status: 'cancelled' })
        .in('id', appts.map((a: any) => a.id));

      for (const a of appts as any[]) {
        await sendAdminCancelEmail({
          to: a.concession_requests.users.college_email,
          name: a.concession_requests.users.name,
          slotStart: a.slots.slot_start,
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
