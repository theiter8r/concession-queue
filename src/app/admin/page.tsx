'use client';
import { useEffect, useState } from 'react';
import { Page, Card, Button, Badge, Select } from '@/components/ui';

type R = any;

export default function AdminDash() {
  const [rows, setRows] = useState<R[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const url = new URL('/api/admin/requests', window.location.origin);
    if (status) url.searchParams.set('status', status);
    const data = await fetch(url.toString()).then(r => r.json());
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const tone: Record<string, any> = { issued: 'ok', booked: 'warn', verified: 'warn', rejected: 'danger', draft: 'neutral' };

  return (
    <Page
      title="Admin"
      subtitle="Concession queue."
      action={
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/admin/today"><Button variant="primary">Today</Button></a>
          <a href="/admin/settings"><Button>Settings</Button></a>
          <a href="/admin/export"><Button>Export</Button></a>
        </div>
      }
    >
      <Card style={{ padding: 14, marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Status</span>
        <div style={{ width: 200 }}>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="booked">Booked</option>
            <option value="verified">Verified</option>
            <option value="issued">Issued</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>
      </Card>

      {loading ? (
        <Card style={{ padding: 20, color: 'var(--fg-muted)' }}>Loading…</Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: 'var(--bg)' }}>
              <tr>
                {['Student','ENR','Route','Class · Period','Status','Created'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={td}>{r.users?.name}</td>
                  <td style={{ ...td, color: 'var(--fg-muted)' }}>{r.users?.enrollment_no ?? '—'}</td>
                  <td style={td}>{r.station_from} → {r.station_to}</td>
                  <td style={{ ...td, color: 'var(--fg-muted)' }}>{r.travel_class} · {r.period}</td>
                  <td style={td}><Badge tone={tone[r.status] ?? 'neutral'}>{r.status}</Badge></td>
                  <td style={{ ...td, color: 'var(--fg-muted)' }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} style={{ ...td, color: 'var(--fg-muted)', textAlign: 'center', padding: 24 }}>
                  No requests.
                </td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </Page>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '10px 14px', fontWeight: 500, color: 'var(--fg-muted)' };
const td: React.CSSProperties = { padding: '12px 14px' };
