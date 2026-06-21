'use client';
import { useEffect, useState } from 'react';
import { Page, Card, Button, Badge, Input, Label } from '@/components/ui';

// /admin/today — OTP check-in + verify + issue form number (SPEC §7, §12).

type R = any;

export default function TodayPage() {
  const [rows, setRows] = useState<R[]>([]);
  const [otp, setOtp] = useState<Record<string, string>>({});
  const [form, setForm] = useState<Record<string, { booklet_no: string; railway_form_no: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const data = await fetch('/api/admin/requests?status=booked').then(r => r.json());
    const verified = await fetch('/api/admin/requests?status=verified').then(r => r.json());
    setRows([...(verified ?? []), ...(data ?? [])]);
  }
  useEffect(() => { load(); }, []);

  async function verify(id: string) {
    setBusy(id);
    const res = await fetch(`/api/admin/requests/${id}/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ otp: otp[id] }),
    });
    setBusy(null);
    if (res.ok) load();
  }

  async function issue(id: string) {
    setBusy(id);
    const res = await fetch(`/api/admin/requests/${id}/issue`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form[id]),
    });
    setBusy(null);
    if (res.ok) load();
  }

  return (
    <Page title="Today" subtitle="Verify OTP, then assign the form number.">
      <div style={{ display: 'grid', gap: 10 }}>
        {rows.length === 0 && <Card style={{ padding: 24, color: 'var(--fg-muted)' }}>Nobody is queued.</Card>}
        {rows.map((r: any) => (
          <Card key={r.id} style={{ padding: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'start', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <strong>{r.users?.name}</strong>
                  <span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>ENR {r.users?.enrollment_no ?? '—'}</span>
                  <Badge tone={r.status === 'verified' ? 'warn' : 'neutral'}>{r.status}</Badge>
                </div>
                <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                  {r.station_from} → {r.station_to} · {r.travel_class} · {r.period}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {r.status === 'booked' && (
                <div>
                  <Label>OTP</Label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Input
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                      value={otp[r.id] ?? ''}
                      onChange={(e) => setOtp(o => ({ ...o, [r.id]: e.target.value.replace(/\D/g, '') }))}
                      style={{ letterSpacing: 3, fontVariantNumeric: 'tabular-nums' }}
                    />
                    <Button onClick={() => verify(r.id)} disabled={busy === r.id || (otp[r.id]?.length ?? 0) < 6}>
                      Verify
                    </Button>
                  </div>
                </div>
              )}
              {r.status === 'verified' && (
                <>
                  <div>
                    <Label>Booklet #</Label>
                    <Input
                      value={form[r.id]?.booklet_no ?? ''}
                      onChange={(e) => setForm(f => ({ ...f, [r.id]: { ...(f[r.id] ?? { booklet_no: '', railway_form_no: '' }), booklet_no: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <Label>Form #</Label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Input
                        value={form[r.id]?.railway_form_no ?? ''}
                        onChange={(e) => setForm(f => ({ ...f, [r.id]: { ...(f[r.id] ?? { booklet_no: '', railway_form_no: '' }), railway_form_no: e.target.value } }))}
                      />
                      <Button variant="primary" onClick={() => issue(r.id)} disabled={busy === r.id}>
                        Issue
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
    </Page>
  );
}
