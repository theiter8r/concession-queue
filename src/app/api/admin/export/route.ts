import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { pickColumns } from '@/lib/export-columns';
import { toCsv, toXlsx } from '@/lib/export';

// GET /api/admin/export?format=csv|xlsx&columns=a,b,c&from=...&to=...&status=... (§10, §11).
export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const format = (url.searchParams.get('format') ?? 'csv').toLowerCase();
  const requested = (url.searchParams.get('columns') ?? '').split(',').filter(Boolean);
  const status = url.searchParams.get('status');
  const station = url.searchParams.get('station');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const cols = pickColumns(requested);
  if (cols.length === 0) {
    return NextResponse.json({ error: 'no_valid_columns' }, { status: 400 });
  }

  const sb = await supabaseServer();
  let q = sb
    .from('concession_requests')
    .select('*, users(*), concession_forms(*)')
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  if (station) q = q.eq('station_from', station);
  if (from) q = q.gte('created_at', from);
  if (to) q = q.lte('created_at', to);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (format === 'xlsx') {
    const buf = await toXlsx(data ?? [], cols);
    return new NextResponse(buf, {
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'content-disposition': 'attachment; filename="export.xlsx"',
      },
    });
  }

  const csv = toCsv(data ?? [], cols);
  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="export.csv"',
    },
  });
}
