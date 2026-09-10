import { useState, useMemo } from 'react';
import { useCollection } from '../hooks/useFirestore';
import { fmt, fmtCompact, today, ordinal } from '../utils';
import { Modal, FormField, FormRow, ProgressBar, EmptyState, useToast, SkeletonTable, SeeMore } from '../components/UI';

export default function CreditCards() {
  const { items: cards, add: addCard, update: updateCard, remove: removeCard, loading } = useCollection('creditCards');
  const { items: txs, add: addTx, remove: removeTx } = useCollection('creditTransactions');
  const { addToast } = useToast();
  const [cardModal, setCardModal] = useState(null);
  const [txModal, setTxModal] = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [deleteCardConfirm, setDeleteCardConfirm] = useState(null);

  const totalBalance = cards.reduce((s, c) => s + (c.balance || 0), 0);
  const totalLimit = cards.reduce((s, c) => s + (c.limit || 0), 0);

  const handleCardSubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const entry = {
      name: f.name.value,
      balance: parseFloat(f.balance.value),
      limit: parseFloat(f.limit.value),
      apr: parseFloat(f.apr.value),
      dueDay: parseInt(f.dueDay.value),
      last4: f.last4.value,
    };
    try {
      if (cardModal?.id) {
        await updateCard(cardModal.id, entry);
        addToast('Card updated', 'success');
      } else {
        await addCard(entry);
        addToast('Card added', 'success');
      }
      setCardModal(null);
    } catch {
      addToast('Something went wrong', 'error');
    }
  };

  const handleTxSubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    await addTx({
      cardId: f.cardId.value,
      type: 'charge',
      description: f.description.value,
      amount: parseFloat(f.amount.value),
      date: f.date.value,
    });
    const card = cards.find(c => c.id === f.cardId.value);
    if (card) await updateCard(card.id, { balance: card.balance + parseFloat(f.amount.value) });
    addToast('Charge added', 'success');
    setTxModal(false);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    const amount = parseFloat(e.target.amount.value);
    const card = cards.find(c => c.id === payModal.id);
    if (!card) return;
    await addTx({ cardId: card.id, type: 'payment', description: 'Payment', amount, date: today() });
    await updateCard(card.id, { balance: Math.max(0, card.balance - amount) });
    addToast('Payment recorded', 'success');
    setPayModal(null);
  };

  const handleDeleteCard = async () => {
    if (!deleteCardConfirm) return;
    await removeCard(deleteCardConfirm.id);
    addToast('Card deleted', 'success');
    setDeleteCardConfirm(null);
  };

  const handleDeleteTx = async (tx) => {
    if (tx?.type === 'charge') {
      const card = cards.find(c => c.id === tx.cardId);
      if (card) await updateCard(card.id, { balance: Math.max(0, card.balance - tx.amount) });
    }
    await removeTx(tx.id);
    addToast('Transaction deleted', 'success');
  };

  const sortedTxs = useMemo(() => [...txs].sort((a, b) => (b.date || '').localeCompare(a.date || '')), [txs]);

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1>Credit Cards</h1></div>
        <SkeletonTable rows={3} cols={4} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Credit Cards</h1>
          <p className="page-sub">{cards.length} card{cards.length !== 1 ? 's' : ''} · {fmtCompact(totalBalance)} balance</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCardModal({})}>+ Add Card</button>
      </div>

      {cards.length === 0 ? (
        <div className="panel"><EmptyState icon="▣" message="No credit cards added" /></div>
      ) : (
        <div className="cards-grid">
          {cards.map(c => {
            const usage = c.limit > 0 ? (c.balance / c.limit) * 100 : 0;
            return (
              <div key={c.id} className="cc-card">
                <div className="cc-card-header">
                  <span className="cc-card-name">{c.name}</span>
                  <span className="cc-card-last4">{c.last4 ? '•••• ' + c.last4 : ''}</span>
                </div>
                <div className="cc-card-balance">{fmt(c.balance)}</div>
                <ProgressBar percent={usage} size="small" />
                <div className="cc-card-stats">
                  <div className="cc-stat"><span>Limit</span><span>{fmtCompact(c.limit)}</span></div>
                  <div className="cc-stat"><span>APR</span><span>{c.apr}%</span></div>
                  <div className="cc-stat"><span>Usage</span><span>{usage.toFixed(0)}%</span></div>
                  <div className="cc-stat"><span>Due</span><span>{c.dueDay}{ordinal(c.dueDay)}</span></div>
                </div>
                <div className="card-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => setPayModal(c)}>Pay</button>
                  <button className="btn-icon" title="Edit" onClick={() => setCardModal(c)}>✎</button>
                  <button className="btn-icon btn-icon-danger" title="Delete" onClick={() => setDeleteCardConfirm(c)}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sortedTxs.length > 0 && (
        <div className="panel" style={{ marginTop: '2rem' }}>
          <div className="panel-head">
            <h3>Credit Card Transactions</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setTxModal(true)}>+ Add Charge</button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Card</th><th>Description</th><th>Amount</th><th>Actions</th></tr>
              </thead>
              <tbody>
                <SeeMore initial={8}>
                  {sortedTxs.map(t => {
                    const card = cards.find(c => c.id === t.cardId);
                    return (
                      <tr key={t.id}>
                        <td className="td-date">{t.date}</td>
                        <td><span className="cat-badge">{card?.name || 'Unknown'}</span></td>
                        <td>{t.description}</td>
                        <td className={`tx-amount ${t.type === 'payment' ? 'income' : 'expense'}`}>
                          {t.type === 'payment' ? '-' : '+'}{fmt(t.amount)}
                        </td>
                        <td className="td-actions">
                          <button className="btn-icon btn-icon-danger" title="Delete" onClick={() => handleDeleteTx(t)}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </SeeMore>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {cardModal !== null && (
        <Modal title={cardModal.id ? 'Edit Card' : 'New Card'} onClose={() => setCardModal(null)} wide>
          <form onSubmit={handleCardSubmit}>
            <FormField label="Card Name">
              <input type="text" name="name" defaultValue={cardModal.name || ''} placeholder="e.g. Visa Platinum" required />
            </FormField>
            <FormRow>
              <FormField label="Balance">
                <input type="number" name="balance" step="0.01" min="0" defaultValue={cardModal.balance ?? ''} required />
              </FormField>
              <FormField label="Credit Limit">
                <input type="number" name="limit" step="0.01" min="0" defaultValue={cardModal.limit ?? ''} required />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="APR (%)">
                <input type="number" name="apr" step="0.01" min="0" defaultValue={cardModal.apr ?? ''} required />
              </FormField>
              <FormField label="Due Day (1-28)">
                <input type="number" name="dueDay" min="1" max="28" defaultValue={cardModal.dueDay ?? ''} required />
              </FormField>
            </FormRow>
            <FormField label="Last 4 Digits (optional)">
              <input type="text" name="last4" maxLength="4" pattern="\d{4}" defaultValue={cardModal.last4 || ''} placeholder="1234" />
            </FormField>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setCardModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{cardModal.id ? 'Save Changes' : 'Add Card'}</button>
            </div>
          </form>
        </Modal>
      )}

      {txModal && cards.length > 0 && (
        <Modal title="Add Charge" onClose={() => setTxModal(false)}>
          <form onSubmit={handleTxSubmit}>
            <FormField label="Card">
              <select name="cardId" required>
                {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
            <FormField label="Description">
              <input type="text" name="description" required placeholder="e.g. Amazon purchase" />
            </FormField>
            <FormRow>
              <FormField label="Amount">
                <input type="number" name="amount" step="0.01" min="0.01" required />
              </FormField>
              <FormField label="Date">
                <input type="date" name="date" defaultValue={today()} required />
              </FormField>
            </FormRow>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setTxModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Add Charge</button>
            </div>
          </form>
        </Modal>
      )}

      {payModal && (
        <Modal title="Make Payment" onClose={() => setPayModal(null)}>
          <form onSubmit={handlePayment}>
            <p className="form-label-text">Balance: <strong>{fmt(payModal.balance)}</strong></p>
            <FormField label="Payment Amount">
              <input type="number" name="amount" step="0.01" min="0.01" max={payModal.balance} defaultValue={payModal.balance} required />
            </FormField>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setPayModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Pay</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteCardConfirm && (
        <Modal title="Delete Card" onClose={() => setDeleteCardConfirm(null)}>
          <p className="confirm-text">Delete <strong>{deleteCardConfirm.name}</strong>?</p>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setDeleteCardConfirm(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDeleteCard}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
