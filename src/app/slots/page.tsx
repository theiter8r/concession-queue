'use client';
import { useEffect, useMemo, useState } from 'react';
import { Page, Card } from '@/components/ui';
import { MonthCalendar } from '@/components/calendar';
import { SlotList, type Slot } from '@/components/slot-list';
import { supabaseBrowser } from '@/lib/supabase/client';

// /slots — live availability in the same Cal.com-style calendar layout as /book (§8).
// Click a slot → bounce to /book to actually reserve it.

export default function SlotsPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  async function refresh() {
    const data = await fetch('/api/slots').then(r => r.json());
    if (Array.isArray(data)) setSlots(data);
  }

  useEffect(() => {
    refresh();
    const sb = supabaseBrowser();
    const ch = sb
      .channel('appointments-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' },
        () => { refresh(); })
      .subscribe();
    return () => { sb.removeChannel(ch); };
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

  // Default-select the first day that has slots, once data loads.
  useEffect(() => {
    if (selectedDate || slots.length === 0) return;
    const first = [...slots].sort((a, b) => a.slot_start.localeCompare(b.slot_start))[0];
    setSelectedDate(new Date(first.slot_start));
  }, [slots, selectedDate]);

  return (
    <Page
      title="Live slots"
      subtitle="Updates the moment a cancellation frees a seat."
      action={<LivePulse />}
    >
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
            {selectedDate && slotsForDay.length > 0 && (
              <SlotList
                slots={slotsForDay}
                onPick={() => { window.location.href = '/book'; }}
                picking={null}
              />
            )}
            {selectedDate && slotsForDay.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                No open slots on this day.
              </div>
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

function LivePulse() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 12, color: 'var(--fg-muted)',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: 999, background: 'var(--ok)',
        animation: 'pulse 1400ms var(--ease-in-out) infinite',
      }}/>
      Live
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.95); }
          50%      { opacity: 1;   transform: scale(1); }
        }
      `}</style>
    </span>
  );
}
