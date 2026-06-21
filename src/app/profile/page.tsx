'use client';
import { useEffect, useState } from 'react';
import { Page, Card, Button, Input, Label, Select } from '@/components/ui';
import { StationSelect } from '@/components/station-select';

// /profile — quick edit for the fields that change between concession passes:
// home station + residential address. Everything else (DOB, name, gender,
// enrollment) is set at signup and rarely changes.
// On save, jumps to /book with ?fresh=1 so a new request is started for the
// new station.

export default function ProfilePage() {
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then((p) => {
      if (!p?.id) { window.location.href = '/signup'; return; }
      setMe(p);
      setLoaded(true);
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const res = await fetch('/api/me', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        // Send the whole profile back — POST is an upsert that requires all
        // required fields, so include the ones we aren't editing too.
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
    window.location.href = '/book?fresh=1';
  }

  if (!loaded) {
    return (
      <Page title="Change home station" subtitle="Updating your route…">
        <Card style={{ padding: 22, color: 'var(--fg-muted)' }}>Loading…</Card>
      </Page>
    );
  }

  return (
    <Page
      title="Change home station"
      subtitle="Update your route, then pick a new slot for the updated concession."
    >
      <Card style={{ padding: 22 }}>
        <form onSubmit={save} style={{ display: 'grid', gap: 14 }}>
          <div>
            <Label>Home station</Label>
            <StationSelect
              required
              autoFocus
              value={me.home_station ?? ''}
              onChange={(v) => setMe((m: any) => ({ ...m, home_station: v }))}
            />
          </div>
          <div>
            <Label>Residential address</Label>
            <Input
              placeholder="Street, area, PIN"
              value={me.address ?? ''}
              onChange={(e) => setMe((m: any) => ({ ...m, address: e.target.value }))}
            />
          </div>
          <div>
            <Label>Department</Label>
            <Input
              placeholder="e.g. Computer Engineering"
              value={me.department ?? ''}
              onChange={(e) => setMe((m: any) => ({ ...m, department: e.target.value }))}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <Label>Year</Label>
              <Select
                value={me.academic_year ?? ''}
                onChange={(e) => setMe((m: any) => ({ ...m, academic_year: e.target.value }))}
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
                onChange={(e) => setMe((m: any) => ({ ...m, division: e.target.value.toUpperCase() }))}
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
            <a href="/me"><Button type="button" variant="ghost">Cancel</Button></a>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save & book new pass'}
            </Button>
          </div>
        </form>
      </Card>
    </Page>
  );
}
