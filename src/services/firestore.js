import {
  collection, collectionGroup, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, where, getDocs, onSnapshot, serverTimestamp, setDoc
} from 'firebase/firestore';
import { db } from '../firebase';

function userCol(userId, col) {
  return collection(db, 'users', userId, col);
}

function userDoc(userId, col, id) {
  return doc(db, 'users', userId, col, id);
}

// Generic CRUD
export async function addItem(userId, collectionName, data) {
  const docRef = await addDoc(userCol(userId, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateItem(userId, collectionName, id, data) {
  await updateDoc(userDoc(userId, collectionName, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteItem(userId, collectionName, id) {
  await deleteDoc(userDoc(userId, collectionName, id));
}

// Real-time subscription
export function subscribeToCollection(userId, collectionName, callback, onError = () => {}) {
  const q = query(userCol(userId, collectionName), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(items);
  }, onError);
}

// One-time fetch
export async function fetchCollection(userId, collectionName) {
  const q = query(userCol(userId, collectionName), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Helpers
export function userCategoriesDoc(userId) {
  return doc(db, 'users', userId, 'settings', 'categories');
}

export async function saveCategories(userId, categories) {
  await updateDoc(userCategoriesDoc(userId), { categories }).catch(async () => {
    await addDoc(collection(db, 'users', userId, 'settings'), {
      id: 'categories',
      categories,
      createdAt: serverTimestamp(),
    });
  });
}

// ─── Debt Sharing ──────────────────────────────────────────
// Share access to debts: doc id is the lowercased email of the
// recipient and carries the optional category scope ('' = all).
export async function setShare(userId, email, data) {
  const normalized = email.trim().toLowerCase();
  await setDoc(doc(db, 'users', userId, 'shares', normalized), {
    ...data,
    email: normalized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function deleteShare(userId, email) {
  await deleteDoc(doc(db, 'users', userId, 'shares', email.trim().toLowerCase()));
}

// Shared debts for a recipient: constrain the query to the scoped
// category so it matches the security rules. Rules reject a list query
// that would return documents outside the shared scope.
export function subscribeToSharedDebts(ownerUid, category, callback, onError = () => {}) {
  const col = userCol(ownerUid, 'debts');
  const q = category
    ? query(col, where('category', '==', category))
    : query(col, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(items);
  }, onError);
}

// Finds shares granted TO this email from any user, ready for a
// collection-group query.
export function subscribeToSharesFor(email, callback, onError = () => {}) {
  const q = query(collectionGroup(db, 'shares'), where('email', '==', email.trim().toLowerCase()));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(d => ({
      id: d.id,
      ownerUid: d.ref.parent.parent.id,
      ...d.data(),
    }));
    callback(items);
  }, onError);
}
