import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';

// GET — read one request (used by /me detail / /book resume).
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from('concession_requests')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

// DELETE — discard a draft. Only drafts; non-draft requests must be cancelled
// via the appointment cancel flow.
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: row, error: readErr } = await sb
    .from('concession_requests')
    .select('id, user_id, status')
    .eq('id', id)
    .single();
  if (readErr || !row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (row.user_id !== me.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (row.status !== 'draft') {
    return NextResponse.json({ error: 'only_drafts_can_be_discarded' }, { status: 400 });
  }
  const { error } = await sb.from('concession_requests').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
