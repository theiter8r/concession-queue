'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Label } from '@/components/ui';
import { embedUrl, loadGoogleMaps, MAP_ID, mapsUsable } from '@/lib/google-maps';

// Home address, Swiggy-style: the form shows a card; tapping it opens a
// full-screen map where the pin stays centred and the map pans under it. The
// map gets the building/street; the student types the flat number. The parts
// are stored separately and /api/me joins them into the printable address.
// Without a Maps key (or if Maps fails to load) it's a plain text field.

export type AddressValue = {
  flat: string;
  building: string;
  landmark: string;
  mapLine: string | null;
  lat: number | null;
  lng: number | null;
  locality: string | null;
  // Free-text address; only edited in the no-map fallback.
  address: string;
};

export function addressFrom(p: {
  address?: string | null; address_flat?: string | null; address_building?: string | null;
  address_landmark?: string | null; address_map_line?: string | null;
  address_lat?: number | null; address_lng?: number | null; address_locality?: string | null;
}): AddressValue {
  return {
    flat: p.address_flat ?? '',
    building: p.address_building ?? '',
    landmark: p.address_landmark ?? '',
    mapLine: p.address_map_line ?? null,
    lat: p.address_lat ?? null,
    lng: p.address_lng ?? null,
    locality: p.address_locality ?? null,
    address: p.address ?? '',
  };
}

export function addressPayload(v: AddressValue) {
  return {
    address: v.address,
    address_flat: v.flat,
    address_building: v.building,
    address_landmark: v.landmark,
    address_map_line: v.mapLine,
    address_lat: v.lat,
    address_lng: v.lng,
    address_locality: v.locality,
  };
}

// Same join as /api/me, for previews before saving.
export function composeAddress(v: AddressValue): string {
  if (!v.mapLine) return v.address;
  return [v.flat.trim(), v.building.trim(), v.landmark.trim() && `near ${v.landmark.trim()}`, v.mapLine]
    .filter(Boolean).join(', ');
}

export function isPinned(v: AddressValue) {
  return v.lat !== null && v.lng !== null && !!v.mapLine;
}

// Pinned + flat number, or a typed address when the map can't be used.
export function addressComplete(v: AddressValue): boolean {
  if (isPinned(v)) return v.flat.trim().length > 0;
  return !mapsUsable() && v.address.trim().length > 0;
}

type Props = { value: AddressValue; onChange: (v: AddressValue) => void };

