import { useState, useMemo } from 'react';
import { useCollection } from '../hooks/useFirestore';
import { fmt, today } from '../utils';
import { Modal, FormField, FormRow, ProgressBar, EmptyState } from '../components/UI';

export default function Debts() {
  const { items: debts, add: addDebt, update: updateDebt, remove: removeDebt } = useCollection('debts');
  const { items: payments, add: addPayment, remove: removePayment } = useCollection('payments');
  const [debtModal, setDebtModal] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [quickPay, setQuickPay] = useState(null);

  const stats = useMemo(() => ({
    total: debts.reduce((s, d) => s + (d.balance || 0), 0),
    monthly: debts.reduce((s, d) => s + (d.minPayment || 0), 0),
    interest: debts.reduce((s, d) => s + ((d.balance || 0) * (d.rate || 0) / 100), 0),
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
    if (debtModal?.id) {
      await updateDebt(debtModal.id, entry);
    } else {
      await addDebt(entry);
    }
    setDebtModal(null);
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const debtId = payModal?.id || quickPay?.id;
    const amount = parseFloat(f.amount.value);
    await addPayment({ debtId, amount, date: f.date.value });
    const debt = debts.find(d => d.id === debtId);
    if (debt) {
      await updateDebt(debtId, { balance: Math.max(0, debt.balance - amount) });
    }
    setPayModal(null);
    setQuickPay(null);
  };

  const handleDeleteDebt = async (id) => {
    if (!confirm('Delete this debt?')) return;
    await removeDebt(id);
  };

  const handleDeletePayment = async (id) => {
    if (!confirm('Delete this payment?')) return;
    const p = payments.find(pp => pp.id === id);
    if (p) {
      const debt = debts.find(d => d.id === p.debtId);
      if (debt) await updateDebt(debt.id, { balance: debt.balance + p.amount });
    }
    await removePayment(id);
  };

  const sortedPayments = [...payments].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div>
      <h1>Debt Tracker</h1>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={() => setDebtModal({})}>+ Add Debt</button>
      </div>
      <div className="summary-cards" style={{ marginBottom: '2rem' }}>
        <div className="card debt-summary"><h3>Total Debt</h3><p className="amount">{fmt(stats.total)}</p></div>
        <div className="card expenses"><h3>Monthly Payments</h3><p className="amount">{fmt(stats.monthly)}</p></div>
        <div className="card income"><h3>Interest Paid/Year</h3><p className="amount">{fmt(stats.interest)}</p></div>
      </div>
      {debts.length === 0 ? (
        <EmptyState message="No debts tracked. Add one to start." />
      ) : (
        <div className="debts-list">
          {debts.map(d => {
            const paid = (d.original || 0) - (d.balance || 0);
            const pct = d.original > 0 ? (paid / d.original) * 100 : 0;
            return (
              <div key={d.id} className="debt-card">
                <h4>{d.name}<span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{d.rate}% APR</span></h4>
                <div className="debt-detail"><small>Balance</small><span>{fmt(d.balance)}</span></div>
                <div className="debt-detail"><small>Original</small><span>{fmt(d.original)}</span></div>
                <div className="debt-detail"><small>Min Payment</small><span>{fmt(d.minPayment)}/mo</span></div>
                <div className="debt-detail"><small>Due</small><span>{d.dueDate}</span></div>
                <div style={{ marginTop: '0.75rem' }}>
                  <div className="budget-amounts"><span>Paid off</span><span>{pct.toFixed(0)}%</span></div>
                  <ProgressBar percent={pct} />
                </div>
                <div className="debt-actions">
                  <button className="btn btn-sm btn-primary" onClick={() => setQuickPay(d)}>Pay</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => setDebtModal(d)}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDeleteDebt(d.id)}>Del</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="panel" style={{ marginTop: '2rem' }}>
        <h3>Payment History</h3>
        <table className="data-table">
          <thead><tr><th>Date</th><th>Debt</th><th>Amount</th><th>Actions</th></tr></thead>
          <tbody>
            {sortedPayments.length === 0 ? (
              <tr><td colSpan="4"><EmptyState message="No payments recorded" /></td></tr>
            ) : sortedPayments.map(p => {
              const debt = debts.find(d => d.id === p.debtId);
              return (
                <tr key={p.id}>
                  <td>{p.date}</td>
                  <td>{debt?.name || 'Unknown'}</td>
                  <td className="tx-amount income">{fmt(p.amount)}</td>
                  <td><button className="btn btn-sm btn-danger" onClick={() => handleDeletePayment(p.id)}>Del</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => setPayModal(true)}>+ Record Payment</button>
      </div>

      {debtModal !== null && (
        <Modal title={debtModal.id ? 'Edit Debt' : 'Add Debt'} onClose={() => setDebtModal(null)}>
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
              <button type="button" className="btn btn-secondary" onClick={() => setDebtModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{debtModal.id ? 'Update' : 'Add'}</button>
            </div>
          </form>
        </Modal>
      )}

      {(quickPay || payModal) && (
        <Modal title="Make Payment" onClose={() => { setQuickPay(null); setPayModal(null); }}>
          <form onSubmit={handlePaySubmit}>
            {quickPay && (
              <FormField label="Debt">
                <input type="text" value={quickPay.name} disabled />
              </FormField>
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
              <button type="button" className="btn btn-secondary" onClick={() => { setQuickPay(null); setPayModal(null); }}>Cancel</button>
              <button type="submit" className="btn btn-primary">Pay</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
