import { firebaseConfig, PORTAL_ACCOUNT_EMAIL } from '../viro/firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { initializeAuth, inMemoryPersistence, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, onSnapshot, query, orderBy, limit, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js';
import { photoPath } from './model.js';

// Isolated, memory-only editor login: the portal session is never replaced or persisted here.
const app = initializeApp(firebaseConfig, 'travel-journal-editor');
const auth = initializeAuth(app, { persistence: inMemoryPersistence });
const db = getFirestore(app), storage = getStorage(app);
function normalizeTrip(data, id) {
  return { ...data, id, people: Array.isArray(data.people) ? data.people.filter(n => typeof n === 'string').map(n => n.slice(0, 60)) : [], excursions: Array.isArray(data.excursions) ? data.excursions.filter(n => typeof n === 'string').map(n => n.slice(0, 300)) : [] };
}
export const isEditor = user => user?.email === PORTAL_ACCOUNT_EMAIL;
export async function unlockEditor(pin) {
  const result = await signInWithEmailAndPassword(auth, PORTAL_ACCOUNT_EMAIL, pin);
  if (!isEditor(result.user)) { await signOut(auth); throw new Error('Owner access required.'); }
  return result.user;
}
export const lockEditor = () => signOut(auth);
export const watchEditor = callback => onAuthStateChanged(auth, user => callback(isEditor(user) ? user : null));
export async function requireEditor() {
  await auth.authStateReady();
  if (!isEditor(auth.currentUser)) throw new Error('Unlock editing mode first.');
  return auth.currentUser;
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
  const user = await requireEditor();
  if (existing) await updateDoc(doc(db, 'trips', id), { ...values, updatedAt: serverTimestamp() });
  else await setDoc(doc(db, 'trips', id), { ...values, createdBy: user.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), coverPath: '' });
}
export async function setCover(tripId, storagePath) { await requireEditor(); await updateDoc(doc(db, 'trips', tripId), { coverPath: storagePath, updatedAt: serverTimestamp() }); }
const urls = new Map();
export async function imageUrl(path) {
  if (!/^tripPhotos\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.jpg$/.test(path || '')) throw new Error('Invalid photo path.');
  if (!urls.has(path)) urls.set(path, getDownloadURL(ref(storage, path)).catch(err => { urls.delete(path); throw err; }));
  return urls.get(path);
}
export async function uploadPhoto(tripId, blob, info, onProgress) {
  const user = await requireEditor(), photo = doc(collection(db, 'trips', tripId, 'photos'));
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
  await requireEditor();
  try { await deleteObject(ref(storage, photo.storagePath)); } catch (err) { if (err.code !== 'storage/object-not-found') throw err; }
  await deleteDoc(doc(db, 'trips', tripId, 'photos', photo.id));
  urls.delete(photo.storagePath);
}

export async function removeTrip(tripId) {
  await requireEditor();
  // Remove all photos, including pending uploads and entries beyond the visible gallery page.
  const snapshot = await getDocs(collection(db, 'trips', tripId, 'photos'));
  for (const photo of snapshot.docs) await removePhoto(tripId, { ...photo.data(), id: photo.id });
  await deleteDoc(doc(db, 'trips', tripId));
}

