import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { generateSlots } from '@/lib/slot-generation';

// POST /api/admin/slots/generate — materialize slots through the horizon (§4b, §11).
export async function POST() {
  const me = await requireAdmin();
  const sb = await supabaseServer();
  try {
    const n = await generateSlots(sb, me.id);
    return NextResponse.json({ ok: true, generated: n });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'generation_failed' }, { status: 400 });
  }
}
