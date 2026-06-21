'use client';
import { useEffect, useMemo, useState } from 'react';
import { Page, Card, Button, Select, Label, Input } from '@/components/ui';
import { MonthCalendar } from '@/components/calendar';
import { SlotList, type Slot } from '@/components/slot-list';

// /book — Cal.com-style booking (SPEC §8b).
// Left: month picker. Right: time slots for the chosen date. station_to locked to Thane.

export default function BookPage() {
  const [requestId, setRequestId] = useState<string | null>(null);
  const [requestDraft, setRequestDraft] = useState({
    station_from: '',
    travel_class: 'second',
    period: 'monthly',
    reason: 'new',
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const [pendingSlot, setPendingSlot] = useState<Slot | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [stPrompt, setStPrompt] = useState<{ request_id: string; route: string } | null>(null);
  const [stNo, setStNo] = useState('');
  const [stBusy, setStBusy] = useState(false);
  const [stDismissed, setStDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/slots').then(r => r.json()).then((data) => {
      if (Array.isArray(data)) setSlots(data);
    });

    // Surface the season-ticket capture prompt only when the server says so —
    // once per month, only if a prior issued request is still missing the no.
    fetch('/api/season-ticket/prompt').then(r => r.json()).then((p) => {
      if (p?.request_id) setStPrompt({ request_id: p.request_id, route: p.route });
    });

    const params = new URLSearchParams(window.location.search);
    const rid = params.get('request');
    const fresh = params.get('fresh') === '1';

    // Resume an existing draft when /book?request=<id> (skipped if fresh=1).
    if (rid && !fresh) {
      fetch(`/api/requests/${rid}`).then(r => r.json()).then((req) => {
        if (req && !req.error) {
          setRequestId(req.id);
          setRequestDraft({
            station_from: req.station_from ?? '',
            travel_class: req.travel_class ?? 'second',
            period: req.period ?? 'monthly',
            reason: req.reason ?? 'new',
          });
        }
      });
      return;
    }

    // Otherwise default station_from to the user's saved home station.
    fetch('/api/me').then(r => r.json()).then((p) => {
      if (p?.home_station) {
        setRequestDraft(d => d.station_from ? d : { ...d, station_from: p.home_station });
      }
    });
  }, []);

  const availableDays = useMemo(() => {
    const s = new Set<string>();
    for (const slot of slots) s.add(dayKey(new Date(slot.slot_start)));
    return s;
  }, [slots]);

  const dayHasSlots = (d: Date) => availableDays.has(dayKey(d));

  const slotsForDay = useMemo(() => {
    if (!selectedDate) return [];
    const k = dayKey(selectedDate);
    return slots.filter(s => dayKey(new Date(s.slot_start)) === k);
  }, [slots, selectedDate]);

  async function createDraft(): Promise<string | null> {
    if (requestId) return requestId;
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...requestDraft, station_to: 'Thane' }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(prettyError(j.error) ?? 'Could not create request.');
      return null;
    }
    const r = await res.json();
    setRequestId(r.id);
    return r.id;
  }

  function pick(slot: Slot) {
    setErr(null);
    if (!requestDraft.station_from.trim()) {
      setErr('Set your home station in your profile first.');
      return;
    }
    setPendingSlot(slot);
  }

  async function confirmBooking() {
    if (!pendingSlot) return;
    setErr(null);
    setPicking(pendingSlot.id);
    const rid = await createDraft();
    if (!rid) { setPicking(null); return; }
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slot_id: pendingSlot.id, request_id: rid }),
    });
    if (res.status === 409) {
      setErr('That slot just filled up — pick another.');
      const fresh = await fetch('/api/slots').then(r => r.json());
      setSlots(fresh);
      setPicking(null);
      setPendingSlot(null);
      return;
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(prettyError(j.error) ?? 'Booking failed.');
      setPicking(null);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <Page title="Booked" subtitle="Check your email for the check-in OTP.">
        <Card style={{ padding: 24 }}>
          <p style={{ margin: 0, color: 'var(--fg-muted)' }}>
            Bring your college ID. Show the OTP at the counter.
          </p>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <a href="/me"><Button variant="primary">View my appointment</Button></a>
            <a href="/slots"><Button>Live slots</Button></a>
          </div>
        </Card>
      </Page>
    );
  }

  async function saveSeasonTicket() {
    if (!stPrompt || !stNo.trim()) return;
    setStBusy(true);
    const res = await fetch(`/api/requests/${stPrompt.request_id}/season-ticket`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ season_ticket_no: stNo.trim() }),
    });
    setStBusy(false);
    if (res.ok) setStPrompt(null);
  }

  return (
    <Page
      title="Book an appointment"
      subtitle="Route is home → Thane. Pick a date, then a time."
    >
      {stPrompt && !stDismissed && (
        <Card style={{ padding: 18, marginBottom: 12, borderColor: 'color-mix(in oklab, var(--accent) 30%, var(--border))' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            Quick — got your season ticket number yet?
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 12 }}>
            You picked up a form for <strong>{stPrompt.route}</strong>. Add the number
            the railway gave you so the college register has it.
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Input
              value={stNo}
              onChange={(e) => setStNo(e.target.value)}
              placeholder="e.g. WR/MTH/4421"
              style={{ flex: '1 1 200px' }}
            />
            <Button variant="primary" onClick={saveSeasonTicket} disabled={stBusy || !stNo.trim()}>
              {stBusy ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="ghost" onClick={() => setStDismissed(true)}>I&apos;ll add it later</Button>
          </div>
        </Card>
      )}

      <Card style={{ padding: 20, marginBottom: 16 }}>
        <div className="row-form-4">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Label>Home station</Label>
              <a href="/profile" style={{ fontSize: 11, color: 'var(--fg-muted)', textDecoration: 'underline' }}>
                Change
              </a>
            </div>
            <Input value={requestDraft.station_from || ''} disabled placeholder="Set in profile" />
          </div>
          <div>
            <Label>To</Label>
            <Input value="Thane" disabled />
          </div>
          <div>
            <Label>Class</Label>
            <Select
              value={requestDraft.travel_class}
              onChange={(e) => setRequestDraft(d => ({ ...d, travel_class: e.target.value }))}
            >
              <option value="second">Second</option>
              <option value="first">First</option>
            </Select>
          </div>
          <div>
            <Label>Period</Label>
            <Select
              value={requestDraft.period}
              onChange={(e) => setRequestDraft(d => ({ ...d, period: e.target.value }))}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </Select>
          </div>
        </div>
      </Card>

      <Card style={{ padding: 20 }}>
        <div className="row-calendar">
          <div>
            <MonthCalendar
              selected={selectedDate}
              onSelect={setSelectedDate}
              isDateAvailable={dayHasSlots}
            />
          </div>
          <div style={{ minHeight: 280 }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--fg-muted)' }}>
              {selectedDate
                ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                : 'Select a date'}
            </div>
            {pendingSlot ? (
              <div style={{
                border: '1px solid color-mix(in oklab, var(--accent) 30%, var(--border))',
                borderRadius: 'var(--radius-md)',
                padding: 16,
                background: 'color-mix(in oklab, var(--accent) 5%, var(--bg-elevated))',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-faint)', marginBottom: 8 }}>
                  Confirm appointment
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                  {new Date(pendingSlot.slot_start).toLocaleString('en-IN', {
                    weekday: 'long', day: '2-digit', month: 'long',
                    hour: 'numeric', minute: '2-digit', hour12: true,
                  })}
                </div>
                <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 14 }}>
                  {requestDraft.station_from} → Thane · {cap(requestDraft.travel_class)} class · {cap(requestDraft.period)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 14, lineHeight: 1.5 }}>
                  We&apos;ll email you a check-in OTP. Bring your college ID and show the OTP at the counter.
                  You can cancel this from <strong>My requests</strong> up until the slot.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="primary" onClick={confirmBooking} disabled={!!picking}>
                    {picking ? 'Booking…' : 'Confirm booking'}
                  </Button>
                  <Button variant="ghost" onClick={() => setPendingSlot(null)} disabled={!!picking}>
                    Back
                  </Button>
                </div>
              </div>
            ) : (
              selectedDate && (
                <SlotList slots={slotsForDay} onPick={pick} picking={picking} />
              )
            )}
            {err && (
              <div style={{
                marginTop: 12, fontSize: 13, padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                background: 'color-mix(in oklab, var(--danger) 8%, transparent)',
                color: 'var(--danger)',
                border: '1px solid color-mix(in oklab, var(--danger) 25%, transparent)',
              }}>{err}</div>
            )}
          </div>
        </div>
      </Card>
    </Page>
  );
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function prettyError(code?: string): string | null {
  if (!code) return null;
  const map: Record<string, string> = {
    missing_fields: 'Enter your home station, class, and period.',
    age_cutoff_exceeded: 'You exceed the age cap for this concession.',
    policy_not_allowed: 'That class/period combination isn\'t offered.',
    slot_full: 'That slot just filled up — pick another.',
    slot_not_found: 'That slot is no longer available.',
    one_active_per_request: 'You already have an active appointment for this request.',
  };
  return map[code] ?? code.replace(/_/g, ' ');
}
