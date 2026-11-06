const text = (value, max) => String(value ?? '').trim().slice(0, max + 1);
export function validateCollection(values) {
  const title = text(values.title, 80), description = text(values.description, 500);
  if (!title || title.length > 80) throw new Error('Give the collection a name, up to 80 characters.');
  if (description.length > 500) throw new Error('Keep the description under 500 characters.');
  return { title, description };
}
export function validatePlace(values) {
  const name = text(values.name, 180), address = text(values.address, 300), notes = text(values.notes, 6000);
  const lat = Number(values.lat), lng = Number(values.lng), rating = Number(values.rating || 0);
  if (!name || name.length > 180) throw new Error('Add a place name, up to 180 characters.');
  if (address.length > 300 || notes.length > 6000) throw new Error('Keep the address under 300 characters and notes under 6,000.');
  if (String(values.lat ?? '').trim() === '' || String(values.lng ?? '').trim() === '' || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 85 || Math.abs(lng) > 180) throw new Error('Choose a location on the map.');
  if (!Number.isInteger(rating) || rating < 0 || rating > 5) throw new Error('Choose a rating from 1 to 5, or leave it unrated.');
  return { name, address, notes, lat, lng, rating };
}
export function sortPlaces(places, search = '', sort = 'relevance') {
  const query = search.toLocaleLowerCase().trim(), words = query.split(/\s+/).filter(Boolean);
  const score = p => { const name=p.name.toLocaleLowerCase(), address=(p.address || '').toLocaleLowerCase(); return (name === query && query ? 100 : 0) + words.reduce((n,w) => n + (name.includes(w) ? 10 : 0) + (address.includes(w) ? 3 : 0), 0); };
  const time = p => p.createdAt?.seconds || 0;
  return places.filter(p => words.every(w => `${p.name} ${p.address} ${p.notes}`.toLocaleLowerCase().includes(w))).sort((a,b) => (sort === 'rating' ? b.rating-a.rating : score(b)-score(a)) || time(b)-time(a) || a.name.localeCompare(b.name));
}
