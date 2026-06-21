'use client';
import { useEffect, useState } from 'react';
import { Page, Card, Button, Badge } from '@/components/ui';

type Req = {
  id: string;
  station_from: string;
  station_to: string;
  travel_class: string;
  period: string;
  reason: string;
  status: 'draft' | 'booked' | 'verified' | 'issued' | 'rejected';
  due_date: string | null;
  created_at: string;
};

const statusTone: Record<Req['status'], 'neutral' | 'ok' | 'warn' | 'danger'> = {
  draft: 'neutral',
  booked: 'warn',
  verified: 'warn',
  issued: 'ok',
  rejected: 'danger',
};

export default function MePage() {
  const [reqs, setReqs] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ home_station: string; address: string | null } | null>(null);

  useEffect(() => {
    fetch('/api/requests').then(r => r.json()).then((d) => {
      if (Array.isArray(d)) setReqs(d);
      setLoading(false);
    });
    fetch('/api/me').then(r => r.json()).then((p) => {
      if (p?.id) setMe({ home_station: p.home_station, address: p.address });
    });
  }, []);

  async function renew(id: string) {
    await fetch(`/api/requests/${id}/renew`, { method: 'POST' });
    window.location.href = '/book';
  }

  async function discard(id: string) {
    if (!confirm('Discard this draft? It hasn\'t been booked yet.')) return;
    const res = await fetch(`/api/requests/${id}`, { method: 'DELETE' });
    if (res.ok) setReqs(rs => rs.filter(r => r.id !== id));
  }

  function resume(id: string) {
    window.location.href = `/book?request=${id}`;
  }

  return (
    <Page
      title="My requests"
      subtitle="Form status, due dates, and renewals."
      action={<a href="/book"><Button variant="primary">New request</Button></a>}
    >
      {me && (
        <Card style={{ padding: 14, marginBottom: 12 }}>
          <div className="row-card">
            <div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 2 }}>Home station</div>
              <div style={{ fontWeight: 600 }}>
                {me.home_station || <span style={{ color: 'var(--fg-faint)', fontWeight: 400 }}>Not set</span>}
              </div>
            </div>
            <a href="/profile"><Button size="sm" variant="ghost">Change home station</Button></a>
          </div>
        </Card>
      )}
      {loading && <Card style={{ padding: 20, color: 'var(--fg-muted)' }}>Loading…</Card>}
      {!loading && reqs.length === 0 && (
        <Card style={{ padding: 24, color: 'var(--fg-muted)' }}>
          You have no requests yet. <a href="/book" style={{ color: 'var(--accent)' }}>Book one →</a>
        </Card>
      )}
      <div style={{ display: 'grid', gap: 10 }}>
        {reqs.map((r) => (
          <Card key={r.id} style={{ padding: 16 }}><div className="row-card">
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <strong>{r.station_from} → {r.station_to}</strong>
                <Badge tone={statusTone[r.status]}>{r.status}</Badge>
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                {cap(r.travel_class)} class · {cap(r.period)} · {r.reason}
                {r.due_date && ` · expires ${new Date(r.due_date).toLocaleDateString()}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {r.status === 'draft' && (
                <>
                  <Button size="sm" variant="primary" onClick={() => resume(r.id)}>Continue</Button>
                  <Button size="sm" variant="ghost" onClick={() => discard(r.id)}>Discard</Button>
                </>
              )}
              {r.status === 'issued' && (
                <Button size="sm" onClick={() => renew(r.id)}>Renew</Button>
              )}
            </div>
            </div>
          </Card>
        ))}
      </div>
    </Page>
  );
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
