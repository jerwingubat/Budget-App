import { useState, useMemo } from 'react';
import { useCollection, useCategories } from '../hooks/useFirestore';
import { fmt, today } from '../utils';
import { Modal, FormField, FormRow, EmptyState } from '../components/UI';

export default function Transactions() {
  const { items: transactions, add, update, remove } = useCollection('transactions');
  const { categories } = useCategories();
  const [modal, setModal] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [filterMonth, setFilterMonth] = useState('');

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (filterType !== 'all') list = list.filter(t => t.type === filterType);
    if (filterCat !== 'all') list = list.filter(t => t.category === filterCat);
    if (filterMonth) list = list.filter(t => t.date?.startsWith(filterMonth));
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [transactions, filterType, filterCat, filterMonth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const entry = {
      type: f.type.value,
      amount: parseFloat(f.amount.value),
      description: f.description.value,
      category: f.category.value,
      date: f.date.value,
    };
    if (modal?.id) {
      await update(modal.id, entry);
    } else {
      await add(entry);
    }
    setModal(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    await remove(id);
  };

  return (
    <div>
      <h1>Transactions</h1>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={() => setModal({})}>+ Add Transaction</button>
        <div className="filter-group">
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
        </div>
      </div>
      <table className="data-table">
        <thead>
          <tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr><td colSpan="5"><EmptyState message="No transactions found" /></td></tr>
          ) : filtered.map(t => (
            <tr key={t.id}>
              <td>{t.date}</td>
              <td>{t.description}</td>
              <td>{t.category}</td>
              <td className={`tx-amount ${t.type}`}>{t.type === 'income' ? '+' : '-'}{fmt(t.amount)}</td>
              <td>
                <button className="btn btn-sm btn-secondary" onClick={() => setModal(t)}>Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)}>Del</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {modal !== null && (
        <Modal title={modal.id ? 'Edit Transaction' : 'Add Transaction'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <FormRow>
              <FormField label="Type">
                <select name="type" defaultValue={modal.type || 'expense'} required>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </FormField>
              <FormField label="Amount">
                <input type="number" name="amount" step="0.01" min="0.01" defaultValue={modal.amount || ''} required />
              </FormField>
            </FormRow>
            <FormField label="Description">
              <input type="text" name="description" defaultValue={modal.description || ''} required />
            </FormField>
            <FormRow>
              <FormField label="Category">
                <select name="category" defaultValue={modal.category || categories[0]} required>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FormField>
              <FormField label="Date">
                <input type="date" name="date" defaultValue={modal.date || today()} required />
              </FormField>
            </FormRow>
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
