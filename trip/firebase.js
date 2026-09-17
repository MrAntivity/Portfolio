import { firebaseConfig } from '../viro/firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { initializeAuth, browserLocalPersistence, inMemoryPersistence, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, updateDoc, deleteDoc, getDoc, onSnapshot, query, orderBy, limit, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js';
import { photoPath } from './model.js';

// A separate named app prevents guest sessions from replacing the private portal login.
// Avoid IndexedDB auth persistence, which can fail on devices with a broken local store.
const app = initializeApp(firebaseConfig, 'travel-journal');
const auth = initializeAuth(app, { persistence: [browserLocalPersistence, inMemoryPersistence] });
const db = getFirestore(app), storage = getStorage(app);
function normalizeTrip(data, id) {
  return { ...data, id, people: Array.isArray(data.people) ? data.people.filter(n => typeof n === 'string').map(n => n.slice(0, 60)) : [], excursions: Array.isArray(data.excursions) ? data.excursions.filter(n => typeof n === 'string').map(n => n.slice(0, 300)) : [] };
}
let signingIn;
export async function guest() {
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;
  if (!signingIn) signingIn = signInAnonymously(auth).then(r => r.user).finally(() => { signingIn = null; });
  return signingIn;
}
export async function currentGuest() { await auth.authStateReady(); return auth.currentUser; }
export const newTripId = () => doc(collection(db, 'trips')).id;
export function watchTrips(success, failure) {
  return onSnapshot(query(collection(db, 'trips'), orderBy('startDate', 'desc')), s => success(s.docs.map(d => normalizeTrip(d.data(), d.id))), failure);
}
export function watchTrip(id, success, failure) {
  return onSnapshot(doc(db, 'trips', id), s => success(s.exists() ? normalizeTrip(s.data(), s.id) : null), failure);
}
export function watchPhotos(id, count, success, failure) {
  // Sort client-side to avoid requiring a composite index on status + createdAt.
  return onSnapshot(query(collection(db, 'trips', id, 'photos'), where('status', '==', 'ready'), limit(count)), s => success(s.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))), failure);
}
export async function saveTrip(id, values, existing = false) {
  const user = await guest();
  if (existing) await updateDoc(doc(db, 'trips', id), { ...values, updatedAt: serverTimestamp() });
  else await setDoc(doc(db, 'trips', id), { ...values, createdBy: user.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), coverPath: '' });
}
export async function setCover(tripId, storagePath) { await updateDoc(doc(db, 'trips', tripId), { coverPath: storagePath, updatedAt: serverTimestamp() }); }
const urls = new Map();
export async function imageUrl(path) {
  if (!/^tripPhotos\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.jpg$/.test(path || '')) throw new Error('Invalid photo path.');
  if (!urls.has(path)) urls.set(path, getDownloadURL(ref(storage, path)).catch(err => { urls.delete(path); throw err; }));
  return urls.get(path);
}
export async function uploadPhoto(tripId, blob, info, onProgress) {
  const user = await guest(), photo = doc(collection(db, 'trips', tripId, 'photos'));
  const path = photoPath(tripId, user.uid, photo.id), file = ref(storage, path);
  await setDoc(photo, { uploaderId: user.uid, uploaderName: info.name, caption: info.caption, storagePath: path, width: info.width, height: info.height, createdAt: serverTimestamp(), status: 'pending' });
  try {
    await new Promise((resolve, reject) => {
      const task = uploadBytesResumable(file, blob, { contentType: 'image/jpeg', cacheControl: 'public,max-age=31536000,immutable' });
      task.on('state_changed', s => onProgress(s.bytesTransferred / s.totalBytes), reject, resolve);
    });
    await updateDoc(photo, { status: 'ready' });
    return { id: photo.id, storagePath: path };
  } catch (err) {
    // Only clean up the unsuccessful upload; completed photos in the batch stay saved.
    let cleaned = false;
    try { await deleteObject(file); cleaned = true; } catch (cleanup) { cleaned = cleanup.code === 'storage/object-not-found'; }
    if (cleaned) await deleteDoc(photo).catch(() => {});
    throw err;
  }
}
export async function removePhoto(tripId, photo) {
  await guest();
  try { await deleteObject(ref(storage, photo.storagePath)); } catch (err) { if (err.code !== 'storage/object-not-found') throw err; }
  await deleteDoc(doc(db, 'trips', tripId, 'photos', photo.id));
  urls.delete(photo.storagePath);
}
