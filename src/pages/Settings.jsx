import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCategories } from '../hooks/useFirestore';
import { fetchCollection, addItem as fbAddItem } from '../services/firestore';
import { CATEGORY_COLORS } from '../utils';
import { useToast } from '../components/UI';

export default function Settings() {
  const { user } = useAuth();
  const { categories, save } = useCategories();
  const { addToast } = useToast();
  const [newCat, setNewCat] = useState('');
  const [importing, setImporting] = useState(false);

  const addCategory = async () => {
    const name = newCat.trim();
    if (!name) return;
    if (categories.includes(name)) { addToast('Category already exists', 'error'); return; }
    await save([...categories, name]);
    setNewCat('');
    addToast('Category added', 'success');
  };

  const removeCategory = async (name) => {
    await save(categories.filter(c => c !== name));
    addToast('Category removed', 'success');
  };

  const exportJSON = async () => {
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
    addToast('JSON exported', 'success');
  };

  const exportCSV = () => {
    const rows = [['Date', 'Type', 'Category', 'Description', 'Amount']];
    const all = [];
    const unsub = null;
    fetchCollection(user.uid, 'transactions').then(txs => {
      txs.forEach(t => rows.push([t.date, t.type, t.category, t.description, t.amount]));
      const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `budgetflow_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      addToast('CSV exported', 'success');
    });
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
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
        addToast('Data imported successfully!', 'success');
      } catch {
        addToast('Invalid file format', 'error');
      }
      setImporting(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="page-sub">Manage your data and categories</p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="panel">
          <h3>Export Data</h3>
          <p className="text-dim" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Download your data as JSON (full backup) or CSV (transactions only).</p>
          <div className="settings-actions">
            <button className="btn btn-primary" onClick={exportJSON}>Export JSON</button>
            <button className="btn btn-secondary" onClick={exportCSV}>Export CSV</button>
          </div>
        </div>

        <div className="panel">
          <h3>Import Data</h3>
          <p className="text-dim" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Restore from a previously exported JSON backup.</p>
          <label className={`btn btn-secondary ${importing ? 'btn-disabled' : ''}`} style={{ cursor: 'pointer' }}>
            {importing ? 'Importing...' : 'Import JSON'}
            <input type="file" accept=".json" onChange={importData} style={{ display: 'none' }} disabled={importing} />
          </label>
        </div>

        <div className="panel panel-full">
          <h3>Categories</h3>
          <p className="text-dim" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Manage transaction categories. Changes apply everywhere.</p>
          <div className="categories-manager">
            {categories.map(c => (
              <div key={c} className="category-tag">
                <span className="category-dot" style={{ background: CATEGORY_COLORS[c] || '#64748b' }} />
                <span>{c}</span>
                <button className="btn-icon btn-icon-danger btn-icon-sm" title="Remove" onClick={() => removeCategory(c)}>✕</button>
              </div>
            ))}
          </div>
          <div className="add-category-row">
            <input
              type="text"
              className="add-category-input"
              placeholder="New category name"
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCategory()}
            />
            <button className="btn btn-primary btn-sm" onClick={addCategory}>Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}
