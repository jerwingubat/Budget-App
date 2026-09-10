import { useMemo } from 'react';
import { useCollection, useCategories } from '../hooks/useFirestore';
import { fmt, currentMonth, CATEGORY_COLORS } from '../utils';
import { ProgressBar } from '../components/UI';

export default function Dashboard() {
  const { items: transactions } = useCollection('transactions');
  const { items: budgets } = useCollection('budgets');
  const { items: debts } = useCollection('debts');

  const month = currentMonth();

  const stats = useMemo(() => {
    const monthTxs = transactions.filter(t => t.date?.startsWith(month));
    const income = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const totalDebt = debts.reduce((s, d) => s + (d.balance || 0), 0);
    const recent = [...transactions].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 8);
    return { income, expenses, balance: income - expenses, totalDebt, recent };
  }, [transactions, debts, month]);

  const budgetData = useMemo(() => {
    const monthExpenses = transactions.filter(
      t => t.type === 'expense' && t.date?.startsWith(month)
    );
    const catTotals = {};
    monthExpenses.forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });
    return budgets.map(b => ({
      ...b,
      spent: catTotals[b.category] || 0,
    }));
  }, [transactions, budgets, month]);

  const categoryData = useMemo(() => {
    const monthExpenses = transactions.filter(
      t => t.type === 'expense' && t.date?.startsWith(month)
    );
    const catTotals = {};
    monthExpenses.forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });
    return Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  }, [transactions, month]);

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="summary-cards">
        <div className="card income"><h3>Income</h3><p className="amount">{fmt(stats.income)}</p></div>
        <div className="card expenses"><h3>Expenses</h3><p className="amount">{fmt(stats.expenses)}</p></div>
        <div className="card balance"><h3>Balance</h3><p className="amount">{fmt(stats.balance)}</p></div>
        <div className="card debt-summary"><h3>Total Debt</h3><p className="amount">{fmt(stats.totalDebt)}</p></div>
      </div>
      <div className="dashboard-grid">
        <div className="panel">
          <h3>Recent Transactions</h3>
          {stats.recent.length === 0 ? (
            <div className="empty-state">No transactions yet</div>
          ) : (
            <ul className="transaction-list">
              {stats.recent.map(t => (
                <li key={t.id}>
                  <div className="tx-info">
                    <div className="tx-desc">{t.description}</div>
                    <div className="tx-category">{t.category} &middot; {t.date}</div>
                  </div>
                  <span className={`tx-amount ${t.type}`}>
                    {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="panel">
          <h3>Budget Overview</h3>
          {budgetData.length === 0 ? (
            <div className="empty-state">No budgets set</div>
          ) : (
            budgetData.map(b => {
              const pct = b.limit > 0 ? (b.spent / b.limit) * 100 : 0;
              return (
                <div key={b.id} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span>{b.category}</span>
                    <span style={{ color: 'var(--text-dim)' }}>{fmt(b.spent)} / {fmt(b.limit)}</span>
                  </div>
                  <ProgressBar percent={pct} />
                </div>
              );
            })
          )}
        </div>
        <div className="panel">
          <h3>Spending by Category</h3>
          {categoryData.length === 0 ? (
            <div className="empty-state">No expenses this month</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {categoryData.map(([cat, amt]) => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div className="donut-color" style={{ background: CATEGORY_COLORS[cat] || '#b2bec3' }} />
                  <span style={{ flex: 1 }}>{cat}</span>
                  <span style={{ color: 'var(--text-dim)' }}>{fmt(amt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
