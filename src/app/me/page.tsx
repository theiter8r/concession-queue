'use client';
import { useEffect, useState } from 'react';
import { Page, Card, Button, Badge, Input } from '@/components/ui';

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
  season_ticket_no: string | null;
  appointment: { id: string; status: string; slot_start: string | null } | null;
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
  const [me, setMe] = useState<{ name: string; home_station: string; address: string | null } | null>(null);

  useEffect(() => {
    fetch('/api/requests').then(r => r.json()).then((d) => {
      if (Array.isArray(d)) setReqs(d);
      setLoading(false);
    });
    fetch('/api/me').then(r => r.json()).then((p) => {
      if (p?.id) setMe({ name: p.name, home_station: p.home_station, address: p.address });
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

  async function cancelAppt(req: Req) {
    if (!req.appointment) return;
    const when = req.appointment.slot_start
      ? new Date(req.appointment.slot_start).toLocaleString('en-IN', {
          weekday: 'short', day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit',
        })
      : 'this slot';
    if (!confirm(`Cancel your appointment for ${when}? The slot will open up for someone else.`)) return;
    const res = await fetch(`/api/appointments/${req.appointment.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(`Could not cancel: ${j.error ?? res.status}`);
      return;
    }
    // Reload — the request goes back to 'draft' on the server.
    const fresh = await fetch('/api/requests').then(r => r.json());
    if (Array.isArray(fresh)) setReqs(fresh);
  }

  function resume(id: string) {
    window.location.href = `/book?request=${id}`;
  }

  // Latest issued request → the active pass card.
  const latestIssued = reqs.find(r => r.status === 'issued');
  const otherRequests = reqs.filter(r => r !== latestIssued);

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

      {latestIssued && me && (
        <PassCard req={latestIssued} name={me.name} onRenew={() => renew(latestIssued.id)} onSaved={(no) => {
          setReqs(rs => rs.map(r => r.id === latestIssued.id ? { ...r, season_ticket_no: no } : r));
        }} />
      )}

      {loading && <Card style={{ padding: 20, color: 'var(--fg-muted)' }}>Loading…</Card>}
      {!loading && reqs.length === 0 && (
        <Card style={{ padding: 24, color: 'var(--fg-muted)' }}>
          You have no requests yet. <a href="/book" style={{ color: 'var(--accent)' }}>Book one →</a>
        </Card>
      )}
      <div style={{ display: 'grid', gap: 10 }}>
        {otherRequests.map((r) => (
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
              {r.appointment?.slot_start && (r.status === 'booked' || r.status === 'verified') && (
                <div style={{
                  marginTop: 8, fontSize: 13, fontWeight: 500,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                  background: 'color-mix(in oklab, var(--accent) 8%, transparent)',
                  color: 'var(--accent)',
                  border: '1px solid color-mix(in oklab, var(--accent) 24%, transparent)',
                }}>
                  Appointment · {formatSlot(r.appointment.slot_start)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {r.status === 'draft' && (
                <>
                  <Button size="sm" variant="primary" onClick={() => resume(r.id)}>Continue</Button>
                  <Button size="sm" variant="ghost" onClick={() => discard(r.id)}>Discard</Button>
                </>
              )}
              {(r.status === 'booked' || r.status === 'verified') && r.appointment && (
                <Button size="sm" variant="ghost" onClick={() => cancelAppt(r)}>Cancel appointment</Button>
              )}
              {r.status === 'issued' && (
                <>
                  {/* Print feature disabled for now.
                  <a href={`/requests/${r.id}/print`} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="ghost">Print</Button>
                  </a>
                  */}
                  <Button size="sm" onClick={() => renew(r.id)}>Renew</Button>
                </>
              )}
            </div>
            </div>
          </Card>
        ))}
      </div>
    </Page>
  );
}

// Physical-railway-ticket styled card for the latest issued request.
function PassCard({ req, name, onRenew, onSaved }: {
  req: Req;
  name: string;
  onRenew: () => void;
  onSaved: (no: string) => void;
}) {
  const [no, setNo] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const expired = !!req.due_date && new Date(req.due_date) < new Date(new Date().toDateString());

  async function save() {
    if (!no.trim()) return;
    setBusy(true); setErr(null);
    const res = await fetch(`/api/requests/${req.id}/season-ticket`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ season_ticket_no: no.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? 'failed');
      return;
    }
    onSaved(no.trim());
  }

  return (
    <div className="pass-wrap" style={{ marginBottom: 18 }}>
      <div className="pass" data-expired={expired ? '1' : '0'}>
        <div className="pass-perf" aria-hidden />

        <div className="pass-left">
          <div className="pass-eyebrow">Season Ticket</div>
          <div className="pass-route">
            <span>{req.station_from}</span>
            <span className="pass-arrow">→</span>
            <span>{req.station_to}</span>
          </div>
          <div className="pass-meta">
            <span>{cap(req.travel_class)} class</span>
            <span className="dot">·</span>
            <span>{cap(req.period)}</span>
          </div>
          <div className="pass-name">{name}</div>

          {req.season_ticket_no ? (
            <div className="pass-no">
              <span className="pass-no-label">No.</span>
              <span className="pass-no-val">{req.season_ticket_no}</span>
            </div>
          ) : (
            <div className="pass-input">
              <div className="pass-no-label" style={{ marginBottom: 4 }}>Add season ticket number</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Input
                  value={no}
                  onChange={(e) => setNo(e.target.value)}
                  placeholder="e.g. WR/MTH/4421"
                  style={{ flex: 1 }}
                />
                <Button size="sm" variant="primary" onClick={save} disabled={busy || !no.trim()}>
                  {busy ? '…' : 'Save'}
                </Button>
              </div>
              {err && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--danger)' }}>{err}</div>}
            </div>
          )}
        </div>

        <div className="pass-right">
          <div className="pass-eyebrow">{expired ? 'Expired' : 'Valid until'}</div>
          <div className="pass-date">
            {req.due_date
              ? new Date(req.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : '—'}
          </div>
          {expired && (
            <Button size="sm" variant="primary" onClick={onRenew} style={{ marginTop: 12 }}>
              Renew now
            </Button>
          )}
          {!expired && req.due_date && (
            <div className="pass-stamp">VALID</div>
          )}
          {/* Print feature disabled for now.
          <a href={`/requests/${req.id}/print`} target="_blank" rel="noreferrer" style={{ marginTop: 10, display: 'inline-block' }}>
            <Button size="sm" variant="ghost">Print form</Button>
          </a>
          */}
        </div>
      </div>

      <style jsx>{`
        .pass {
          position: relative;
          display: grid;
          grid-template-columns: 1fr;
          background: linear-gradient(135deg,
            color-mix(in oklab, var(--accent) 6%, var(--bg-elevated)),
            var(--bg-elevated));
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 22px 22px 22px 22px;
          box-shadow: 0 12px 28px -16px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.04);
          overflow: hidden;
        }
        @media (min-width: 560px) {
          .pass {
            grid-template-columns: 1fr auto;
            gap: 28px;
            padding: 26px 28px;
          }
        }
        .pass[data-expired="1"] {
          background: linear-gradient(135deg,
            color-mix(in oklab, var(--danger) 7%, var(--bg-elevated)),
            var(--bg-elevated));
          border-color: color-mix(in oklab, var(--danger) 30%, var(--border));
        }
        .pass::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--fg) 6%, transparent) 1px, transparent 0);
          background-size: 16px 16px;
          opacity: 0.5;
          pointer-events: none;
        }
        .pass-perf {
          position: absolute;
          top: 50%;
          left: -8px;
          right: -8px;
          height: 1px;
          border-top: 1px dashed color-mix(in oklab, var(--fg) 20%, transparent);
          display: none;
        }
        @media (min-width: 560px) {
          .pass-perf {
            top: -8px;
            bottom: -8px;
            left: auto;
            right: auto;
            width: 1px;
            height: auto;
            border-top: none;
            border-left: 1px dashed color-mix(in oklab, var(--fg) 20%, transparent);
            display: block;
            left: calc(100% - 180px);
          }
        }
        .pass-left, .pass-right { position: relative; z-index: 1; }
        .pass-eyebrow {
          font-size: 10px; font-weight: 600; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--fg-faint);
          margin-bottom: 8px;
        }
        .pass-route {
          display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
          font-size: clamp(20px, 4.4vw, 26px);
          font-weight: 600; letter-spacing: -0.4px;
          margin-bottom: 6px;
        }
        .pass-arrow { color: var(--fg-muted); font-weight: 400; }
        .pass-meta {
          display: flex; gap: 8px; align-items: center;
          color: var(--fg-muted); font-size: 13px;
          margin-bottom: 14px;
        }
        .pass-meta .dot { color: var(--fg-faint); }
        .pass-name {
          font-size: 14px; font-weight: 500;
          padding-bottom: 12px;
          border-bottom: 1px dashed color-mix(in oklab, var(--fg) 14%, transparent);
          margin-bottom: 12px;
        }
        .pass-no {
          display: flex; align-items: baseline; gap: 8px;
          font-variant-numeric: tabular-nums;
        }
        .pass-no-label {
          font-size: 11px; color: var(--fg-faint);
          text-transform: uppercase; letter-spacing: 0.1em;
        }
        .pass-no-val {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 17px; font-weight: 600; letter-spacing: 1px;
        }
        .pass-input { margin-top: 6px; }
        .pass-right {
          text-align: left;
          padding-top: 16px;
          margin-top: 14px;
          border-top: 1px dashed color-mix(in oklab, var(--fg) 14%, transparent);
        }
        @media (min-width: 560px) {
          .pass-right {
            text-align: right;
            padding-top: 0; margin-top: 0;
            border-top: none;
            min-width: 150px;
          }
        }
        .pass-date {
          font-size: 18px; font-weight: 600; letter-spacing: -0.3px;
          font-variant-numeric: tabular-nums;
        }
        .pass-stamp {
          margin-top: 14px;
          display: inline-block;
          padding: 4px 10px;
          border: 2px solid color-mix(in oklab, var(--ok) 60%, transparent);
          color: var(--ok);
          border-radius: 4px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.2em;
          transform: rotate(-4deg);
        }
      `}</style>
    </div>
  );
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function formatSlot(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}
