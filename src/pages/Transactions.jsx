import { useState, useMemo, useCallback } from 'react';
import { useCollection, useCategories } from '../hooks/useFirestore';
import { fmt, today } from '../utils';
import { Modal, FormField, FormRow, EmptyState, SearchInput, Tabs, FAB, useKbdShortcut, useToast, SkeletonTable } from '../components/UI';

const PAGE_SIZE = 15;

export default function Transactions() {
  const { items: transactions, add, update, remove, loading } = useCollection('transactions');
  const { categories } = useCategories();
  const { addToast } = useToast();

  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [filterMonth, setFilterMonth] = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const openAdd = useCallback(() => setModal({}), []);
  useKbdShortcut('mod+k', openAdd);

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q)
      );
    }
    if (filterType !== 'all') list = list.filter(t => t.type === filterType);
    if (filterCat !== 'all') list = list.filter(t => t.category === filterCat);
    if (filterMonth) list = list.filter(t => t.date?.startsWith(filterMonth));
    list.sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (sortKey === 'amount') { va = Number(va); vb = Number(vb); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [transactions, search, filterType, filterCat, filterMonth, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sortIcon = (key) => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

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
    try {
      if (modal?.id) {
        await update(modal.id, entry);
        addToast('Transaction updated', 'success');
      } else {
        await add(entry);
        addToast('Transaction added', 'success');
      }
      setModal(null);
    } catch {
      addToast('Something went wrong', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await remove(deleteConfirm.id);
    addToast('Transaction deleted', 'success');
    setDeleteConfirm(null);
  };

  const activeFilters = [filterType !== 'all', filterCat !== 'all', !!filterMonth].filter(Boolean).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Transactions</h1>
          <p className="page-sub">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Transaction</button>
      </div>

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search transactions... (⌘K)" />
        <div className="filter-pills">
          <Tabs
            tabs={[
              { value: 'all', label: 'All' },
              { value: 'income', label: 'Income' },
              { value: 'expense', label: 'Expense' },
            ]}
            active={filterType}
            onChange={setFilterType}
          />
          <select className="filter-select" value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }}>
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="month" className="filter-select" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setPage(1); }} />
          {activeFilters > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilterType('all'); setFilterCat('all'); setFilterMonth(''); setSearch(''); setPage(1); }}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={8} cols={5} />
      ) : filtered.length === 0 ? (
        <div className="panel"><EmptyState icon="⇄" message="No transactions found" /></div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => toggleSort('date')}>Date{sortIcon('date')}</th>
                  <th className="sortable" onClick={() => toggleSort('description')}>Description{sortIcon('description')}</th>
                  <th className="sortable" onClick={() => toggleSort('category')}>Category{sortIcon('category')}</th>
                  <th className="sortable" onClick={() => toggleSort('amount')}>Amount{sortIcon('amount')}</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(t => (
                  <tr key={t.id}>
                    <td className="td-date">{t.date}</td>
                    <td>{t.description}</td>
                    <td><span className="cat-badge">{t.category}</span></td>
                    <td className={`tx-amount ${t.type}`}>{t.type === 'income' ? '+' : '-'}{fmt(t.amount)}</td>
                    <td className="td-actions">
                      <button className="btn-icon" title="Edit" onClick={() => setModal(t)}>✎</button>
                      <button className="btn-icon btn-icon-danger" title="Delete" onClick={() => setDeleteConfirm(t)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span className="page-info">Page {page} of {totalPages}</span>
              <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      <FAB onClick={openAdd} icon="+" label="Add" />

      {modal !== null && (
        <Modal title={modal.id ? 'Edit Transaction' : 'New Transaction'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <FormRow>
              <FormField label="Type">
                <select name="type" defaultValue={modal.type || 'expense'} required>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </FormField>
              <FormField label="Amount">
                <input type="number" name="amount" step="0.01" min="0.01" defaultValue={modal.amount || ''} required placeholder="0.00" />
              </FormField>
            </FormRow>
            <FormField label="Description">
              <input type="text" name="description" defaultValue={modal.description || ''} required placeholder="e.g. Grocery shopping" />
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
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{modal.id ? 'Save Changes' : 'Add Transaction'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="Delete Transaction" onClose={() => setDeleteConfirm(null)}>
          <p className="confirm-text">Are you sure you want to delete <strong>{deleteConfirm.description}</strong>?</p>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
