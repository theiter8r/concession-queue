import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
// The settings page submits the full weekly schedule, so replace it wholesale.
export async function PUT(req: Request) {
  const me = await requireAdmin();
  const body = await req.json();
  const { working_hours, slot_config } = body ?? {};

  if (Array.isArray(working_hours)) {
    const validationError = validateWorkingHours(working_hours);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (slot_config) {
    const validationError = validateSlotConfig(slot_config);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const sb = await supabaseServer();

  if (Array.isArray(working_hours)) {
    const { error: deleteError } = await sb.from('working_hours').delete().gte('weekday', 0);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });

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
      const { error } = await sb.from('slot_config').update(payload).eq('id', existing.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else {
      const { error } = await sb.from('slot_config').insert(payload);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}

function validateWorkingHours(rows: any[]) {
  for (const row of rows) {
    const weekday = Number(row?.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      return 'Choose a valid weekday.';
    }

    const open = timeToMins(row?.open_time);
    const close = timeToMins(row?.close_time);
    if (open == null || close == null) {
      return `${DAYS[weekday]} has an invalid time.`;
    }
    if (close <= open) {
      return `${DAYS[weekday]} close time must be after open time.`;
    }
  }
  return null;
}

function validateSlotConfig(cfg: any) {
  const slotMinutes = Number(cfg?.slot_minutes);
  const defaultCapacity = Number(cfg?.default_capacity);
  const generateWeeks = Number(cfg?.generate_weeks);

  if (!Number.isFinite(slotMinutes) || slotMinutes <= 0) return 'Slot length must be greater than 0.';
  if (!Number.isFinite(defaultCapacity) || defaultCapacity <= 0) return 'People per slot must be greater than 0.';
  if (!Number.isFinite(generateWeeks) || generateWeeks <= 0) return 'Horizon must be greater than 0 weeks.';
  return null;
}

function timeToMins(value: unknown) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}
