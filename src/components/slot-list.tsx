'use client';
import { Button } from './ui';

export type Slot = {
  id: string;
  slot_start: string;
  slot_end: string;
  capacity: number;
  spots_left: number;
};

export function SlotList({
  slots,
  onPick,
  picking,
}: {
  slots: Slot[];
  onPick: (s: Slot) => void;
  picking?: string | null;
}) {
  if (slots.length === 0) {
    return (
      <div style={{ color: 'var(--fg-muted)', padding: '24px 4px', fontSize: 13 }}>
        No open slots for this date.
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {slots.map((s, i) => {
        const full = s.spots_left <= 0;
        const time = new Date(s.slot_start).toLocaleTimeString('en-US', {
          hour: 'numeric', minute: '2-digit', hour12: true,
        });
        return (
          <div
            key={s.id}
            // @starting-style transition — interruptible, only fires on actual mount,
            // so realtime refreshes don't replay the cascade. Stagger via inline delay.
            className="slot-row"
            style={{ ['--stagger' as any]: `${Math.min(i, 6) * 30}ms` }}
          >
            <Button
              variant={picking === s.id ? 'primary' : 'secondary'}
              disabled={full}
              onClick={() => onPick(s)}
              style={{
                width: '100%',
                height: 44,
                justifyContent: 'space-between',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span>{time}</span>
              <span style={{
                fontSize: 12,
                color: full ? 'var(--danger)' : 'var(--fg-muted)',
                fontWeight: 500,
              }}>
                {full ? 'Full' : `${s.spots_left} left`}
              </span>
            </Button>
          </div>
        );
      })}
      <style jsx>{`
        .slot-row {
          opacity: 1;
          transform: translateY(0);
          transition: opacity 220ms var(--ease-out), transform 220ms var(--ease-out);
          transition-delay: var(--stagger, 0ms);
        }
        @starting-style {
          .slot-row {
            opacity: 0;
            transform: translateY(4px);
          }
        }
      `}</style>
    </div>
  );
}
