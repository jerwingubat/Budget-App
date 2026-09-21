import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { setShare, deleteShare } from '../services/firestore';
import { Modal, FormField, EmptyState, useToast } from './UI';

export default function ShareDebtsModal({ shares, categories, onClose }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || busy) return;
    if (cleanEmail === (user?.email || '').toLowerCase()) {
      addToast('You already have access to your own debts', 'info');
      return;
    }
    setBusy(true);
    try {
      await setShare(user.uid, cleanEmail, {
        email: cleanEmail,
        category,
        ownerEmail: user.email,
        ownerName: user.displayName || '',
      });
      addToast(
        category
          ? `Shared "${category}" debts with ${cleanEmail}`
          : `Shared all debts with ${cleanEmail}`,
        'success'
      );
      setEmail('');
      setCategory('');
    } catch {
      addToast('Something went wrong', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (email) => {
    try {
      await deleteShare(user.uid, email);
      addToast('Access removed', 'success');
    } catch {
      addToast('Something went wrong', 'error');
    }
  };

  return (
    <Modal title="Share Debt Access" onClose={onClose}>
      <p className="form-hint" style={{ marginBottom: '16px' }}>
        Grant a person read-only access to your debts. They sign into BudgetFlow with that email
        and open the Debt page to find them. Emails are stored in lowercase.
      </p>

      {shares.length === 0 ? (
        <div className="panel" style={{ marginBottom: '16px' }}>
          <EmptyState icon="🔗" message="No one has access yet. Share your debt list below." />
        </div>
      ) : (
        <div className="share-list">
          {shares.map(s => (
            <div key={s.id} className="share-row">
              <div className="share-row-main">
                <span className="share-email">{s.id}</span>
                <span className="badge badge-share">{s.category || 'All categories'}</span>
              </div>
              <button
                className="btn-icon btn-icon-danger"
                title="Remove access"
                onClick={() => handleRemove(s.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <FormField label="Email">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="friend@example.com"
            required
          />
        </FormField>
        <FormField
          label="Scope"
          hint="Choose which debts this person can see. Uncategorized debts only appear under All categories."
        >
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </FormField>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
          <button type="submit" className="btn btn-primary" disabled={busy || !email.trim()}>
            Share
          </button>
        </div>
      </form>
    </Modal>
  );
}