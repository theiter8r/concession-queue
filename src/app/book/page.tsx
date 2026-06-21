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
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch('/api/slots').then(r => r.json()).then((data) => {
      if (Array.isArray(data)) setSlots(data);
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

  async function pick(slot: Slot) {
    setErr(null);
    if (!requestDraft.station_from.trim()) {
      setErr('Set your home station in your profile first.');
      return;
    }
    setPicking(slot.id);
    const rid = await createDraft();
    if (!rid) { setPicking(null); return; }
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slot_id: slot.id, request_id: rid }),
    });
    if (res.status === 409) {
      setErr('That slot just filled up — pick another.');
      const fresh = await fetch('/api/slots').then(r => r.json());
      setSlots(fresh);
      setPicking(null);
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

  return (
    <Page
      title="Book an appointment"
      subtitle="Route is home → Thane. Pick a date, then a time."
    >
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
            {selectedDate && (
              <SlotList slots={slotsForDay} onPick={pick} picking={picking} />
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