export function AddressPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [usable, setUsable] = useState(mapsUsable());
  const pinned = isPinned(value);

  // Surface a load failure (bad key, offline) as the typed fallback.
  useEffect(() => {
    if (!usable) return;
    loadGoogleMaps().catch(() => setUsable(false));
  }, [usable]);

  if (!usable) {
    return (
      <div style={{ display: 'grid', gap: 6 }}>
        <Input
          required
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          placeholder="Flat / house no., building, street, area, PIN"
        />
        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Map isn’t available right now — type your full address.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {pinned ? (
        <div className="addr-card">
          <button type="button" className="addr-preview" onClick={() => setOpen(true)} aria-label="Change location on map">
            <iframe
              key={`${value.lat},${value.lng}`}
              title="Your pinned home"
              src={embedUrl(value.lat!, value.lng!)}
              loading="lazy"
              tabIndex={-1}
              referrerPolicy="no-referrer-when-downgrade"
            />
          </button>
          <div className="addr-summary">
            <div style={{ minWidth: 0 }}>
              <div className="addr-locality">{value.locality ?? 'Pinned location'}</div>
              <div className="addr-line">{value.mapLine}</div>
            </div>
            <Button type="button" size="sm" onClick={() => setOpen(true)}>Change</Button>
          </div>
        </div>
      ) : (
        <button type="button" className="addr-empty" onClick={() => setOpen(true)}>
          <PinGlyph size={22} />
          <span style={{ display: 'grid', gap: 2, textAlign: 'left' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Set your home on the map</span>
            <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
              {value.address ? `Currently: ${value.address}` : 'Use your location or search your building'}
            </span>
          </span>
        </button>
      )}

      {pinned && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div>
            <Label>Flat / house no. *</Label>
            <Input
              required
              value={value.flat}
              onChange={(e) => onChange({ ...value, flat: e.target.value })}
              placeholder="e.g. B-402"
              maxLength={80}
            />
          </div>
          <div>
            <Label>Building / society</Label>
            <Input
              value={value.building}
              onChange={(e) => onChange({ ...value, building: e.target.value })}
              placeholder="e.g. Shree Ganesh CHS"
              maxLength={120}
            />
          </div>
          <div>
            <Label>Landmark (optional)</Label>
            <Input
              value={value.landmark}
              onChange={(e) => onChange({ ...value, landmark: e.target.value })}
              placeholder="e.g. Jambli Naka"
              maxLength={120}
            />
          </div>
        </div>
      )}

      {open && (
        <MapSheet
          initial={pinned ? { lat: value.lat!, lng: value.lng! } : null}
          onClose={() => setOpen(false)}
          onConfirm={(r) => {
            onChange({
              ...value,
              lat: r.lat, lng: r.lng, locality: r.locality, mapLine: r.mapLine,
              building: r.building || value.building,
            });
            setOpen(false);
          }}
        />
      )}

      <style jsx>{`
        .addr-empty {
          display: flex; align-items: center; gap: 12px;
          width: 100%; min-height: 64px; padding: 12px 14px;
          border: 1px dashed var(--border-strong);
          border-radius: var(--radius);
          background: var(--bg);
          color: var(--fg);
          cursor: pointer;
          transition: border-color 160ms var(--ease-out), background-color 160ms var(--ease-out);
        }
        @media (hover: hover) and (pointer: fine) {
          .addr-empty:hover { border-color: var(--fg-muted); background: var(--bg-elevated); }
        }
        .addr-card {
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
          background: var(--bg-elevated);
        }
        .addr-preview {
          display: block; width: 100%; height: 140px; padding: 0; border: 0;
          background: var(--bg); cursor: pointer;
        }
        .addr-preview iframe {
          width: 100%; height: 100%; border: 0; pointer-events: none; display: block;
        }
        .addr-summary {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding: 10px 12px;
          border-top: 1px solid var(--border);
        }
        .addr-locality { font-weight: 600; font-size: 14px; }
        .addr-line {
          font-size: 12px; color: var(--fg-muted);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
      `}</style>
    </div>
  );
}

// ── Full-screen map ─────────────────────────────────────────────────────────

type LatLng = { lat: number; lng: number };
type Resolved = { locality: string | null; mapLine: string; building: string | null };
type Phase = 'moving' | 'locating' | 'ready' | 'empty';

// Thane station — fallback start when GPS is denied.
const THANE: LatLng = { lat: 19.1860, lng: 72.9757 };
const IDLE_MS = 600;
const MIN_MOVE_M = 20;

function MapSheet({ initial, onClose, onConfirm }: {
  initial: LatLng | null;
  onClose: () => void;
  onConfirm: (r: LatLng & Resolved) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mapDiv = useRef<HTMLDivElement>(null);
  const searchDiv = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const geocoder = useRef<any>(null);
  const searchEl = useRef<any>(null);
  const cache = useRef(new Map<string, Resolved>());
  const last = useRef<{ at: LatLng; r: Resolved } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);
  const phaseRef = useRef<Phase>('moving');

  const [shown, setShown] = useState(false);
  const [lifting, setLifting] = useState(false);
  const [phase, setPhaseState] = useState<Phase>('moving');
  const [result, setResult] = useState<Resolved | null>(null);
  const [locating, setLocating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function setPhase(p: Phase) {
    if (phaseRef.current === p) return;
    phaseRef.current = p;
    setPhaseState(p);
  }

  // Enter transition, scroll lock, Escape, focus return.
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const raf = requestAnimationFrame(() => setShown(true));
    rootRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (timer.current) clearTimeout(timer.current);
      prevFocus?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const g = await loadGoogleMaps();
      const [{ Map }, { PlaceAutocompleteElement }, { Geocoder }] = await Promise.all([
        g.maps.importLibrary('maps'),
        g.maps.importLibrary('places'),
        g.maps.importLibrary('geocoding'),
      ]);
      if (cancelled || !mapDiv.current || !searchDiv.current) return;

      geocoder.current = new Geocoder();
      const m = new Map(mapDiv.current, {
        center: initial ?? THANE,
        zoom: initial ? 18 : 15,
        ...(MAP_ID ? { mapId: MAP_ID } : {}),
        disableDefaultUI: true,
        zoomControl: false,
        clickableIcons: false,
        gestureHandling: 'greedy',
      });
      map.current = m;

      m.addListener('dragstart', () => { setLifting(true); setPhase('moving'); });
      m.addListener('center_changed', () => {
        setPhase('moving');
        if (timer.current) clearTimeout(timer.current);
      });
      m.addListener('idle', () => {
        setLifting(false);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          const c = m.getCenter();
          if (c) resolve({ lat: c.lat(), lng: c.lng() });
        }, IDLE_MS);
      });

      const ac = new PlaceAutocompleteElement({ includedRegionCodes: ['in'] });
      ac.setAttribute('placeholder', 'Search building, society or area');
      ac.style.width = '100%';
      ac.addEventListener('gmp-select', async (e: any) => {
        const place = e.placePrediction.toPlace();
        await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'addressComponents', 'types'] });
        if (!place.location) return;
        const at = { lat: place.location.lat(), lng: place.location.lng() };
        const comps = (place.addressComponents ?? []).map((c: any) => ({ types: c.types, name: c.longText }));
        const named = (place.types ?? []).some((t: string) => ['premise', 'establishment', 'point_of_interest', 'subpremise'].includes(t));
        // Seed the cache so landing here costs no Geocoding call.
        cache.current.set(key(at), {
          locality: localityOf(comps),
          mapLine: cleanLine(place.formattedAddress ?? ''),
          building: named ? place.displayName ?? null : null,
        });
        m.panTo(at);
        m.setZoom(18);
      });
      searchEl.current = ac;
      searchDiv.current.replaceChildren(ac);

      if (!initial) locate(true);
    })().catch(() => setMsg('Map failed to load. Close this and type your address.'));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resolve(at: LatLng) {
    const hit = cache.current.get(key(at));
    if (hit) return settle(at, hit);
    if (last.current && metres(last.current.at, at) < MIN_MOVE_M) return settle(last.current.at, last.current.r);

    const id = ++seq.current;
    setPhase('locating');
    try {
      const { results } = await geocoder.current.geocode({ location: at });
      if (id !== seq.current) return;
      const best = pickStreetResult(results);
      if (!best) { setPhase('empty'); return; }
      const comps: Comp[] = results.flatMap((r: any) =>
        r.address_components.map((c: any) => ({ types: c.types, name: c.long_name })));
      const named = best.address_components.find((c: any) =>
        c.types.includes('premise') || c.types.includes('establishment'));
      const r: Resolved = {
        locality: localityOf(comps),
        mapLine: cleanLine(best.formatted_address),
        building: named?.long_name ?? null,
      };
      cache.current.set(key(at), r);
      settle(at, r);
    } catch {
      if (id === seq.current) setPhase('empty');
    }
  }

  function settle(at: LatLng, r: Resolved) {
    last.current = { at, r };
    setResult(r);
    setPhase('ready');
  }

  function locate(auto = false) {
    if (!navigator.geolocation) { fallbackToSearch('This browser can’t share location — search instead.'); return; }
    setLocating(true); setMsg(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        map.current?.panTo({ lat: p.coords.latitude, lng: p.coords.longitude });
        map.current?.setZoom(18);
      },
      (e) => {
        setLocating(false);
        fallbackToSearch(e.code === e.PERMISSION_DENIED
          ? (auto ? 'Location is off — search for your building or move the map.' : 'Location permission is blocked in your browser settings.')
          : 'Couldn’t get your location — search instead.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  function fallbackToSearch(text: string) {
    setMsg(text);
    searchEl.current?.focus?.();
  }

  function close() {
    setShown(false);
    setTimeout(onClose, 260);
  }

  function confirm() {
    const c = map.current?.getCenter();
    if (!c || !result) return;
    // Confirm the spot the address was resolved for, not a sub-20m drift.
    const at = last.current && metres(last.current.at, { lat: c.lat(), lng: c.lng() }) < MIN_MOVE_M
      ? last.current.at
      : { lat: c.lat(), lng: c.lng() };
    onConfirm({ ...at, ...result });
  }

  return createPortal(
    <div
      ref={rootRef}
      className="ms-root"
      data-shown={shown ? '1' : '0'}
      role="dialog"
      aria-modal="true"
      aria-label="Set your home on the map"
      tabIndex={-1}
    >
      <header className="ms-head">
        <button type="button" className="ms-icon-btn" onClick={close} aria-label="Close map">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div ref={searchDiv} className="ms-search" />
      </header>

      <div className="ms-map-wrap">
        <div ref={mapDiv} className="ms-map" />
        {/* Pin is an overlay; its tip marks the map centre. */}
        <div className="ms-shadow" data-lift={lifting ? '1' : '0'} aria-hidden />
        <div className="ms-pin" data-lift={lifting ? '1' : '0'} aria-hidden>
          <PinGlyph size={40} />
        </div>
        {msg && <div className="ms-msg" role="status">{msg}</div>}
        <button
          type="button"
          className="ms-locate"
          onClick={() => locate(false)}
          disabled={locating}
          aria-label="Go to my location"
        >
          {locating ? <span className="ms-spinner" aria-hidden /> : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
          )}
        </button>
      </div>

      <footer className="ms-foot">
        <div className="ms-eyebrow">Your home</div>
        <div className="ms-strip" aria-live="polite">
          {phase === 'ready' && result ? (
            <>
              <div className="ms-locality">{result.locality ?? 'Selected spot'}</div>
              <div className="ms-line">{result.mapLine}</div>
            </>
          ) : phase === 'empty' ? (
            <div className="ms-line">No address found here. Move the map a little.</div>
          ) : (
            <>
              <div className="ms-skel" style={{ width: '40%', height: 16 }} />
              <div className="ms-skel" style={{ width: '85%', height: 12, marginTop: 8 }} />
              <span className="sr-only">{phase === 'moving' ? 'Moving map' : 'Finding address'}</span>
            </>
          )}
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={confirm}
          disabled={phase !== 'ready' || !result}
          style={{ width: '100%', height: 46, fontSize: 15 }}
        >
          Confirm location
        </Button>
        <div className="ms-hint">Drag the map so the pin sits on your building.</div>
      </footer>

      <style jsx>{`
        .ms-root {
          position: fixed; inset: 0; z-index: 1000;
          height: 100dvh;
          display: flex; flex-direction: column;
          background: var(--bg-elevated);
          outline: none;
          transform: translateY(100%);
          transition: transform 320ms var(--ease-drawer);
        }
        .ms-root[data-shown="1"] { transform: translateY(0); }
        @media (prefers-reduced-motion: reduce) {
          .ms-root { transform: none; opacity: 0; transition: opacity 160ms var(--ease-out); }
          .ms-root[data-shown="1"] { opacity: 1; }
        }
        .ms-head {
          display: flex; align-items: center; gap: 8px;
          padding: calc(env(safe-area-inset-top) + 10px) 12px 10px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-elevated);
        }
        .ms-search { flex: 1; min-width: 0; min-height: 44px; }
        .ms-icon-btn {
          flex-shrink: 0;
          width: 44px; height: 44px;
          display: inline-flex; align-items: center; justify-content: center;
          border: 1px solid var(--border); border-radius: 999px;
          background: var(--bg-elevated); color: var(--fg);
          cursor: pointer;
          transition: transform 140ms var(--ease-out);
        }
        .ms-icon-btn:active { transform: scale(0.97); }
        .ms-map-wrap { position: relative; flex: 1; min-height: 0; }
        .ms-map { position: absolute; inset: 0; background: var(--bg); }

        /* Tip of the pin sits exactly on the centre point. */
        .ms-pin {
          position: absolute; left: 50%; top: 50%;
          width: 40px; height: 40px;
          margin-left: -20px; margin-top: -40px;
          pointer-events: none;
          transform: translateY(0);
          transition: transform 200ms var(--ease-out);
          filter: drop-shadow(0 2px 3px rgba(0,0,0,0.25));
        }
        .ms-pin[data-lift="1"] { transform: translateY(-14px); transition-duration: 150ms; }
        .ms-shadow {
          position: absolute; left: 50%; top: 50%;
          width: 14px; height: 6px; margin: -3px 0 0 -7px;
          border-radius: 50%;
          background: rgba(0,0,0,0.35);
          pointer-events: none;
          transition: transform 200ms var(--ease-out), opacity 200ms var(--ease-out);
        }
        .ms-shadow[data-lift="1"] { transform: scale(0.6); opacity: 0.5; transition-duration: 150ms; }
        @media (prefers-reduced-motion: reduce) {
          .ms-pin, .ms-pin[data-lift="1"] { transform: none; transition: none; }
        }

        .ms-locate {
          position: absolute; right: 14px; bottom: 14px;
          width: 48px; height: 48px;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: 999px; border: 1px solid var(--border);
          background: var(--bg-elevated); color: var(--fg);
          box-shadow: var(--shadow);
          cursor: pointer;
          transition: transform 140ms var(--ease-out);
        }
        .ms-locate:active { transform: scale(0.97); }
        .ms-spinner {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid var(--border-strong); border-top-color: var(--fg);
          animation: ms-spin 700ms linear infinite;
        }
        @keyframes ms-spin { to { transform: rotate(360deg); } }
        .ms-msg {
          position: absolute; left: 12px; right: 12px; top: 12px;
          padding: 10px 12px;
          font-size: 13px;
          border-radius: var(--radius-sm);
          background: var(--bg-elevated); color: var(--fg);
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
        }

        .ms-foot {
          display: grid; gap: 12px;
          padding: 16px 16px calc(env(safe-area-inset-bottom) + 14px);
          border-top: 1px solid var(--border);
          background: var(--bg-elevated);
        }
        @media (min-width: 640px) {
          .ms-foot { padding-left: max(16px, calc(50% - 280px)); padding-right: max(16px, calc(50% - 280px)); }
        }
        .ms-eyebrow {
          font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--fg-faint);
        }
        .ms-strip { min-height: 44px; margin-top: -6px; }
        .ms-locality { font-size: 17px; font-weight: 600; letter-spacing: -0.2px; }
        .ms-line {
          font-size: 13px; color: var(--fg-muted); margin-top: 2px;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .ms-skel {
          border-radius: var(--radius-sm);
          background: linear-gradient(90deg, var(--border) 0%, var(--bg) 50%, var(--border) 100%);
          background-size: 200% 100%;
          animation: ms-shimmer 1.2s linear infinite;
        }
        @keyframes ms-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
        @media (prefers-reduced-motion: reduce) {
          .ms-skel { animation: none; background: var(--border); }
          .ms-spinner { animation-duration: 1.6s; }
        }
        .ms-hint { font-size: 12px; color: var(--fg-faint); text-align: center; margin-top: -4px; }
        .sr-only {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
        }
      `}</style>
    </div>,
    document.body,
  );
}

