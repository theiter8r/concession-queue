import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

// DELETE /api/admin/booklets/:id — delete a booklet (only if no forms issued from it).
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  const sb = await supabaseServer();

  const { data: booklet } = await sb
    .from('booklets')
    .select('booklet_no')
    .eq('id', id)
    .maybeSingle();

  if (!booklet) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const { count } = await sb
    .from('concession_forms')
    .select('*', { count: 'exact', head: true })
    .eq('booklet_no', booklet.booklet_no);

  if (count && count > 0) {
    return NextResponse.json({ error: 'booklet_has_issued_forms', used: count }, { status: 409 });
  }

  const { error } = await sb.from('booklets').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
