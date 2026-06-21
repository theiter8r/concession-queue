import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

// DELETE /api/admin/holidays/:date — remove a holiday (§11).
// Note: existing slots stay is_active=false. Re-running generate will recreate
// suppressed-day slots only if the unique slot_start no longer exists.
export async function DELETE(_: Request, ctx: { params: Promise<{ date: string }> }) {
  await requireAdmin();
  const { date } = await ctx.params;
  const sb = await supabaseServer();
  const { error } = await sb.from('holidays').delete().eq('holiday_date', date);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
