import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  const { reason } = await req.json().catch(() => ({}));
  const sb = await supabaseServer();
  const { error } = await sb
    .from('concession_requests')
    .update({ status: 'rejected' })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await sb.from('audit_log').insert({ action: 'request_rejected', request_id: id, meta: { reason } });
  return NextResponse.json({ ok: true });
}
