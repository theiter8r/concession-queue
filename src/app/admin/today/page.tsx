'use client';
import { useEffect, useState } from 'react';
import { Page, Card, Button, Badge, Input, Label } from '@/components/ui';
import { embedUrl, mapsEnabled } from '@/lib/google-maps';

// /admin/today — OTP check-in + verify + issue form number (SPEC §7, §12).
// Returning students (an earlier form was issued) get a one-step
// "Verify & issue" and a summary of last time; their exact home location is
// withheld — the desk only sees the area. First visits show the map pin.

type R = any;

type Prev = {
  id: string;
  station_from: string;
  station_to: string;
  travel_class: string;
  period: string;
  reason: string;
  due_date: string | null;
  season_ticket_no: string | null;
  booklet_no: string | null;
  railway_form_no: string | null;
  issued_at: string;
};

type Ctx = {
  firstVisit: boolean;
  location:
    | { mode: 'full'; address: string | null; lat: number | null; lng: number | null; area: string | null }
    | { mode: 'area'; area: string | null };
  history: Prev[];
};

type FormNo = { booklet_no: string; railway_form_no: string };
const EMPTY_FORM: FormNo = { booklet_no: '', railway_form_no: '' };

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
  const [ctx, setCtx] = useState<Record<string, Ctx>>({});
  const [otp, setOtp] = useState<Record<string, string>>({});
  const [form, setForm] = useState<Record<string, FormNo>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [errs, setErrs] = useState<Record<string, string>>({});

  async function load() {
    const data = await fetch('/api/admin/requests?status=booked').then(r => r.json());
    const verified = await fetch('/api/admin/requests?status=verified').then(r => r.json());
    const all = [...(verified ?? []), ...(data ?? [])];
    setRows(all);
    const entries = await Promise.all(all.map(async (r: R) => {
      const c = await fetch(`/api/admin/requests/${r.id}/context`).then(x => x.ok ? x.json() : null).catch(() => null);
      return [r.id, c] as const;
    }));
    setCtx(Object.fromEntries(entries.filter(([, c]) => c)));
  }
  useEffect(() => { load(); }, []);

  async function post(id: string, action: 'verify' | 'issue', body: unknown) {
    const res = await fetch(`/api/admin/requests/${id}/${action}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const msg = res.ok ? '' : actionError(await res.json().catch(() => ({})));
    setErrs(e => ({ ...e, [id]: msg }));
    return res.ok;
  }

  async function verify(id: string) {
    setBusy(id);
    const ok = await post(id, 'verify', { otp: otp[id] });
    setBusy(null);
    if (ok) load();
  }

  async function issue(id: string) {
    setBusy(id);
    const ok = await post(id, 'issue', form[id]);
    setBusy(null);
    if (ok) load();
  }

  // Returning student: OTP check and form number in one go. If the issue step
  // fails the request is left 'verified' and the normal issue row takes over.
  async function verifyAndIssue(id: string) {
    setBusy(id);
    const ok = (await post(id, 'verify', { otp: otp[id] })) && (await post(id, 'issue', form[id]));
    setBusy(null);
    load();
    return ok;
  }

  function setFormField(id: string, k: keyof FormNo, v: string) {
    setForm(f => ({ ...f, [id]: { ...(f[id] ?? EMPTY_FORM), [k]: v } }));
  }

  return (
    <Page title="Today" subtitle="Verify OTP, then assign the form number.">
      <div style={{ display: 'grid', gap: 10 }}>
        {rows.length === 0 && <Card style={{ padding: 24, color: 'var(--fg-muted)' }}>Nobody is queued.</Card>}
        {rows.map((r: any) => {
          const u = r.users ?? {};
          const c = ctx[r.id];
          const last = c?.history[0];
          const isExpanded = expanded[r.id];
          const otpOk = (otp[r.id]?.length ?? 0) >= 6;
          const formOk = !!form[r.id]?.booklet_no && !!form[r.id]?.railway_form_no;
          return (
            <Card key={r.id} style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                    <strong>{u.name}</strong>
                    <span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>ENR {u.enrollment_no ?? '—'}</span>
                    <Badge tone={r.status === 'verified' ? 'warn' : 'neutral'}>{r.status}</Badge>
                    {c && <Badge tone={c.firstVisit ? 'warn' : 'ok'}>{c.firstVisit ? 'First visit' : 'Returning'}</Badge>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                    {r.station_from} → {r.station_to} · {r.travel_class} · {r.period}
                    {c?.location.area && <> · lives in {c.location.area}</>}
                  </div>
                  {last && <ChangesVsLast req={r} last={last} />}
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
                <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                  <div style={{
                    padding: 14,
                    background: 'var(--bg)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
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
                    <Detail label="Reason" value={r.reason} />
                    <Detail label="ID Verified" value={u.id_verified ? 'Yes' : 'No'} />
                    <Detail label="Created" value={r.created_at ? new Date(r.created_at).toLocaleString() : '—'} />
                  </div>
                  {c ? <LocationPanel loc={c.location} /> : <Muted>Loading location…</Muted>}
                  {c && c.history.length > 0 && <HistoryPanel history={c.history} />}
                </div>
              )}

              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
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
                      {!last && (
                        <Button onClick={() => verify(r.id)} disabled={busy === r.id || !otpOk}>
                          Verify
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                {(r.status === 'verified' || (r.status === 'booked' && last)) && (
                  <>
                    <div>
                      <Label>Booklet #</Label>
                      <Input
                        value={form[r.id]?.booklet_no ?? ''}
                        onChange={(e) => setFormField(r.id, 'booklet_no', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Form #</Label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Input
                          value={form[r.id]?.railway_form_no ?? ''}
                          onChange={(e) => setFormField(r.id, 'railway_form_no', e.target.value)}
                        />
                        {r.status === 'verified' ? (
                          <Button variant="primary" onClick={() => issue(r.id)} disabled={busy === r.id}>
                            Issue
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            onClick={() => verifyAndIssue(r.id)}
                            disabled={busy === r.id || !otpOk || !formOk}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            Verify &amp; issue
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
              {errs[r.id] && (
                <div role="alert" style={{ marginTop: 8, fontSize: 13, color: 'var(--danger)' }}>{errs[r.id]}</div>
              )}
            </Card>
          );
        })}
      </div>
    </Page>
  );
}

// One line under the header: what's different from the last issued form, so
// the desk can spot a route/class change without opening Details.
function ChangesVsLast({ req, last }: { req: R; last: Prev }) {
  const diffs: string[] = [];
  if (req.station_from !== last.station_from || req.station_to !== last.station_to) {
    diffs.push(`route was ${last.station_from} → ${last.station_to}`);
  }
  if (req.travel_class !== last.travel_class) diffs.push(`class was ${last.travel_class}`);
  if (req.period !== last.period) diffs.push(`period was ${last.period}`);
  const when = new Date(last.issued_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <div style={{ fontSize: 12, marginTop: 4, color: diffs.length ? 'var(--warn)' : 'var(--fg-faint)' }}>
      Last issued {when}
      {last.booklet_no && <> · booklet {last.booklet_no} / form {last.railway_form_no}</>}
      {diffs.length ? <> · {diffs.join(', ')}</> : <> · same route &amp; class</>}
    </div>
  );
}

function LocationPanel({ loc }: { loc: Ctx['location'] }) {
  if (loc.mode === 'area') {
    return (
      <Panel title="Home location">
        <div style={{ fontSize: 14 }}>{loc.area ?? '—'}</div>
        <Muted>Exact address is only shown on the student’s first visit.</Muted>
      </Panel>
    );
  }
  const pinned = loc.lat !== null && loc.lng !== null;
  return (
    <Panel title="Home location · first visit">
      <div style={{ fontSize: 14 }}>{loc.address ?? '—'}</div>
      {pinned && mapsEnabled ? (
        <iframe
          title="Student home location"
          src={embedUrl(loc.lat!, loc.lng!)}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          style={{ width: '100%', height: 240, border: 0, borderRadius: 'var(--radius-sm)', marginTop: 8 }}
        />
      ) : (
        <Muted>{pinned ? 'Map unavailable — Google Maps key not set.' : 'Student typed this address; no map pin.'}</Muted>
      )}
    </Panel>
  );
}

function HistoryPanel({ history }: { history: Prev[] }) {
  return (
    <Panel title="Previous forms">
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Issued', 'Route', 'Class · Period', 'Booklet / Form', 'Season ticket', 'Valid until'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '6px 10px 6px 0', fontWeight: 500, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map(h => (
              <tr key={h.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={cell}>{new Date(h.issued_at).toLocaleDateString('en-GB')}</td>
                <td style={cell}>{h.station_from} → {h.station_to}</td>
                <td style={cell}>{h.travel_class} · {h.period}</td>
                <td style={cell}>{h.booklet_no ? `${h.booklet_no} / ${h.railway_form_no}` : '—'}</td>
                <td style={{ ...cell, fontVariantNumeric: 'tabular-nums' }}>{h.season_ticket_no ?? '—'}</td>
                <td style={cell}>{h.due_date ? new Date(h.due_date).toLocaleDateString('en-GB') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 14, background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
      <Label>{title}</Label>
      {children}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>{children}</div>;
}

const cell: React.CSSProperties = { padding: '8px 10px 8px 0', whiteSpace: 'nowrap' };

function actionError(j: { error?: string }): string {
  switch (j.error) {
    case 'otp_mismatch': return 'Wrong code. Ask the student to check My requests or their booking email.';
    case 'no_active_appointment': return 'This student has no active appointment.';
    case 'missing_fields': return 'Enter both the booklet and form number.';
    case undefined: return 'Something went wrong. Try again.';
    default: return j.error;
  }
}
