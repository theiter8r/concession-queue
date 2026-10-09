// Google Maps JS loader. One <script> per page, shared by every caller.
// The key is a browser key — restrict it in Google Cloud to this site's
// referrers and to Maps JavaScript, Places (New), Geocoding and Maps Embed.

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
// Optional cloud-styled map. The picker's pin is a CSS overlay, so no Map ID
// is needed for markers.
export const MAP_ID: string | undefined = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || undefined;
export const mapsEnabled = KEY.length > 0;

let loading: Promise<any> | null = null;
let failed = false;

// False once the script has failed to load, so forms fall back to typing.
export function mapsUsable() {
  return mapsEnabled && !failed;
}

export function loadGoogleMaps(): Promise<any> {
  const w = window as any;
  if (w.google?.maps?.importLibrary) return Promise.resolve(w.google);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    w.__gmapsReady = () => resolve(w.google);
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY)}&v=weekly&loading=async&region=IN&callback=__gmapsReady`;
    s.async = true;
    s.onerror = () => { loading = null; failed = true; reject(new Error('maps_load_failed')); };
    document.head.appendChild(s);
  });
  return loading;
}

// Static, keyed embed — the Maps Embed API is free with no usage cap, so the
// admin desk uses this instead of a billed interactive map.
export function embedUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(KEY)}&q=${lat},${lng}&zoom=17`;
}