// Map pins sit on light map tiles in both themes, so the colours are fixed.
function PinGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden style={{ display: 'block', flexShrink: 0 }}>
      <path d="M20 39C20 39 34 24.6 34 15A14 14 0 0 0 6 15C6 24.6 20 39 20 39Z" fill="#1c1917" stroke="#fff" strokeWidth="2" />
      <circle cx="20" cy="15" r="5" fill="#fff" />
    </svg>
  );
}

type Comp = { types: string[]; name: string };

// Coarse place name the admin desk is allowed to see: "Thane", "Dombivli"…
export function localityOf(comps: Comp[]): string | null {
  for (const t of ['locality', 'administrative_area_level_3', 'sublocality_level_1', 'administrative_area_level_2']) {
    const c = comps.find(c => c.types.includes(t));
    if (c) return c.name;
  }
  return null;
}

function pickStreetResult(results: any[]) {
  const pref = ['street_address', 'premise', 'subpremise', 'route'];
  return results.find(r => r.types.some((t: string) => pref.includes(t)))
    ?? results.find(r => !r.types.includes('plus_code'))
    ?? results[0];
}

// Drop plus codes ("7XHG+2M, …") and the trailing country.
function cleanLine(s: string) {
  return s.replace(/^[A-Z0-9]{4}\+[A-Z0-9]{2,3},?\s*/, '').replace(/,\s*India$/, '');
}

function key(p: LatLng) {
  return `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
}

function metres(a: LatLng, b: LatLng) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
