import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { toCsv, toXlsx } from '@/lib/export';
import type { AllowedColumn } from '@/lib/export-columns';

// GET /api/admin/export/railway-report?booklet_no=...&format=csv|xlsx
// The report the office actually submits per exhausted booklet (§10, §11).
const REPORT_COLUMNS: AllowedColumn[] = [
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

export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const booklet_no = url.searchParams.get('booklet_no');
  const format = (url.searchParams.get('format') ?? 'xlsx').toLowerCase();
  if (!booklet_no) {
    return NextResponse.json({ error: 'booklet_no_required' }, { status: 400 });
  }

  const sb = await supabaseServer();
  const { data: forms, error } = await sb
    .from('concession_forms')
    .select('*, concession_requests!inner(*, users(*))')
    .eq('booklet_no', booklet_no)
    .order('railway_form_no', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Flatten so the whitelist getters resolve.
  const rows = (forms ?? []).map((f: any) => ({
    ...f.concession_requests,
    users: f.concession_requests.users,
    concession_forms: [f],
  }));

  if (format === 'csv') {
    return new NextResponse(toCsv(rows, REPORT_COLUMNS), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="booklet-${booklet_no}.csv"`,
      },
    });
  }
  const buf = await toXlsx(rows, REPORT_COLUMNS);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="booklet-${booklet_no}.xlsx"`,
    },
  });
}
