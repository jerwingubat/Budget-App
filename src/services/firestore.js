import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, getDocs, onSnapshot, serverTimestamp
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
export function subscribeToCollection(userId, collectionName, callback) {
  const q = query(userCol(userId, collectionName), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(items);
  });
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
