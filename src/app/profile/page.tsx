'use client';
import { useEffect, useState } from 'react';
import { Page, Card, Button, Input, Label, Select } from '@/components/ui';
import { StationSelect } from '@/components/station-select';
import { Onboarding } from '@/components/onboarding';

type Profile = {
  id: string;
  name: string;
  dob: string;
  gender: 'male' | 'female' | 'other';
  phone: string | null;
  enrollment_no: string;
  college_email: string;
  home_station: string;
  address: string | null;
  department: string | null;
  academic_year: string | null;
  division: string | null;
  role: string;
};

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

export default function ProfilePage() {
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [reqs, setReqs] = useState<Req[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/me').then(r => r.json()),
      fetch('/api/requests').then(r => r.json()),
    ]).then(([p, r]) => {
      if (!p?.id) { window.location.href = '/signup'; return; }
      setMe(p);
      if (Array.isArray(r)) setReqs(r);
      setLoaded(true);
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setBusy(true); setErr(null);
    const res = await fetch('/api/me', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: me.name,
        dob: me.dob,
        gender: me.gender,
        phone: me.phone ?? '',
        enrollment_no: me.enrollment_no,
        home_station: me.home_station,
        address: me.address ?? '',
        department: me.department ?? '',
        academic_year: me.academic_year ?? '',
        division: me.division ?? '',
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? 'failed');
      return;
    }
    setEditing(false);
  }

  async function renew(id: string) {
    await fetch(`/api/requests/${id}/renew`, { method: 'POST' });
    window.location.href = '/book';
  }

  if (!loaded) {
    return (
      <Page title="My profile">
        <Card style={{ padding: 30, color: 'var(--fg-muted)', textAlign: 'center' }}>Loading…</Card>
      </Page>
    );
  }

  if (!me) return null;

  const latestIssued = reqs.find(r => r.status === 'issued');

  if (editing) {
    return (
      <Page title="Edit profile" subtitle="Your details are printed on every concession form.">
        <Card style={{ padding: 22 }}>
          <form onSubmit={save} style={{ display: 'grid', gap: 14 }}>
            <div>
              <Label>Full name</Label>
              <Input
                required
                autoFocus
                value={me.name}
                onChange={(e) => setMe({ ...me, name: e.target.value })}
                placeholder="Riya Sharma"
              />
            </div>
            <div>
              <Label>Home station</Label>
              <StationSelect
                required
                value={me.home_station}
                onChange={(v) => setMe({ ...me, home_station: v })}
              />
            </div>
            <div>
              <Label>Residential address</Label>
              <Input
                placeholder="Street, area, PIN"
                value={me.address ?? ''}
                onChange={(e) => setMe({ ...me, address: e.target.value })}
              />
            </div>
            <div>
              <Label>Department</Label>
              <Input
                placeholder="e.g. Computer Engineering"
                value={me.department ?? ''}
                onChange={(e) => setMe({ ...me, department: e.target.value })}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <Label>Year</Label>
                <Select
                  value={me.academic_year ?? ''}
                  onChange={(e) => setMe({ ...me, academic_year: e.target.value })}
                >
                  <option value="">Select year</option>
                  <option value="FE">FE</option>
                  <option value="SE">SE</option>
                  <option value="TE">TE</option>
                  <option value="BE">BE</option>
                </Select>
              </div>
              <div>
                <Label>Division</Label>
                <Input
                  placeholder="e.g. A"
                  maxLength={4}
                  value={me.division ?? ''}
                  onChange={(e) => setMe({ ...me, division: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            {err && (
              <div style={{
                fontSize: 13, padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                background: 'color-mix(in oklab, var(--danger) 8%, transparent)',
                color: 'var(--danger)',
                border: '1px solid color-mix(in oklab, var(--danger) 25%, transparent)',
              }}>{err}</div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={busy}>
                {busy ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        </Card>
      </Page>
    );
  }

  return (
    <>
      <Page
        title="My profile"
        action={<a href="/book"><Button variant="primary">New request</Button></a>}
      >
        <div className="profile-card">
          <div className="profile-cover" />

          <div className="profile-head">
          <div className="profile-pfp-wrap">
            <div className="profile-pfp profile-pfp-fallback">
              {me.name.charAt(0).toUpperCase()}
            </div>
          </div>
            <div className="profile-head-info">
              <h2 className="profile-name">{me.name}</h2>
              <div className="profile-meta">
                <span>{me.enrollment_no}</span>
                <span className="dot">·</span>
                <span>{me.college_email}</span>
              </div>
            </div>
          </div>

          <div className="profile-body">
            <div className="profile-section">
              <div className="profile-section-title">Academic</div>
              <div className="profile-grid">
                <ProfileField label="Department" value={me.department} />
                <ProfileField label="Year" value={me.academic_year} />
                <ProfileField label="Division" value={me.division} />
              </div>
            </div>

            <div className="profile-section">
              <div className="profile-section-title">Personal</div>
              <div className="profile-grid">
                <ProfileField label="Date of birth" value={me.dob} />
                <ProfileField label="Gender" value={me.gender ? me.gender.charAt(0).toUpperCase() + me.gender.slice(1) : null} />
                {me.phone && <ProfileField label="Phone" value={me.phone} />}
              </div>
            </div>

            <div className="profile-section">
              <div className="profile-section-title">Concession route</div>
              <div className="profile-grid">
                <ProfileField label="Home station" value={me.home_station} />
                <ProfileField label="Residential address" value={me.address} />
              </div>
            </div>
          </div>

          <div className="profile-actions">
            <Button variant="primary" onClick={() => setEditing(true)}>Edit profile</Button>
          </div>
        </div>

        {latestIssued && (
          <div style={{ marginTop: 18 }}>
            <PassCard req={latestIssued} name={me.name} onRenew={() => renew(latestIssued.id)} onSaved={(no) => {
              setReqs(rs => rs.map(r => r.id === latestIssued.id ? { ...r, season_ticket_no: no } : r));
            }} />
          </div>
        )}

        {!latestIssued && (
          <Card style={{ padding: 18, marginTop: 18 }}>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
              <span>No active pass yet.</span>
              <a href="/book"><Button size="sm" variant="primary">Book one</Button></a>
            </div>
          </Card>
        )}

        <style jsx>{`
          .profile-card {
            background: var(--bg-elevated);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            overflow: hidden;
            box-shadow: var(--shadow-sm);
          }
          .profile-cover {
            height: 80px;
            background: linear-gradient(135deg,
              color-mix(in oklab, var(--accent) 8%, transparent),
              color-mix(in oklab, var(--accent) 3%, transparent)
            );
            border-bottom: 1px solid var(--border);
          }
          @media (min-width: 560px) {
            .profile-cover { height: 100px; }
          }
          .profile-head {
            display: flex;
            align-items: flex-end;
            gap: 16px;
            padding: 0 20px;
            margin-top: -36px;
          }
          @media (min-width: 560px) {
            .profile-head { margin-top: -44px; padding: 0 24px; gap: 20px; }
          }
          .profile-pfp-wrap {
            flex-shrink: 0;
            border-radius: 999px;
            padding: 3px;
            background: var(--bg-elevated);
            box-shadow: 0 0 0 1px var(--border);
          }
          .profile-pfp {
            display: block;
            width: 66px; height: 66px;
            border-radius: 999px;
            object-fit: cover;
          }
          @media (min-width: 560px) {
            .profile-pfp { width: 80px; height: 80px; }
          }
          .profile-pfp-fallback {
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--accent);
            color: var(--accent-fg);
            font-size: 24px;
            font-weight: 600;
          }
          @media (min-width: 560px) {
            .profile-pfp-fallback { font-size: 28px; }
          }
          .profile-head-info {
            padding-bottom: 10px;
            min-width: 0;
          }
          .profile-name {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            letter-spacing: -0.3px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          @media (min-width: 560px) {
            .profile-name { font-size: 24px; }
          }
          .profile-meta {
            display: flex;
            gap: 6px;
            align-items: center;
            flex-wrap: wrap;
            font-size: 13px;
            color: var(--fg-muted);
            margin-top: 2px;
          }
          .profile-meta .dot { color: var(--fg-faint); }
          .profile-body {
            padding: 20px;
            display: grid;
            gap: 18px;
          }
          @media (min-width: 560px) {
            .profile-body { padding: 24px; gap: 22px; }
          }
          .profile-section-title {
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--fg-faint);
            margin-bottom: 10px;
          }
          .profile-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px 16px;
          }
          @media (min-width: 400px) {
            .profile-grid { grid-template-columns: 1fr 1fr; }
          }
          .profile-actions {
            padding: 0 20px 20px;
            display: flex;
            justify-content: flex-end;
          }
          @media (min-width: 560px) {
            .profile-actions { padding: 0 24px 24px; }
          }
        `}</style>
      </Page>
      <Onboarding />
    </>
  );
}

function ProfileField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginBottom: 2, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {value || <span style={{ color: 'var(--fg-faint)', fontWeight: 400 }}>—</span>}
      </div>
    </div>
  );
}

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
    <div className="pass-wrap">
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
        </div>
      </div>

      <style jsx>{`
        .pass-wrap { margin-bottom: 0; }
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
