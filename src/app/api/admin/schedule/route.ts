import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

// GET /api/admin/schedule — current working_hours + slot_config + holidays (§11).
export async function GET() {
  await requireAdmin();
  const sb = await supabaseServer();
  const [hours, cfg, hols] = await Promise.all([
    sb.from('working_hours').select('*').order('weekday').order('open_time'),
    sb.from('slot_config').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    sb.from('holidays').select('*').order('holiday_date'),
  ]);
  return NextResponse.json({
    working_hours: hours.data ?? [],
    slot_config: cfg.data,
    holidays: hols.data ?? [],
  });
}

// PUT /api/admin/schedule — save working hours + slot config (§4b, §11).
// Replaces each touched weekday's working_hours rows wholesale (§4b).
export async function PUT(req: Request) {
  const me = await requireAdmin();
  const body = await req.json();
  const { working_hours, slot_config } = body ?? {};
  const sb = await supabaseServer();

  if (Array.isArray(working_hours)) {
    const touchedDays = Array.from(new Set(working_hours.map((w: any) => w.weekday)));
    if (touchedDays.length > 0) {
      await sb.from('working_hours').delete().in('weekday', touchedDays);
    }
    if (working_hours.length > 0) {
      const { error } = await sb.from('working_hours').insert(
        working_hours.map((w: any) => ({
          weekday: w.weekday,
          open_time: w.open_time,
          close_time: w.close_time,
        })),
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  if (slot_config) {
    // Keep a single active row; overwrite the latest if present.
    const { data: existing } = await sb
      .from('slot_config')
      .select('id')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const payload = {
      slot_minutes: slot_config.slot_minutes,
      default_capacity: slot_config.default_capacity,
      generate_weeks: slot_config.generate_weeks,
      updated_by: me.id,
      updated_at: new Date().toISOString(),
    };
    if (existing) {
      await sb.from('slot_config').update(payload).eq('id', existing.id);
    } else {
      await sb.from('slot_config').insert(payload);
    }
  }

  return NextResponse.json({ ok: true });
}
