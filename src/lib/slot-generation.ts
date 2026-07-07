import type { SupabaseClient } from '@supabase/supabase-js';

// Slot materialization — SPEC §4b.
// For each date D in the horizon: skip holidays; for each working_hours row
// matching weekday(D), emit [start, start+slot_minutes) windows up to close.
// Idempotent via the unique index on slots.slot_start.

type Working = { weekday: number; open_time: string; close_time: string };
export type SlotGenerationResult = { generated: number; candidates: number };

function parseHM(t: string): [number, number] {
  const [h, m] = t.split(':').map(Number);
  return [h, m ?? 0];
}

export async function generateSlots(sb: SupabaseClient, actor: string | null): Promise<SlotGenerationResult> {
  const [{ data: cfg }, { data: hours }, { data: hols }] = await Promise.all([
    sb.from('slot_config').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    sb.from('working_hours').select('weekday, open_time, close_time'),
    sb.from('holidays').select('holiday_date'),
  ]);
  if (!cfg) throw new Error('slot_config_missing');

  const slotMin: number = cfg.slot_minutes;
  const capacity: number = cfg.default_capacity;
  const weeks: number = cfg.generate_weeks;

  const holidaySet = new Set((hols ?? []).map((h: any) => h.holiday_date));
  const byWeekday = new Map<number, Working[]>();
  for (const w of (hours ?? []) as Working[]) {
    const list = byWeekday.get(w.weekday) ?? [];
    list.push(w);
    byWeekday.set(w.weekday, list);
  }

  const rows: { slot_start: string; slot_end: string; capacity: number; created_by: string | null }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizonDays = weeks * 7;

  for (let i = 0; i < horizonDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    if (holidaySet.has(iso)) continue;
    const dows = byWeekday.get(d.getDay()) ?? [];
    for (const w of dows) {
      const [oh, om] = parseHM(w.open_time);
      const [ch, cm] = parseHM(w.close_time);
      const open = new Date(d); open.setHours(oh, om, 0, 0);
      const close = new Date(d); close.setHours(ch, cm, 0, 0);
      for (let t = open.getTime(); t + slotMin * 60_000 <= close.getTime(); t += slotMin * 60_000) {
        const start = new Date(t).toISOString();
        const end = new Date(t + slotMin * 60_000).toISOString();
        rows.push({ slot_start: start, slot_end: end, capacity, created_by: actor });
      }
    }
  }

  if (rows.length === 0) return { generated: 0, candidates: 0 };
  // onConflict on slot_start (unique) makes this idempotent (§4b).
  const { data, error } = await sb
    .from('slots')
    .upsert(rows, { onConflict: 'slot_start', ignoreDuplicates: true })
    .select('id');
  if (error) throw error;
  return { generated: data?.length ?? 0, candidates: rows.length };
}
