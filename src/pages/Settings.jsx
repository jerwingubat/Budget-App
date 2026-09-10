import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCategories } from '../hooks/useFirestore';
import { fetchCollection, addItem as fbAddItem } from '../services/firestore';
import { CATEGORY_COLORS } from '../utils';

export default function Settings() {
  const { user } = useAuth();
  const { categories, save } = useCategories();
  const [newCat, setNewCat] = useState('');

  const addCategory = async () => {
    const name = newCat.trim();
    if (!name) return;
    if (categories.includes(name)) { alert('Category already exists.'); return; }
    await save([...categories, name]);
    setNewCat('');
  };

  const removeCategory = async (name) => {
    if (!confirm(`Remove category "${name}"?`)) return;
    await save(categories.filter(c => c !== name));
  };

  const exportData = async () => {
    const data = {};
    for (const col of ['transactions', 'budgets', 'creditCards', 'creditTransactions', 'debts', 'payments']) {
      data[col] = await fetchCollection(user.uid, col);
    }
    data.categories = categories;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `budgetflow_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        for (const col of ['transactions', 'budgets', 'creditCards', 'creditTransactions', 'debts', 'payments']) {
          if (imported[col]) {
            for (const item of imported[col]) {
              const { id, createdAt, updatedAt, ...rest } = item;
              await fbAddItem(user.uid, col, rest);
            }
          }
        }
        if (imported.categories) await save(imported.categories);
        alert('Data imported successfully!');
      } catch {
        alert('Invalid file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div>
      <h1>Settings</h1>
      <div className="panel">
        <h3>Data Management</h3>
        <div className="settings-actions">
          <button className="btn btn-secondary" onClick={exportData}>Export Data</button>
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            Import Data
            <input type="file" accept=".json" onChange={importData} style={{ display: 'none' }} />
          </label>
        </div>
      </div>
      <div className="panel" style={{ marginTop: '1rem' }}>
        <h3>Categories</h3>
        <div id="categories-manager">
          {categories.map(c => (
            <div key={c} className="category-tag">
              <div className="donut-color" style={{ background: CATEGORY_COLORS[c] || '#b2bec3' }} />
              {c}
              <button onClick={() => removeCategory(c)}>&times;</button>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="New category name"
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
          />
          <button className="btn btn-primary" onClick={addCategory}>Add</button>
        </div>
      </div>
    </div>
  );
}
