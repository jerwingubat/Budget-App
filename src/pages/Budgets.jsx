import { useState, useMemo } from 'react';
import { useCollection, useCategories } from '../hooks/useFirestore';
import { fmt, currentMonth } from '../utils';
import { Modal, FormField, FormRow, ProgressBar, EmptyState, useToast } from '../components/UI';

export default function Budgets() {
  const { items: budgets, add, update, remove } = useCollection('budgets');
  const { items: transactions } = useCollection('transactions');
  const { categories } = useCategories();
  const { addToast } = useToast();
  const [modal, setModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const month = currentMonth();

  const spentMap = useMemo(() => {
    const map = {};
    transactions
      .filter(t => t.type === 'expense' && t.date?.startsWith(month))
      .forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return map;
  }, [transactions, month]);

  const totalBudget = budgets.reduce((s, b) => s + (b.limit || 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + (spentMap[b.category] || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const entry = { category: f.category.value, limit: parseFloat(f.limit.value) };
    try {
      if (modal?.id) {
        await update(modal.id, entry);
        addToast('Budget updated', 'success');
      } else {
        await add(entry);
        addToast('Budget added', 'success');
      }
      setModal(null);
    } catch {
      addToast('Something went wrong', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await remove(deleteConfirm.id);
    addToast('Budget deleted', 'success');
    setDeleteConfirm(null);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Budgets</h1>
          <p className="page-sub">{fmt(totalSpent)} of {fmt(totalBudget)} budgeted this month</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({})}>+ Add Budget</button>
      </div>

      {budgets.length === 0 ? (
        <div className="panel">
          <EmptyState icon="◔" message="No budgets set. Add one to start tracking." />
        </div>
      ) : (
        <div className="budgets-grid">
          {budgets.map(b => {
            const spent = spentMap[b.category] || 0;
            const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
            const remaining = b.limit - spent;
            const overBudget = spent > b.limit;
            return (
              <div key={b.id} className={`budget-card ${overBudget ? 'over-budget' : ''}`}>
                <div className="budget-card-head">
                  <h4>{b.category}</h4>
                  <span className={`budget-pct ${overBudget ? 'pct-over' : pct > 70 ? 'pct-warn' : 'pct-ok'}`}>{pct.toFixed(0)}%</span>
                </div>
                <ProgressBar percent={pct} />
                <div className="budget-card-body">
                  <div className="budget-stat">
                    <span className="budget-stat-label">Spent</span>
                    <span className="budget-stat-val">{fmt(spent)}</span>
                  </div>
                  <div className="budget-stat">
                    <span className="budget-stat-label">Limit</span>
                    <span className="budget-stat-val">{fmt(b.limit)}</span>
                  </div>
                  <div className="budget-stat">
                    <span className="budget-stat-label">Remaining</span>
                    <span className={`budget-stat-val ${overBudget ? 'text-danger' : 'text-success'}`}>{fmt(remaining)}</span>
                  </div>
                </div>
                <div className="card-actions">
                  <button className="btn-icon" title="Edit" onClick={() => setModal(b)}>✎</button>
                  <button className="btn-icon btn-icon-danger" title="Delete" onClick={() => setDeleteConfirm(b)}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal !== null && (
        <Modal title={modal.id ? 'Edit Budget' : 'New Budget'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <FormField label="Category">
              <select name="category" defaultValue={modal.category || categories[0]} required>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Monthly Limit">
              <input type="number" name="limit" step="0.01" min="0.01" defaultValue={modal.limit || ''} required placeholder="0.00" />
            </FormField>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{modal.id ? 'Save Changes' : 'Add Budget'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="Delete Budget" onClose={() => setDeleteConfirm(null)}>
          <p className="confirm-text">Delete budget for <strong>{deleteConfirm.category}</strong>?</p>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
