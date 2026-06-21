import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

// POST /api/admin/slots — create/override a single slot (§11).
// Used to override capacity on a specific slot per §4b.
export async function POST(req: Request) {
  const me = await requireAdmin();
  const { slot_start, slot_end, capacity, is_active } = await req.json();
  if (!slot_start || !slot_end || !capacity) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from('slots')
    .upsert(
      {
        slot_start,
        slot_end,
        capacity,
        is_active: is_active ?? true,
        created_by: me.id,
      },
      { onConflict: 'slot_start' },
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