// Public place collections; every mutation requires the same owner login as Trips.
const collectionRef = id => doc(db, 'placeCollections', id);
const placeRef = (id, placeId) => doc(db, 'placeCollections', id, 'places', placeId);
const placePhotos = (id, placeId) => collection(db, 'placeCollections', id, 'places', placeId, 'photos');
export const newCollectionId = () => doc(collection(db, 'placeCollections')).id;
export const newPlaceId = id => doc(collection(db, 'placeCollections', id, 'places')).id;
export const watchCollections = (success, failure) => onSnapshot(query(collection(db, 'placeCollections'), orderBy('createdAt', 'desc')), s => success(s.docs.map(d => ({...d.data(),id:d.id}))), failure);
export const watchPlaces = (id, success, failure) => onSnapshot(collection(db, 'placeCollections', id, 'places'), s => success(s.docs.map(d => ({...d.data(),id:d.id}))), failure);
export const watchPlacePhotos = (id, placeId, success, failure) => onSnapshot(query(placePhotos(id, placeId), where('status', '==', 'ready')), s => success(s.docs.map(d => ({...d.data(),id:d.id}))), failure);
export async function saveCollection(id, values, existing = false) {
  const user = await requireEditor();
  if (existing) await updateDoc(collectionRef(id), {...values,updatedAt:serverTimestamp()});
  else await setDoc(collectionRef(id), {...values,createdBy:user.uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
}
export async function savePlace(id, placeId, values, existing = false) {
  const user = await requireEditor();
  if (existing) await updateDoc(placeRef(id,placeId), {...values,updatedAt:serverTimestamp()});
  else await setDoc(placeRef(id,placeId), {...values,createdBy:user.uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),coverPath:''});
}
export async function collectionImageUrl(path) {
  if (!/^collectionPhotos\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.jpg$/.test(path || '')) throw new Error('Invalid collection photo path.');
  if (!urls.has(path)) urls.set(path,getDownloadURL(ref(storage,path)).catch(error => {urls.delete(path);throw error;}));
  return urls.get(path);
}
export async function uploadPlacePhoto(id, placeId, blob, info, progress) {
  const user = await requireEditor(), photo = doc(placePhotos(id,placeId));
  const path = `collectionPhotos/${id}/${placeId}/${user.uid}/${photo.id}.jpg`, file=ref(storage,path);
  await setDoc(photo,{uploaderId:user.uid,storagePath:path,width:info.width,height:info.height,createdAt:serverTimestamp(),status:'pending'});
  try {
    await new Promise((resolve,reject) => {const task=uploadBytesResumable(file,blob,{contentType:'image/jpeg'});task.on('state_changed',s=>progress(s.bytesTransferred/s.totalBytes),reject,resolve);});
    await updateDoc(photo,{status:'ready'});
  } catch (error) {
    try {await deleteObject(file);await deleteDoc(photo);} catch (cleanup) {if(cleanup.code==='storage/object-not-found') await deleteDoc(photo).catch(()=>{});}
    throw error;
  }
  // Cover failure must not cause a successfully uploaded photo to be uploaded again.
  const current = await getDoc(placeRef(id,placeId)).catch(()=>null);
  if(current?.exists() && !current.data().coverPath) await updateDoc(placeRef(id,placeId),{coverPath:path,updatedAt:serverTimestamp()}).catch(()=>{});
  return {id:photo.id,storagePath:path};
}
export async function setPlaceCover(id, placeId, path) {await requireEditor();await updateDoc(placeRef(id,placeId),{coverPath:path,updatedAt:serverTimestamp()});}
export async function removePlacePhoto(id, placeId, photo) {
  await requireEditor();
  try {await deleteObject(ref(storage,photo.storagePath));} catch(error) {if(error.code!=='storage/object-not-found') throw error;}
  await deleteDoc(doc(placePhotos(id,placeId),photo.id));urls.delete(photo.storagePath);
  const place=await getDoc(placeRef(id,placeId));
  if(place.exists() && place.data().coverPath===photo.storagePath) await setPlaceCover(id,placeId,'');
}
export async function removePlace(id, placeId) {
  await requireEditor();
  const photos=await getDocs(placePhotos(id,placeId));
  for(const photo of photos.docs) await removePlacePhoto(id,placeId,{...photo.data(),id:photo.id});
  await deleteDoc(placeRef(id,placeId));
}
export async function removeCollection(id) {
  await requireEditor();
  const places=await getDocs(collection(db,'placeCollections',id,'places'));
  for(const place of places.docs) await removePlace(id,place.id);
  await deleteDoc(collectionRef(id));
}
