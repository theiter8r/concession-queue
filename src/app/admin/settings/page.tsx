'use client';
import { useEffect, useMemo, useState } from 'react';
import { Page, Card, Button, Input, Select, Label } from '@/components/ui';
import { DatePicker } from '@/components/date-picker';

// /admin/settings — Cal.com-style availability editor (SPEC §4b, §12).
// Per-weekday windows (+lunch breaks via a gap), slot length, capacity, holidays, generate.

type Window = { open_time: string; close_time: string };
type Day = { weekday: number; enabled: boolean; windows: Window[] };
type Holiday = { holiday_date: string; reason: string | null };

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export default function SettingsPage() {
  const [days, setDays] = useState<Day[]>(
    Array.from({ length: 7 }, (_, i) => ({ weekday: i, enabled: false, windows: [] })),
  );
  const [cfg, setCfg] = useState({ slot_minutes: 60, default_capacity: 5, generate_weeks: 4 });
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHoliday, setNewHoliday] = useState({ date: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { (async () => {
    const data = await fetch('/api/admin/schedule').then(r => r.json());
    const next = Array.from({ length: 7 }, (_, i) => ({ weekday: i, enabled: false, windows: [] as Window[] }));
    for (const w of data.working_hours ?? []) {
      next[w.weekday].enabled = true;
      next[w.weekday].windows.push({ open_time: w.open_time.slice(0,5), close_time: w.close_time.slice(0,5) });
    }
    setDays(next);
    if (data.slot_config) setCfg({
      slot_minutes: data.slot_config.slot_minutes,
      default_capacity: data.slot_config.default_capacity,
      generate_weeks: data.slot_config.generate_weeks,
    });
    setHolidays(data.holidays ?? []);
  })(); }, []);

  function setDay(i: number, mut: (d: Day) => Day) {
    setDays((arr) => arr.map((d, idx) => idx === i ? mut(d) : d));
  }

  async function save() {
    setSaving(true); setMsg(null);
    const working_hours = days.flatMap(d =>
      d.enabled ? d.windows.map(w => ({ weekday: d.weekday, open_time: w.open_time, close_time: w.close_time })) : [],
    );
    const res = await fetch('/api/admin/schedule', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ working_hours, slot_config: cfg }),
    });
    setSaving(false);
    setMsg(res.ok ? 'Saved.' : 'Save failed.');
  }

  async function generate() {
    setGenerating(true); setMsg(null);
    const res = await fetch('/api/admin/slots/generate', { method: 'POST' });
    const j = await res.json().catch(() => ({}));
    setGenerating(false);
    setMsg(res.ok ? `Generated ${j.generated ?? 0} candidate slots.` : (j.error ?? 'Generation failed.'));
  }

  async function addHoliday() {
    if (!newHoliday.date) return;
    const res = await fetch('/api/admin/holidays', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ holiday_date: newHoliday.date, reason: newHoliday.reason || null }),
    });
    if (res.ok) {
      setHolidays(h => [...h, { holiday_date: newHoliday.date, reason: newHoliday.reason || null }]);
      setNewHoliday({ date: '', reason: '' });
    }
  }

  async function removeHoliday(date: string) {
    const res = await fetch(`/api/admin/holidays/${date}`, { method: 'DELETE' });
    if (res.ok) setHolidays(h => h.filter(x => x.holiday_date !== date));
  }

  const preview = useMemo(() => {
    let slotsPerWeek = 0;
    for (const d of days) {
      if (!d.enabled) continue;
      for (const w of d.windows) {
        const mins = toMins(w.close_time) - toMins(w.open_time);
        if (mins > 0) slotsPerWeek += Math.floor(mins / cfg.slot_minutes);
      }
    }
    const seatsPerWeek = slotsPerWeek * cfg.default_capacity;
    const totalSeats = seatsPerWeek * cfg.generate_weeks;
    return { slotsPerWeek, seatsPerWeek, totalSeats };
  }, [days, cfg]);

  return (
    <Page title="Availability" subtitle="Weekly schedule, slot length, and holidays.">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ display: 'grid', gap: 12 }}>
            {days.map((d, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '140px 1fr', gap: 16,
                paddingBottom: 12, borderBottom: i < 6 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={d.enabled}
                    onChange={(e) => setDay(i, x => ({
                      ...x, enabled: e.target.checked,
                      windows: e.target.checked && x.windows.length === 0
                        ? [{ open_time: '09:00', close_time: '17:00' }]
                        : x.windows,
                    }))}
                  />
                  <span style={{ fontWeight: 500 }}>{DAYS[i]}</span>
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {!d.enabled && <span style={{ color: 'var(--fg-faint)', fontSize: 13 }}>Closed</span>}
                  {d.enabled && d.windows.map((w, wi) => (
                    <div key={wi} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <Input
                        type="time"
                        value={w.open_time}
                        onChange={(e) => setDay(i, x => ({ ...x, windows: x.windows.map((y, j) => j === wi ? { ...y, open_time: e.target.value } : y) }))}
                        style={{ width: 110 }}
                      />
                      <span style={{ color: 'var(--fg-muted)' }}>–</span>
                      <Input
                        type="time"
                        value={w.close_time}
                        onChange={(e) => setDay(i, x => ({ ...x, windows: x.windows.map((y, j) => j === wi ? { ...y, close_time: e.target.value } : y) }))}
                        style={{ width: 110 }}
                      />
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => setDay(i, x => ({ ...x, windows: x.windows.filter((_, j) => j !== wi) }))}
                        aria-label="Remove window"
                      >✕</Button>
                    </div>
                  ))}
                  {d.enabled && (
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => setDay(i, x => ({ ...x, windows: [...x.windows, { open_time: '14:00', close_time: '17:00' }] }))}
                      style={{ justifySelf: 'start', color: 'var(--fg-muted)' }}
                    >+ Add window</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <Card style={{ padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Slot config</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <Label>Slot length</Label>
                <Select
                  value={String(cfg.slot_minutes)}
                  onChange={(e) => setCfg(c => ({ ...c, slot_minutes: +e.target.value }))}
                >
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </Select>
              </div>
              <div>
                <Label>People per slot</Label>
                <Input type="number" min={1}
                  value={cfg.default_capacity}
                  onChange={(e) => setCfg(c => ({ ...c, default_capacity: +e.target.value || 1 }))} />
              </div>
              <div>
                <Label>Horizon (weeks)</Label>
                <Input type="number" min={1}
                  value={cfg.generate_weeks}
                  onChange={(e) => setCfg(c => ({ ...c, generate_weeks: +e.target.value || 1 }))} />
              </div>
            </div>
          </Card>

          <Card style={{ padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Preview</div>
            <Stat label="Slots / week" value={preview.slotsPerWeek} />
            <Stat label="Student spots / week" value={preview.seatsPerWeek} />
            <Stat label={`Spots through ${cfg.generate_weeks} weeks`} value={preview.totalSeats} />
          </Card>

          <Card style={{ padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Holidays</div>
            <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
              {holidays.map(h => (
                <div key={h.holiday_date} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: 13, padding: '6px 0',
                }}>
                  <span>{h.holiday_date} {h.reason && <span style={{ color: 'var(--fg-muted)' }}>· {h.reason}</span>}</span>
                  <Button size="sm" variant="ghost" onClick={() => removeHoliday(h.holiday_date)}>Remove</Button>
                </div>
              ))}
              {holidays.length === 0 && (
                <span style={{ color: 'var(--fg-faint)', fontSize: 13 }}>None.</span>
              )}
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <DatePicker value={newHoliday.date}
                onChange={(v) => setNewHoliday(n => ({ ...n, date: v }))} />
              <Input placeholder="Reason (optional)" value={newHoliday.reason}
                onChange={(e) => setNewHoliday(n => ({ ...n, reason: e.target.value }))} />
              <Button size="sm" onClick={addHoliday}>Add holiday</Button>
            </div>
          </Card>
        </div>
      </div>

      <div style={{ position: 'sticky', bottom: 16, marginTop: 16,
        display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center',
      }}>
        {msg && <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{msg}</span>}
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        <Button variant="primary" onClick={generate} disabled={generating}>
          {generating ? 'Generating…' : 'Generate slots'}
        </Button>
      </div>
    </Page>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
      <span style={{ color: 'var(--fg-muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value.toLocaleString()}</span>
    </div>
  );
}

function toMins(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}
