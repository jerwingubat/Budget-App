import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import {
  addItem, updateItem, deleteItem, subscribeToCollection
} from '../services/firestore';

const DEFAULT_CATEGORIES = [
  'Housing', 'Food', 'Transport', 'Utilities', 'Entertainment',
  'Healthcare', 'Shopping', 'Education', 'Savings', 'Other',
];

export function useCollection(collectionName) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsub = subscribeToCollection(user.uid, collectionName, (data) => {
      setItems(data);
      setLoading(false);
    });
    return unsub;
  }, [user, collectionName]);

  const add = (data) => addItem(user.uid, collectionName, data);
  const update = (id, data) => updateItem(user.uid, collectionName, id, data);
  const remove = (id) => deleteItem(user.uid, collectionName, id);

  return { items, loading, add, update, remove };
}

export function useCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const ref = doc(db, 'users', user.uid, 'settings', 'categories');
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().categories) {
        setCategories(snap.data().categories);
      } else {
        setCategories(DEFAULT_CATEGORIES);
        await setDoc(ref, { categories: DEFAULT_CATEGORIES }, { merge: true });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const save = async (newCategories) => {
    setCategories(newCategories);
    const ref = doc(db, 'users', user.uid, 'settings', 'categories');
    await setDoc(ref, { categories: newCategories }, { merge: true });
  };

  return { categories, loading, save };
}
