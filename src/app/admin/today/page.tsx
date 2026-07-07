'use client';
import { useEffect, useState } from 'react';
import { Page, Card, Button, Badge, Input, Label } from '@/components/ui';

// /admin/today — OTP check-in + verify + issue form number (SPEC §7, §12).

type R = any;

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <Label>{label}</Label>
      <span style={{ fontSize: 14 }}>{value || '—'}</span>
    </div>
  );
}

export default function TodayPage() {
  const [rows, setRows] = useState<R[]>([]);
  const [otp, setOtp] = useState<Record<string, string>>({});
  const [form, setForm] = useState<Record<string, { booklet_no: string; railway_form_no: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
        {rows.map((r: any) => {
          const u = r.users ?? {};
          const isExpanded = expanded[r.id];
          return (
            <Card key={r.id} style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <strong>{u.name}</strong>
                    <span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>ENR {u.enrollment_no ?? '—'}</span>
                    <Badge tone={r.status === 'verified' ? 'warn' : 'neutral'}>{r.status}</Badge>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                    {r.station_from} → {r.station_to} · {r.travel_class} · {r.period}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(e => ({ ...e, [r.id]: !e[r.id] }))}
                >
                  {isExpanded ? 'Hide' : 'Details'}
                </Button>
              </div>

              {isExpanded && (
                <div style={{
                  marginTop: 14,
                  padding: 14,
                  background: 'var(--bg)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '12px 20px',
                  fontSize: 13,
                }}>
                  <Detail label="Email" value={u.college_email} />
                  <Detail label="Phone" value={u.phone} />
                  <Detail label="Department" value={u.department} />
                  <Detail label="Academic Year" value={u.academic_year} />
                  <Detail label="Division" value={u.division} />
                  <Detail label="Home Station" value={u.home_station} />
                  <Detail label="DOB" value={u.dob} />
                  <Detail label="Gender" value={u.gender} />
                  <Detail label="Address" value={u.address} />
                  <Detail label="Reason" value={r.reason} />
                  <Detail label="ID Verified" value={u.id_verified ? 'Yes' : 'No'} />
                  <Detail label="Created" value={r.created_at ? new Date(r.created_at).toLocaleString() : '—'} />
                </div>
              )}

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
          );
        })}
      </div>
    </Page>
  );
}
