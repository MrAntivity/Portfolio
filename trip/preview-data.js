// Deliberately separate from production: ?demo=1 never imports Firebase or writes remote data.
const uid = 'preview-guest';
const sample = (id, title, locationLabel, country, lat, lng, startDate, description, image, people, excursions) => ({ id, title, locationLabel, country, lat, lng, startDate, endDate: '', description, address: '', people, excursions, authorName: 'Preview contributor', createdBy: uid, coverPath: image });
const trips = [
  sample('sample-city', 'A weekend above the city', 'New York City', 'United States', 40.7128, -74.006, '2026-08-21', 'No real itinerary. Just a rooftop, the city lights, and nowhere else we needed to be. A sample story to show how our memories will look here.', '../assets/photos/rooftop-friends.webp', ['Aiden', 'Alex', 'Sam', 'Jamie'], ['An afternoon wandering the city', 'Rooftop views at sunset', 'One last stop for late-night food']),
  sample('sample-waterfall', 'Taking the long way home', 'Kyoto, Japan', 'Japan', 35.0116, 135.7681, '2026-06-14', 'The kind of day that starts with a walk and turns into a whole adventure. A sample memory, ready for everyone’s photos and little details.', '../assets/photos/waterfall.webp', ['Aiden', 'Alex', 'Sam'], ['A morning walk by the water', 'A detour that became the best part']),
  sample('sample-night', 'One more night out', 'Los Angeles', 'United States', 34.0522, -118.2437, '2025-12-20', 'Good friends, a camera roll full of blurry photos, and a night we kept talking about. This is example content for the design preview.', '../assets/photos/city-lights.webp', ['Aiden', 'Jamie', 'Riley'], ['Dinner with the group', 'City lights after dark'])
];
const galleries = new Map(trips.map(t => [t.id, [t.coverPath, '../assets/photos/stone-walls.webp', '../assets/photos/lock-bridge.webp', '../assets/photos/japan-friends.webp'].map((p, i) => ({ id: `${t.id}-${i}`, uploaderId: uid, uploaderName: ['Alex', 'Aiden', 'Sam', 'Jamie'][i], caption: i === 0 ? 'Sample photo from the existing portfolio' : '', storagePath: p, width: 1200, height: i % 2 ? 1600 : 1000, status: 'ready' }))]));
const tripWatchers = new Set(), detailWatchers = new Map(), photoWatchers = new Map();
function emit() { for (const fn of tripWatchers) fn([...trips].sort((a, b) => b.startDate.localeCompare(a.startDate))); for (const [id, callbacks] of detailWatchers) for (const fn of callbacks) fn(trips.find(t => t.id === id) || null); for (const [id, callbacks] of photoWatchers) for (const fn of callbacks) fn(galleries.get(id) || []); }
export const guest = async () => ({ uid });
export const currentGuest = guest;
export const newTripId = () => crypto.randomUUID();
export function watchTrips(fn) { tripWatchers.add(fn); fn([...trips]); return () => tripWatchers.delete(fn); }
function watch(map, id, fn, value) { if (!map.has(id)) map.set(id, new Set()); map.get(id).add(fn); fn(value); return () => map.get(id).delete(fn); }
export const watchTrip = (id, fn) => watch(detailWatchers, id, fn, trips.find(t => t.id === id));
export const watchPhotos = (id, count, fn) => watch(photoWatchers, id, data => fn(data.slice(0, count)), galleries.get(id) || []);
export async function saveTrip(id, values, existing) { if (existing) Object.assign(trips.find(t => t.id === id), values); else trips.unshift({ ...values, id, createdBy: uid, coverPath: '' }); emit(); }
export async function setCover(id, path) { trips.find(t => t.id === id).coverPath = path; emit(); }
export const imageUrl = async path => path;
export async function uploadPhoto(id, blob, info, progress) { progress(.5); const photo = { id: crypto.randomUUID(), uploaderId: uid, uploaderName: info.name, caption: info.caption, width: info.width, height: info.height, storagePath: URL.createObjectURL(blob) }; if (!galleries.has(id)) galleries.set(id, []); galleries.get(id).push(photo); progress(1); emit(); return photo; }
export async function removePhoto(id, photo) { galleries.set(id, galleries.get(id).filter(p => p.id !== photo.id)); emit(); }
