import { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import {
  addItem, updateItem, deleteItem, subscribeToCollection, subscribeToSharesFor
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

// Debts another user has shared with the current user (read-only).
export function useSharedDebts(retry = 0) {
  const { user } = useAuth();
  const [shares, setShares] = useState([]);
  const [debtsByOwner, setDebtsByOwner] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      setShares([]);
      setDebtsByOwner({});
      return;
    }
    setLoading(true);
    setError(null);
    let disposed = false;
    const subs = new Map();

    const describeError = (err, fallback) => {
      const code = err?.code || err?.name || 'unknown';
      const detail = (err?.message || String(err)).split('\n')[0];
      return `${fallback} (${code}${detail ? ' — ' + detail : ''})`;
    };

    const cleanupOwner = (ownerUid) => {
      const unsub = subs.get(ownerUid);
      if (unsub) { unsub(); subs.delete(ownerUid); }
    };

    const unsubShares = subscribeToSharesFor(
      user.email,
      (incoming) => {
        if (disposed) return;
        setShares(incoming);
        const desired = new Set(incoming.map(s => s.ownerUid));
        for (const owner of [...subs.keys()]) {
          if (!desired.has(owner)) {
            cleanupOwner(owner);
            setDebtsByOwner(prev => {
              if (!(owner in prev)) return prev;
              const next = { ...prev };
              delete next[owner];
              return next;
            });
          }
        }
        desired.forEach((owner) => {
          if (!subs.has(owner)) {
            const unsub = subscribeToCollection(owner, 'debts', (data) => {
              if (disposed) return;
              setDebtsByOwner(prev => {
                if (prev[owner] === data) return prev;
                return { ...prev, [owner]: data };
              });
              setLoading(false);
            }, (err) => {
              if (disposed) return;
              setError(describeError(err, 'Could not load shared debts. Make sure sharing rules are deployed (see README).'));
              setLoading(false);
            });
            subs.set(owner, unsub);
          }
        });
        if (incoming.length === 0) setLoading(false);
      },
      (err) => {
        if (disposed) return;
        setError(describeError(err, 'Could not check for shared debts. Make sure sharing rules are deployed (see README).'));
        setLoading(false);
      }
    );

    return () => {
      disposed = true;
      unsubShares();
      subs.forEach(u => u());
      subs.clear();
    };
  }, [user, retry]);

  const debts = useMemo(() => Object.values(debtsByOwner).flat(), [debtsByOwner]);
  return { shares, debtsByOwner, debts, loading, error };
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
