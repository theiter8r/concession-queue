import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

// GET /api/admin/booklets — list all booklets with usage stats.
export async function GET() {
  await requireAdmin();
  const sb = await supabaseServer();

  // concession_forms links to a booklet by booklet_no (text, no FK), so
  // PostgREST can't embed a count — tally it here instead.
  const [{ data, error }, { data: forms, error: fErr }] = await Promise.all([
    sb.from('booklets').select('*').order('booklet_no', { ascending: true }),
    sb.from('concession_forms').select('booklet_no'),
  ]);

  if (error || fErr) return NextResponse.json({ error: (error ?? fErr)!.message }, { status: 400 });
  const counts = new Map<string, number>();
  for (const f of forms ?? []) counts.set(f.booklet_no, (counts.get(f.booklet_no) ?? 0) + 1);
  return NextResponse.json((data ?? []).map(b => ({ ...b, issued: [{ count: counts.get(b.booklet_no) ?? 0 }] })));
}

// POST /api/admin/booklets — create a new booklet.
export async function POST(req: Request) {
  const admin = await requireAdmin();
  const { booklet_no, total_forms, notes } = await req.json();
  if (!booklet_no) {
    return NextResponse.json({ error: 'booklet_no_required' }, { status: 400 });
  }

  const sb = await supabaseServer();
  const { data, error } = await sb
    .from('booklets')
    .insert({ booklet_no, total_forms: total_forms ?? 50, notes, created_by: admin.id })
    .select()
    .maybeSingle();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'booklet_already_exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}
