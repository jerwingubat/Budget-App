import { useState, useMemo } from 'react';
import { useCollection, useCategories } from '../hooks/useFirestore';
import { fmt, currentMonth } from '../utils';
import { Modal, FormField, ProgressBar, EmptyState } from '../components/UI';

export default function Budgets() {
  const { items: budgets, add, update, remove } = useCollection('budgets');
  const { items: transactions } = useCollection('transactions');
  const { categories } = useCategories();
  const [modal, setModal] = useState(null);

  const month = currentMonth();

  const spentMap = useMemo(() => {
    const map = {};
    transactions
      .filter(t => t.type === 'expense' && t.date?.startsWith(month))
      .forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return map;
  }, [transactions, month]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const entry = { category: f.category.value, limit: parseFloat(f.limit.value) };
    if (modal?.id) {
      await update(modal.id, entry);
    } else {
      await add(entry);
    }
    setModal(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this budget?')) return;
    await remove(id);
  };

  return (
    <div>
      <h1>Budget Categories</h1>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={() => setModal({})}>+ Add Budget</button>
      </div>
      {budgets.length === 0 ? (
        <EmptyState message="No budgets set. Add one to start tracking." />
      ) : (
        <div className="budgets-grid">
          {budgets.map(b => {
            const spent = spentMap[b.category] || 0;
            const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
            const remaining = b.limit - spent;
            return (
              <div key={b.id} className="budget-card">
                <h4>{b.category}</h4>
                <div className="budget-amounts">
                  <span>{fmt(spent)} spent</span>
                  <span>{fmt(b.limit)} limit</span>
                </div>
                <ProgressBar percent={pct} />
                <div className="budget-status">
                  {pct.toFixed(0)}% used &middot; {fmt(remaining)} remaining
                </div>
                <div className="budget-actions">
                  <button className="btn btn-sm btn-secondary" onClick={() => setModal(b)}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(b.id)}>Del</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {modal !== null && (
        <Modal title={modal.id ? 'Edit Budget' : 'Add Budget'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <FormField label="Category">
              <select name="category" defaultValue={modal.category || categories[0]} required>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Monthly Limit">
              <input type="number" name="limit" step="0.01" min="0.01" defaultValue={modal.limit || ''} required />
            </FormField>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{modal.id ? 'Update' : 'Add'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
