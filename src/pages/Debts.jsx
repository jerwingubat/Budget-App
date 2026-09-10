import { useState, useMemo } from 'react';
import { useCollection } from '../hooks/useFirestore';
import { fmt, fmtCompact, today } from '../utils';
import { Modal, FormField, FormRow, ProgressBar, EmptyState, useToast, SkeletonTable } from '../components/UI';

export default function Debts() {
  const { items: debts, add: addDebt, update: updateDebt, remove: removeDebt, loading } = useCollection('debts');
  const { items: payments, add: addPayment, remove: removePayment } = useCollection('payments');
  const { addToast } = useToast();
  const [debtModal, setDebtModal] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [quickPay, setQuickPay] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const stats = useMemo(() => ({
    total: debts.reduce((s, d) => s + (d.balance || 0), 0),
    monthly: debts.reduce((s, d) => s + (d.minPayment || 0), 0),
    interest: debts.reduce((s, d) => s + ((d.balance || 0) * (d.rate || 0) / 100 / 12), 0),
  }), [debts]);

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
          <div className="kpi-amount">{fmtCompact(stats.total)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-icon" style={{ background: '#f59e0b18', color: '#f59e0b' }}>◇</span></div>
          <div className="kpi-label">Min. Monthly</div>
          <div className="kpi-amount">{fmtCompact(stats.monthly)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-icon" style={{ background: '#8b5cf618', color: '#8b5cf6' }}>~</span></div>
          <div className="kpi-label">Interest / Month</div>
          <div className="kpi-amount">{fmtCompact(stats.interest)}</div>
        </div>
      </div>

      {debts.length === 0 ? (
        <div className="panel"><EmptyState icon="▲" message="No debts tracked. Add one to start." /></div>
      ) : (
        <div className="debts-grid">
          {debts.map(d => {
            const paid = (d.original || 0) - (d.balance || 0);
            const pct = d.original > 0 ? (paid / d.original) * 100 : 0;
            return (
              <div key={d.id} className="debt-card">
                <div className="debt-card-head">
                  <h4>{d.name}</h4>
                  <span className="debt-rate">{d.rate}% APR</span>
                </div>
                <div className="debt-balance">{fmt(d.balance)}</div>
                <ProgressBar percent={pct} size="small" />
                <div className="debt-card-body">
                  <div className="debt-stat"><span>Original</span><span>{fmt(d.original)}</span></div>
                  <div className="debt-stat"><span>Min Payment</span><span>{fmt(d.minPayment)}/mo</span></div>
                  <div className="debt-stat"><span>Due</span><span>{d.dueDate}</span></div>
                  <div className="debt-stat"><span>Paid Off</span><span>{pct.toFixed(0)}%</span></div>
                </div>
                <div className="card-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => setQuickPay(d)}>Pay</button>
                  <button className="btn-icon" title="Edit" onClick={() => setDebtModal(d)}>✎</button>
                  <button className="btn-icon btn-icon-danger" title="Delete" onClick={() => setDeleteConfirm(d)}>✕</button>
                </div>
              </div>
            );
          })}
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
    </div>
  );
}
