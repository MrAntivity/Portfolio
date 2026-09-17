import { isHeicPhoto } from '../shared/heic.js';
export const MAX_PHOTOS = 20;
export const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function splitLines(value) { return String(value || '').split('\n').map(x => x.trim()).filter(Boolean); }
export function peopleList(value) {
  return [...new Map(String(value || '').split(',').map(x => x.trim()).filter(Boolean).map(x => [x.toLowerCase(), x])).values()];
}
export function validateTrip(values) {
  const d = { title: values.title.trim(), authorName: values.authorName.trim(), locationLabel: values.locationLabel.trim(), address: values.address.trim(), country: values.country.trim(), lat: Number(values.lat), lng: Number(values.lng), startDate: values.startDate, endDate: values.endDate || '', people: peopleList(values.people), description: values.description.trim(), excursions: splitLines(values.excursions) };
  if (!d.title || d.title.length > 120 || !d.authorName || d.authorName.length > 60) throw new Error('Add a trip name and your name.');
  if (!d.locationLabel || d.locationLabel.length > 180 || d.address.length > 300 || d.country.length > 100) throw new Error('Add a place name and keep its address under 300 characters.');
  if (String(values.lat).trim() === '' || String(values.lng).trim() === '' || !Number.isFinite(d.lat) || !Number.isFinite(d.lng) || Math.abs(d.lat) > 85 || Math.abs(d.lng) > 180) throw new Error('Choose a location on the map first.');
  const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
  if (!validDate(d.startDate) || (d.endDate && (!validDate(d.endDate) || d.endDate < d.startDate))) throw new Error('Choose valid dates; the last day must be on or after the first day.');
  if (!d.people.length || d.people.length > 40 || d.people.some(n => n.length > 60)) throw new Error('Add up to 40 names, separated by commas (60 characters per name).');
  if (!d.description || d.description.length > 6000) throw new Error('Add a story, up to 6,000 characters.');
  if (d.excursions.length > 30 || d.excursions.some(s => s.length > 300)) throw new Error('Use up to 30 excursions, with at most 300 characters per line.');
  return d;
}
export function validateFiles(files) {
  if (files.length > MAX_PHOTOS) throw new Error(`Choose up to ${MAX_PHOTOS} photos at a time.`);
  for (const file of files) {
    if (!PHOTO_TYPES.has(file.type) && !isHeicPhoto(file)) throw new Error(`${file.name}: choose JPEG, PNG, WebP, or HEIC/HEIF.`);
    if (!file.size || file.size > MAX_ORIGINAL_BYTES) throw new Error(`${file.name}: each original must be under 20 MB.`);
  }
}
export function filterTrips(trips, search, year) {
  const words = search.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return trips.filter(t => (!year || t.startDate?.startsWith(year)) && words.every(w => `${t.title} ${t.locationLabel} ${t.address} ${t.country} ${t.description} ${(t.people || []).join(' ')} ${(t.excursions || []).join(' ')}`.toLocaleLowerCase().includes(w)));
}
export function tripStats(trips) {
  return { trips: trips.length, places: new Set(trips.map(t => `${Number(t.lat).toFixed(2)},${Number(t.lng).toFixed(2)}`)).size, friends: new Set(trips.flatMap(t => t.people || []).map(n => n.trim().toLocaleLowerCase())).size };
}
export function dateLabel(start, end = '') {
  const format = s => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${s}T12:00:00Z`));
  try { return end && end !== start ? `${format(start)} — ${format(end)}` : format(start); } catch { return 'Date not added'; }
}
export function photoPath(tripId, uid, photoId) { return `tripPhotos/${tripId}/${uid}/${photoId}.jpg`; }
