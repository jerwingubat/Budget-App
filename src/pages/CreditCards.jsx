import { useState } from 'react';
import { useCollection } from '../hooks/useFirestore';
import { fmt, today, ordinal } from '../utils';
import { Modal, FormField, FormRow, EmptyState } from '../components/UI';

export default function CreditCards() {
  const { items: cards, add: addCard, update: updateCard, remove: removeCard } = useCollection('creditCards');
  const { items: txs, add: addTx, remove: removeTx } = useCollection('creditTransactions');
  const [cardModal, setCardModal] = useState(null);
  const [txModal, setTxModal] = useState(false);
  const [payModal, setPayModal] = useState(null);

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
    if (cardModal?.id) {
      await updateCard(cardModal.id, entry);
    } else {
      await addCard(entry);
    }
    setCardModal(null);
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
    // Update card balance
    const card = cards.find(c => c.id === f.cardId.value);
    if (card) {
      await updateCard(card.id, { balance: card.balance + parseFloat(f.amount.value) });
    }
    setTxModal(false);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    const amount = parseFloat(e.target.amount.value);
    const card = cards.find(c => c.id === payModal.id);
    if (!card) return;
    await addTx({
      cardId: card.id,
      type: 'payment',
      description: 'Payment',
      amount,
      date: today(),
    });
    await updateCard(card.id, { balance: Math.max(0, card.balance - amount) });
    setPayModal(null);
  };

  const handleDeleteCard = async (id) => {
    if (!confirm('Delete this credit card?')) return;
    await removeCard(id);
  };

  const handleDeleteTx = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    const tx = txs.find(t => t.id === id);
    if (tx?.type === 'charge') {
      const card = cards.find(c => c.id === tx.cardId);
      if (card) await updateCard(card.id, { balance: Math.max(0, card.balance - tx.amount) });
    }
    await removeTx(id);
  };

  const sortedTxs = [...txs].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div>
      <h1>Credit Cards</h1>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={() => setCardModal({})}>+ Add Credit Card</button>
      </div>
      {cards.length === 0 ? (
        <EmptyState message="No credit cards added" />
      ) : (
        <div className="cards-grid">
          {cards.map(c => {
            const usage = c.limit > 0 ? ((c.balance / c.limit) * 100).toFixed(0) : 0;
            return (
              <div key={c.id} className="credit-card-item">
                <h4>{c.name}</h4>
                <div className="cc-number">{c.last4 ? '**** **** **** ' + c.last4 : ''}</div>
                <div className="cc-balances">
                  <div><small>Balance</small><span>{fmt(c.balance)}</span></div>
                  <div><small>Limit</small><span>{fmt(c.limit)}</span></div>
                  <div><small>APR</small><span>{c.apr}%</span></div>
                  <div><small>Usage</small><span>{usage}%</span></div>
                </div>
                <div className="cc-due">Payment due: {c.dueDay}{ordinal(c.dueDay)} of each month</div>
                <div className="cc-actions">
                  <button className="btn btn-sm btn-primary" onClick={() => setPayModal(c)}>Pay</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => setCardModal(c)}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDeleteCard(c.id)}>Del</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="panel" style={{ marginTop: '2rem' }}>
        <h3>Credit Card Transactions</h3>
        <table className="data-table">
          <thead>
            <tr><th>Date</th><th>Card</th><th>Description</th><th>Amount</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {sortedTxs.length === 0 ? (
              <tr><td colSpan="5"><EmptyState message="No credit card transactions" /></td></tr>
            ) : sortedTxs.map(t => {
              const card = cards.find(c => c.id === t.cardId);
              return (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>{card?.name || 'Unknown'}</td>
                  <td>{t.description}</td>
                  <td className={`tx-amount ${t.type === 'payment' ? 'income' : 'expense'}`}>
                    {t.type === 'payment' ? '-' : '+'}{fmt(t.amount)}
                  </td>
                  <td><button className="btn btn-sm btn-danger" onClick={() => handleDeleteTx(t.id)}>Del</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => setTxModal(true)}>+ Add Charge</button>
      </div>

      {cardModal !== null && (
        <Modal title={cardModal.id ? 'Edit Credit Card' : 'Add Credit Card'} onClose={() => setCardModal(null)}>
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
              <button type="button" className="btn btn-secondary" onClick={() => setCardModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{cardModal.id ? 'Update' : 'Add'}</button>
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
              <input type="text" name="description" required />
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
              <button type="button" className="btn btn-secondary" onClick={() => setTxModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Add</button>
            </div>
          </form>
        </Modal>
      )}

      {payModal && (
        <Modal title="Make Payment" onClose={() => setPayModal(null)}>
          <form onSubmit={handlePayment}>
            <FormField label={`Payment Amount (Balance: ${fmt(payModal.balance)})`}>
              <input type="number" name="amount" step="0.01" min="0.01" max={payModal.balance} defaultValue={payModal.balance} required />
            </FormField>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setPayModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Pay</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
