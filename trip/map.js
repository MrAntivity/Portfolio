// Public map sources are configurable without changing journal data.
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const GEOCODER = 'https://photon.komoot.io/api/';
export function createMap(element, options = {}) {
  if (!window.L) throw new Error('The map could not load. You can still enter coordinates manually.');
  const map = L.map(element, { scrollWheelZoom: false, worldCopyJump: true, minZoom: 1, maxZoom: 18, zoomControl: false, ...options }).setView([24, 12], 2);
  L.control.zoom({ position: 'topright' }).addTo(map);
  const tiles = L.tileLayer(TILE_URL, { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19 }).addTo(map);
  let warned = false;
  tiles.on('tileerror', () => { if (!warned) { warned = true; const status = document.querySelector('#map-status'); if (status) status.textContent = 'Map tiles are unavailable; trip stories are still accessible below.'; } });
  return map;
}
export function pinIcon(label = '•') {
  return L.divIcon({ className: 'pin', html: `<span>${String(label).replace(/[^0-9•]/g, '')}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] });
}
let lastSearch = 0;
const cache = new Map();
export async function findPlaces(query) {
  const text = query.trim();
  if (text.length < 3) throw new Error('Enter at least three characters to find a place.');
  if (cache.has(text.toLowerCase())) return cache.get(text.toLowerCase());
  if (Date.now() - lastSearch < 1500) throw new Error('Give the location search a moment, then try again.');
  lastSearch = Date.now();
  const response = await fetch(`${GEOCODER}?q=${encodeURIComponent(text)}&limit=5&lang=en`, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('Location search is unavailable. Drop a pin on the map or enter coordinates instead.');
  const json = await response.json();
  const places = (json.features || []).map(f => {
    const p = f.properties || {}, [lng, lat] = f.geometry?.coordinates || [];
    return { lat, lng, locationLabel: [p.name, p.city || p.state, p.country].filter((v, i, a) => v && a.indexOf(v) === i).join(', ').slice(0, 180), address: [p.housenumber, p.street, p.city, p.postcode, p.country].filter(Boolean).join(' ').slice(0, 300), country: (p.country || '').slice(0, 100) };
  }).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 85 && Math.abs(p.lng) <= 180);
  cache.set(text.toLowerCase(), places); return places;
}
