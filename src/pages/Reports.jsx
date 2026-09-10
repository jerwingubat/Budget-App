import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useCollection } from '../hooks/useFirestore';
import { fmt, currentMonth, EXPENSE_COLORS } from '../utils';

export default function Reports() {
  const { items: transactions } = useCollection('transactions');
  const { items: debts } = useCollection('debts');
  const [period, setPeriod] = useState('month');

  const filtered = useMemo(() => {
    const now = new Date();
    let start;
    if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'quarter') {
      start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    } else {
      start = new Date(now.getFullYear(), 0, 1);
    }
    const startStr = start.toISOString().slice(0, 10);
    return transactions.filter(t => t.date >= startStr);
  }, [transactions, period]);

  const chartData = useMemo(() => {
    const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return [{ name: period === 'month' ? 'This Month' : period === 'quarter' ? 'This Quarter' : 'This Year', Income: income, Expenses: expenses }];
  }, [filtered, period]);

  const pieData = useMemo(() => {
    const catTotals = {};
    filtered.filter(t => t.type === 'expense').forEach(t => {
      catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
    });
    return Object.entries(catTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const totalIncome = chartData[0]?.Income || 0;
  const totalExpenses = chartData[0]?.Expenses || 0;

  return (
    <div>
      <h1>Reports</h1>
      <div className="toolbar">
        <select value={period} onChange={e => setPeriod(e.target.value)}>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
        </select>
      </div>
      <div className="reports-grid">
        <div className="panel">
          <h3>Income vs Expenses</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
            Income: {fmt(totalIncome)} | Expenses: {fmt(totalExpenses)} | Net: {fmt(totalIncome - totalExpenses)}
          </p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fill: '#8b8fa3' }} />
              <YAxis tick={{ fill: '#8b8fa3' }} />
              <Tooltip
                contentStyle={{ background: '#1a1d27', border: '1px solid #2a2e3a', borderRadius: 8 }}
                labelStyle={{ color: '#e4e6eb' }}
              />
              <Bar dataKey="Income" fill="#00b894" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="#ff6b6b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="panel">
          <h3>Expense Breakdown</h3>
          {pieData.length === 0 ? (
            <div className="empty-state">No expenses in this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1a1d27', border: '1px solid #2a2e3a', borderRadius: 8 }}
                  formatter={(v) => fmt(v)}
                />
                <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="panel">
          <h3>Debt Payoff Progress</h3>
          {debts.length === 0 ? (
            <div className="empty-state">No debts to show</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {debts.map(d => {
                const paid = (d.original || 0) - (d.balance || 0);
                const pct = d.original > 0 ? (paid / d.original) * 100 : 0;
                return (
                  <div key={d.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      <span>{d.name}</span>
                      <span>{fmt(d.balance)} left</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill ok" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
