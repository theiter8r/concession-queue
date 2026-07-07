import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { toCsv, toXlsx } from '@/lib/export';
import type { AllowedColumn } from '@/lib/export-columns';

// GET /api/admin/booklets/:id/export?format=csv|xlsx
// Download all issued concession forms for a booklet.

const BOOKLET_COLUMNS: AllowedColumn[] = [
  'railway_form_no',
  'name',
  'enrollment_no',
  'department',
  'academic_year',
  'division',
  'dob',
  'gender',
  'address',
  'station_from',
  'station_to',
  'travel_class',
  'period',
  'issued_at',
];

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const format = (url.searchParams.get('format') ?? 'xlsx').toLowerCase();

  const sb = await supabaseServer();
  const { data: booklet } = await sb
    .from('booklets')
    .select('booklet_no')
    .eq('id', id)
    .maybeSingle();

  if (!booklet) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const { data: forms, error } = await sb
    .from('concession_forms')
    .select('*, concession_requests!inner(*, users(*))')
    .eq('booklet_no', booklet.booklet_no)
    .order('railway_form_no', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = (forms ?? []).map((f: any) => ({
    ...f.concession_requests,
    users: f.concession_requests.users,
    concession_forms: [f],
  }));

  const filename = `booklet-${booklet.booklet_no}`;

  if (format === 'csv') {
    return new NextResponse(toCsv(rows, BOOKLET_COLUMNS), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${filename}.csv"`,
      },
    });
  }

  const buf = await toXlsx(rows, BOOKLET_COLUMNS);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="${filename}.xlsx"`,
    },
  });
}
