'use client';
import { useState } from 'react';
import { Page, Card, Button, Input, Select, Label } from '@/components/ui';
import { DatePicker } from '@/components/date-picker';

// /admin/export — column-picker export + railway-report preset (SPEC §10, §12).

const ALL_COLUMNS = [
  'name','enrollment_no','college_email','phone','dob','gender','address','home_station',
  'station_from','station_to','travel_class','period','reason','status','due_date','created_at',
  'booklet_no','railway_form_no','issued_at',
];

export default function ExportPage() {
  const [format, setFormat] = useState<'csv' | 'xlsx'>('xlsx');
  const [columns, setColumns] = useState<string[]>([
    'name','enrollment_no','station_from','station_to','travel_class','period','status','created_at',
  ]);
  const [filters, setFilters] = useState({ status: '', station: '', from: '', to: '' });
  const [bookletNo, setBookletNo] = useState('');

  function toggle(c: string) {
    setColumns(cs => cs.includes(c) ? cs.filter(x => x !== c) : [...cs, c]);
  }

  function downloadCustom() {
    const url = new URL('/api/admin/export', window.location.origin);
    url.searchParams.set('format', format);
    url.searchParams.set('columns', columns.join(','));
    for (const [k, v] of Object.entries(filters)) if (v) url.searchParams.set(k, v);
    window.location.href = url.toString();
  }

  function downloadRailway() {
    if (!bookletNo) return;
    const url = new URL('/api/admin/export/railway-report', window.location.origin);
    url.searchParams.set('booklet_no', bookletNo);
    url.searchParams.set('format', format);
    window.location.href = url.toString();
  }

  return (
    <Page title="Export" subtitle="CSV or XLSX. Railway report is one click.">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Railway report preset</div>
          <p style={{ marginTop: 0, color: 'var(--fg-muted)', fontSize: 13 }}>
            Every issued form for one booklet. This is the report the office submits.
          </p>
          <Label>Booklet number</Label>
          <div style={{ display: 'flex', gap: 6 }}>
            <Input value={bookletNo} onChange={(e) => setBookletNo(e.target.value)} placeholder="e.g. 2024-A-007" />
            <Button variant="primary" onClick={downloadRailway} disabled={!bookletNo}>Download</Button>
          </div>
        </Card>

        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Custom export</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <Label>Format</Label>
              <Select value={format} onChange={(e) => setFormat(e.target.value as any)}>
                <option value="xlsx">XLSX</option>
                <option value="csv">CSV</option>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filters.status} onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}>
                <option value="">All</option>
                <option value="issued">Issued</option>
                <option value="booked">Booked</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </Select>
            </div>
            <div>
              <Label>Station</Label>
              <Input value={filters.station} onChange={(e) => setFilters(f => ({ ...f, station: e.target.value }))} placeholder="e.g. Kalyan" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div><Label>From</Label><DatePicker value={filters.from} onChange={(v) => setFilters(f => ({ ...f, from: v }))} /></div>
              <div><Label>To</Label><DatePicker value={filters.to} onChange={(v) => setFilters(f => ({ ...f, to: v }))} /></div>
            </div>
          </div>

          <Label>Columns</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 14 }}>
            {ALL_COLUMNS.map(c => (
              <label key={c} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, padding: '2px 0' }}>
                <input type="checkbox" checked={columns.includes(c)} onChange={() => toggle(c)} />
                <span>{c}</span>
              </label>
            ))}
          </div>

          <Button variant="primary" onClick={downloadCustom} disabled={columns.length === 0}>Download</Button>
        </Card>
      </div>
    </Page>
  );
}
