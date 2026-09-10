import { useState, useMemo } from 'react';
import { useCollection } from '../hooks/useFirestore';
import { fmt, today } from '../utils';
import { Modal, FormField, FormRow, ProgressBar, EmptyState, useToast, SkeletonTable, Tabs } from '../components/UI';

export default function Debts() {
  const { items: debts, add: addDebt, update: updateDebt, remove: removeDebt, loading } = useCollection('debts');
  const { items: payments, add: addPayment, remove: removePayment } = useCollection('payments');
  const { addToast } = useToast();
  const [debtModal, setDebtModal] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [quickPay, setQuickPay] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [moveModal, setMoveModal] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [customStrategy, setCustomStrategy] = useState('snowball');
  const [filter, setFilter] = useState('all');
  const [filterCat, setFilterCat] = useState('all');

  const stats = useMemo(() => ({
    total: debts.reduce((s, d) => s + (d.balance || 0), 0),
    monthly: debts.reduce((s, d) => s + (d.minPayment || 0), 0),
    interest: debts.reduce((s, d) => s + ((d.balance || 0) * (d.rate || 0) / 100 / 12), 0),
  }), [debts]);

  const paidCount = debts.filter(d => (d.balance || 0) <= 0).length;
  const unpaidCount = debts.length - paidCount;

  const visibleDebts = useMemo(() => {
    let list = debts;
    if (filter === 'paid') list = list.filter(d => (d.balance || 0) <= 0);
    if (filter === 'unpaid') list = list.filter(d => (d.balance || 0) > 0);
    if (filterCat !== 'all') {
      if (filterCat === 'other') list = list.filter(d => !(d.category || '').trim());
      else list = list.filter(d => (d.category || '').trim() === filterCat);
    }
    return list;
  }, [debts, filter, filterCat]);

  const personNames = useMemo(() =>
    [...new Set(debts.map(d => (d.category || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  , [debts]);

  const grouped = useMemo(() => {
    const groups = {};
    visibleDebts.forEach(d => {
      const key = (d.category || '').trim() || 'Other';
      (groups[key] = groups[key] || []).push(d);
    });
    return Object.entries(groups)
      .map(([person, list]) => ({
        person,
        list,
        subtotal: list.reduce((s, d) => s + (d.balance || 0), 0),
      }))
      .sort((a, b) => b.subtotal - a.subtotal);
  }, [visibleDebts]);

  const customAlloc = useMemo(() => {
    if (!customAmount || isNaN(parseFloat(customAmount)) || parseFloat(customAmount) <= 0) return null;
    let amount = parseFloat(customAmount);
    const order = [...debts].sort((a, b) => {
      if (customStrategy === 'avalanche') return (b.rate || 0) - (a.rate || 0);
      return (a.balance || 0) - (b.balance || 0);
    });
    const allocations = [];
    for (const d of order) {
      if (amount <= 0 || d.balance <= 0) break;
      const pay = Math.min(amount, d.balance);
      allocations.push({ debt: d, amount: pay });
      amount -= pay;
    }
    return { allocations, unused: amount, allocated: parseFloat(customAmount) - amount };
  }, [debts, customAmount, customStrategy]);

  const handleCustomPay = async () => {
    if (!customAlloc || customAlloc.allocations.length === 0) return;
    const date = today();
    try {
      for (const { debt, amount } of customAlloc.allocations) {
        await addPayment({ debtId: debt.id, amount, date });
        await updateDebt(debt.id, { balance: Math.max(0, debt.balance - amount) });
      }
      const paid = customAlloc.allocated;
      addToast(customAlloc.unused > 0
        ? `Payment of ${fmt(paid)} applied · ${fmt(customAlloc.unused)} left after payoff`
        : `Payment of ${fmt(paid)} applied`, 'success');
      setCustomAmount('');
    } catch {
      addToast('Something went wrong', 'error');
    }
  };

  const handleDebtSubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const entry = {
      name: f.name.value,
      balance: parseFloat(f.balance.value),
      original: parseFloat(f.original.value),
      rate: parseFloat(f.rate.value),
      minPayment: parseFloat(f.minPayment.value),
      dueDate: f.dueDate.value,
      category: (f.category?.value || '').trim(),
    };
    try {
      if (debtModal?.id) {
        await updateDebt(debtModal.id, entry);
        addToast('Debt updated', 'success');
      } else {
        await addDebt(entry);
        addToast('Debt added', 'success');
      }
      setDebtModal(null);
    } catch {
      addToast('Something went wrong', 'error');
    }
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const debtId = payModal?.id || quickPay?.id;
    const amount = parseFloat(f.amount.value);
    await addPayment({ debtId, amount, date: f.date.value });
    const debt = debts.find(d => d.id === debtId);
    if (debt) await updateDebt(debtId, { balance: Math.max(0, debt.balance - amount) });
    addToast('Payment recorded', 'success');
    setPayModal(null);
    setQuickPay(null);
  };

  const handleDeleteDebt = async () => {
    if (!deleteConfirm) return;
    await removeDebt(deleteConfirm.id);
    addToast('Debt deleted', 'success');
    setDeleteConfirm(null);
  };

  const handleMoveSubmit = async (e) => {
    e.preventDefault();
    if (!moveModal) return;
    const f = e.target;
    const newCat = (f.newCat?.value || '').trim();
    const category = newCat || f.existing?.value || '';
    try {
      await updateDebt(moveModal.id, { category });
      addToast(
        category ? `Moved "${moveModal.name}" to ${category}` : `Moved "${moveModal.name}" to Other`,
        'success'
      );
      setMoveModal(null);
    } catch {
      addToast('Something went wrong', 'error');
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected(prev => {
      const visibleIds = visibleDebts.map(d => d.id);
      const allSelected = visibleIds.every(id => prev.has(id));
      const next = new Set(prev);
      if (allSelected) visibleIds.forEach(id => next.delete(id));
      else visibleIds.forEach(id => next.add(id));
      return next;
    });
  };

  const exitSelectMode = () => { setSelecting(false); setSelected(new Set()); };

  const handleBulkMoveSubmit = async (e) => {
    e.preventDefault();
    if (!bulkMoveOpen || selected.size === 0) return;
    const f = e.target;
    const newCat = (f.newCat?.value || '').trim();
    const category = newCat || f.existing?.value || '';
    try {
      for (const id of selected) {
        await updateDebt(id, { category });
      }
      addToast(
        `Moved ${selected.size} debt${selected.size > 1 ? 's' : ''} to ${category || 'Other'}`,
        'success'
      );
      setBulkMoveOpen(false);
      exitSelectMode();
    } catch {
      addToast('Something went wrong', 'error');
    }
  };

  const handleDeletePayment = async (p) => {
    const debt = debts.find(d => d.id === p.debtId);
    if (debt) await updateDebt(debt.id, { balance: debt.balance + p.amount });
    await removePayment(p.id);
    addToast('Payment deleted', 'success');
  };

  const sortedPayments = useMemo(() => [...payments].sort((a, b) => (b.date || '').localeCompare(a.date || '')), [payments]);

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1>Debt Tracker</h1></div>
        <SkeletonTable rows={3} cols={4} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Debt Tracker</h1>
          <p className="page-sub">{debts.length} debt{debts.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setDebtModal({})}>+ Add Debt</button>
      </div>

      <div className="kpi-grid kpi-3">
        <div className="kpi-card kpi-danger">
          <div className="kpi-header"><span className="kpi-icon" style={{ background: '#ef444418', color: '#ef4444' }}>▲</span></div>
          <div className="kpi-label">Total Debt</div>
          <div className="kpi-amount">{fmt(stats.total)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-icon" style={{ background: '#f59e0b18', color: '#f59e0b' }}>◇</span></div>
          <div className="kpi-label">Min. Monthly</div>
          <div className="kpi-amount">{fmt(stats.monthly)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-icon" style={{ background: '#8b5cf618', color: '#8b5cf6' }}>~</span></div>
          <div className="kpi-label">Interest / Month</div>
          <div className="kpi-amount">{fmt(stats.interest)}</div>
        </div>
      </div>

      <div className="panel custom-pay-panel">
        <div className="panel-head">
          <h3>Make a Custom Payment</h3>
        </div>
        <div className="custom-pay-row">
          <div className="custom-pay-field">
            <label>Amount</label>
            <div className="custom-pay-input-wrap">
              <span className="custom-pay-currency">₱</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCustomPay()}
              />
            </div>
          </div>
          <div className="custom-pay-field">
            <label>Strategy</label>
            <Tabs
              tabs={[
                { value: 'snowball', label: 'Snowball' },
                { value: 'avalanche', label: 'Avalanche' },
              ]}
              active={customStrategy}
              onChange={setCustomStrategy}
            />
            <span className="custom-pay-hint">
              {customStrategy === 'snowball' ? 'Pays off smallest balance first' : 'Pays off highest APR first'}
            </span>
          </div>
        </div>

        {customAlloc && customAlloc.allocations.length > 0 ? (
          <>
            <div className="custom-pay-preview">
              {customAlloc.allocations.map(a => {
                const paidOff = a.amount >= (a.debt.balance || 0);
                const newBalance = Math.max(0, a.debt.balance - a.amount);
                return (
                  <div key={a.debt.id} className="custom-pay-item">
                    <div className="custom-pay-item-main">
                      <span className="custom-pay-name">{a.debt.name}</span>
                      {paidOff && <span className="badge badge-paid">Paid off</span>}
                      <span className="custom-pay-new-bal">{fmt(newBalance)} left</span>
                    </div>
                    <span className="custom-pay-amount">-{fmt(a.amount)}</span>
                  </div>
                );
              })}
              {customAlloc.unused > 0 && (
                <div className="custom-pay-unused">₱{customAlloc.unused.toFixed(2)} remaining after paying off all debts</div>
              )}
            </div>
            <div className="custom-pay-footer">
              <span className="custom-pay-total">
                Total after: <strong>{fmt(Math.max(0, stats.total - customAlloc.allocated))}</strong>
              </span>
              <button className="btn btn-primary" onClick={handleCustomPay} disabled={customAlloc.allocations.length === 0}>
                Apply Payment
              </button>
            </div>
          </>
        ) : (
          customAmount && customAlloc && (
            <p className="custom-pay-hint">All debts are paid off. Nothing to allocate.</p>
          )
        )}
      </div>

      <div className="toolbar toolbar-inline">
        <Tabs
          tabs={[
            { value: 'all', label: `All (${debts.length})` },
            { value: 'unpaid', label: `Unpaid (${unpaidCount})` },
            { value: 'paid', label: `Paid (${paidCount})` },
          ]}
          active={filter}
          onChange={setFilter}
        />
        <button
          className={`btn ${selecting ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => selecting ? exitSelectMode() : setSelecting(true)}
        >
          {selecting ? 'Done' : 'Select'}
        </button>
        <select
          className="filter-select"
          value={filterCat}
          onChange={e => { setFilterCat(e.target.value); setSelected(new Set()); }}
        >
          <option value="all">All categories (👤)</option>
          {personNames.map(n =>
            <option key={n} value={n}>👤 {n}</option>
          )}
          {debts.some(d => !(d.category || '').trim()) && (
            <option value="other">🏷 Uncategorized</option>
          )}
        </select>
      </div>

      {selecting && (
        <div className="select-mode-bar">
          <span className="select-count">
            <strong>{selected.size}</strong> selected
          </span>
          <button className="btn btn-ghost btn-sm" onClick={toggleSelectAll}>Select all</button>
          <div className="select-actions">
            <button className="btn btn-primary btn-sm" disabled={selected.size === 0} onClick={() => setBulkMoveOpen(true)}>
              Move to category
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        </div>
      )}

      {debts.length === 0 ? (
        <div className="panel"><EmptyState icon="▲" message="No debts tracked. Add one to start." /></div>
      ) : visibleDebts.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon="✓"
            message={
              filterCat !== 'all'
                ? 'No debts match this category'
                : filter === 'paid'
                  ? 'No paid debts yet'
                  : 'All debts are paid off'
            }
            action={filter !== 'all' || filterCat !== 'all'
              ? <button className="btn btn-ghost btn-sm" onClick={() => { setFilter('all'); setFilterCat('all'); }}>Show all debts</button>
              : null}
          />
        </div>
      ) : (
        <div className="debt-groups">
          {grouped.map(g => (
            <div key={g.person} className="debt-group">
              <div className="debt-group-head">
                <div className="debt-group-title">
                  <span className="debt-group-icon">{g.person === 'Other' ? '🏷' : '👤'}</span>
                  <span className="debt-group-name">{g.person}</span>
                  <span className="debt-group-count">{g.list.length} debt{g.list.length !== 1 ? 's' : ''}</span>
                </div>
                <span className="debt-group-total">{fmt(g.subtotal)}</span>
              </div>
              <div className="debts-grid">
                {g.list.map(d => {
                  const paid = (d.original || 0) - (d.balance || 0);
                  const pct = d.original > 0 ? (paid / d.original) * 100 : 0;
                  const isSel = selected.has(d.id);
                  return (
                    <div
                      key={d.id}
                      className={`debt-card ${pct >= 100 ? 'debt-card-paid' : ''} ${selecting ? 'debt-card-selectable' : ''} ${isSel ? 'debt-card-selected' : ''}`}
                      onClick={selecting ? () => toggleSelect(d.id) : undefined}
                    >
                      {selecting && (
                        <div className={`debt-select-check ${isSel ? 'checked' : ''}`}>
                          {isSel ? '✓' : ''}
                        </div>
                      )}
                      <div className="debt-card-head">
                        <h4>{d.name}</h4>
                        <span className="debt-rate">{d.rate}% APR</span>
                      </div>
                      <div className="debt-balance">{fmt(d.balance)}</div>
                      <ProgressBar percent={pct} size="small" />
                      <div className="debt-category-badge">
                        <span className="debt-cat-icon">👤</span> {g.person}
                      </div>
                      <div className="debt-card-body">
                        <div className="debt-stat"><span>Original</span><span>{fmt(d.original)}</span></div>
                        <div className="debt-stat"><span>Min Payment</span><span>{fmt(d.minPayment)}/mo</span></div>
                        <div className="debt-stat"><span>Due</span><span>{d.dueDate}</span></div>
                        <div className="debt-stat"><span>Paid Off</span><span>{pct.toFixed(0)}%</span></div>
                      </div>
                      {!selecting && (
                        <div className="card-actions">
                          <button className="btn btn-primary btn-sm" onClick={() => setQuickPay(d)}>Pay</button>
                          <button className="btn-icon" title="Move to category" onClick={() => setMoveModal(d)}>⇄</button>
                          <button className="btn-icon" title="Edit" onClick={() => setDebtModal(d)}>✎</button>
                          <button className="btn-icon btn-icon-danger" title="Delete" onClick={() => setDeleteConfirm(d)}>✕</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {sortedPayments.length > 0 && (
        <div className="panel" style={{ marginTop: '2rem' }}>
          <div className="panel-head">
            <h3>Payment History</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setPayModal(true)}>+ Record Payment</button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Debt</th><th>Amount</th><th>Actions</th></tr></thead>
              <tbody>
                {sortedPayments.map(p => {
                  const debt = debts.find(d => d.id === p.debtId);
                  return (
                    <tr key={p.id}>
                      <td className="td-date">{p.date}</td>
                      <td><span className="cat-badge">{debt?.name || 'Unknown'}</span></td>
                      <td className="tx-amount income">{fmt(p.amount)}</td>
                      <td className="td-actions">
                        <button className="btn-icon btn-icon-danger" title="Delete" onClick={() => handleDeletePayment(p)}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {debtModal !== null && (
        <Modal title={debtModal.id ? 'Edit Debt' : 'New Debt'} onClose={() => setDebtModal(null)} wide>
          <form onSubmit={handleDebtSubmit}>
            <FormField label="Debt Name">
              <input type="text" name="name" defaultValue={debtModal.name || ''} placeholder="e.g. Student Loan" required />
            </FormField>
            <FormField label="Person / Category" hint="Group this debt under a person or lender (e.g. Juan, Maria, Bank Name). Type a new name to create a category.">
              <input type="text" name="category" list="person-names" defaultValue={debtModal.category || ''} placeholder="e.g. Juan, Maria, or Bank Name" />
              <datalist id="person-names">
                {personNames.map(n => <option key={n} value={n} />)}
              </datalist>
            </FormField>
            <FormRow>
              <FormField label="Current Balance">
                <input type="number" name="balance" step="0.01" min="0" defaultValue={debtModal.balance ?? ''} required />
              </FormField>
              <FormField label="Original Amount">
                <input type="number" name="original" step="0.01" min="0" defaultValue={debtModal.original ?? ''} required />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="Interest Rate (%)">
                <input type="number" name="rate" step="0.01" min="0" defaultValue={debtModal.rate ?? ''} required />
              </FormField>
              <FormField label="Minimum Payment">
                <input type="number" name="minPayment" step="0.01" min="0" defaultValue={debtModal.minPayment ?? ''} required />
              </FormField>
            </FormRow>
            <FormField label="Due Date">
              <input type="date" name="dueDate" defaultValue={debtModal.dueDate || ''} required />
            </FormField>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setDebtModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{debtModal.id ? 'Save Changes' : 'Add Debt'}</button>
            </div>
          </form>
        </Modal>
      )}

      {(quickPay || payModal) && (
        <Modal title="Make Payment" onClose={() => { setQuickPay(null); setPayModal(null); }}>
          <form onSubmit={handlePaySubmit}>
            {quickPay && (
              <>
                <div className="pay-debt-name">{quickPay.name}</div>
                <p className="form-label-text">Balance: <strong>{fmt(quickPay.balance)}</strong></p>
              </>
            )}
            {payModal && (
              <FormField label="Debt">
                <select name="debtId" defaultValue={debts[0]?.id} required>
                  {debts.map(d => <option key={d.id} value={d.id}>{d.name} ({fmt(d.balance)})</option>)}
                </select>
              </FormField>
            )}
            <FormRow>
              <FormField label="Amount">
                <input type="number" name="amount" step="0.01" min="0.01"
                  max={quickPay?.balance} defaultValue={quickPay?.minPayment || ''} required />
              </FormField>
              <FormField label="Date">
                <input type="date" name="date" defaultValue={today()} required />
              </FormField>
            </FormRow>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => { setQuickPay(null); setPayModal(null); }}>Cancel</button>
              <button type="submit" className="btn btn-primary">Pay</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="Delete Debt" onClose={() => setDeleteConfirm(null)}>
          <p className="confirm-text">Delete <strong>{deleteConfirm.name}</strong>?</p>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDeleteDebt}>Delete</button>
          </div>
        </Modal>
      )}

      {moveModal && (
        <Modal title={`Move "${moveModal.name}"`} onClose={() => setMoveModal(null)}>
          <form onSubmit={handleMoveSubmit}>
            <FormField label="Existing category" hint={moveModal.category ? `Currently in "${moveModal.category}"` : 'Currently uncategorized'}>
              <select name="existing" defaultValue="">
                <option value="">-- Select a category --</option>
                {personNames
                  .filter(n => n !== (moveModal.category || '').trim())
                  .map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </FormField>
            <FormField label="Or create a new category">
              <input type="text" name="newCat" placeholder="e.g. Maria, Kuya Alex..." />
            </FormField>
            <p className="custom-pay-hint">Leave both blank to move to "Other".</p>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setMoveModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Move</button>
            </div>
          </form>
        </Modal>
      )}

      {bulkMoveOpen && (
        <Modal title={`Move ${selected.size} Debt${selected.size > 1 ? 's' : ''} to Category`} onClose={() => setBulkMoveOpen(false)}>
          <form onSubmit={handleBulkMoveSubmit}>
            <FormField label="Existing category">
              <select name="existing" defaultValue="">
                <option value="">-- Select a category --</option>
                {personNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </FormField>
            <FormField label="Or create a new category">
              <input type="text" name="newCat" placeholder="e.g. Maria, Kuya Alex..." />
            </FormField>
            <p className="custom-pay-hint">Leave both blank to move to "Other".</p>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setBulkMoveOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Move {selected.size} Debt{selected.size > 1 ? 's' : ''}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
