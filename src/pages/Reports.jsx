import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts';
import { useCollection } from '../hooks/useFirestore';
import { fmt, fmtCompact, EXPENSE_COLORS, CATEGORY_COLORS } from '../utils';
import { Tabs, EmptyState, ProgressBar } from '../components/UI';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="chart-tooltip-row">
          <span className="chart-tooltip-dot" style={{ background: p.color }} />
          <span>{p.name}: {fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function Reports() {
  const { items: transactions } = useCollection('transactions');
  const { items: debts } = useCollection('debts');
  const [period, setPeriod] = useState('month');

  const filtered = useMemo(() => {
    const now = new Date();
    let start;
    if (period === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (period === 'quarter') start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    else start = new Date(now.getFullYear(), 0, 1);
    const startStr = start.toISOString().slice(0, 10);
    return transactions.filter(t => t.date >= startStr);
  }, [transactions, period]);

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpenses;

  const barData = [{ name: period === 'month' ? 'This Month' : period === 'quarter' ? 'This Quarter' : 'This Year', Income: totalIncome, Expenses: totalExpenses }];

  const pieData = useMemo(() => {
    const catTotals = {};
    filtered.filter(t => t.type === 'expense').forEach(t => {
      catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
    });
    return Object.entries(catTotals)
      .map(([name, value], i) => ({ name, value, fill: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="page-sub">Period: {period === 'month' ? 'This Month' : period === 'quarter' ? 'This Quarter' : 'This Year'}</p>
        </div>
        <Tabs
          tabs={[
            { value: 'month', label: 'Month' },
            { value: 'quarter', label: 'Quarter' },
            { value: 'year', label: 'Year' },
          ]}
          active={period}
          onChange={setPeriod}
        />
      </div>

      <div className="kpi-grid kpi-3">
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-icon" style={{ background: '#10b98118', color: '#10b981' }}>↑</span></div>
          <div className="kpi-label">Income</div>
          <div className="kpi-amount">{fmtCompact(totalIncome)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-icon" style={{ background: '#ef444418', color: '#ef4444' }}>↓</span></div>
          <div className="kpi-label">Expenses</div>
          <div className="kpi-amount">{fmtCompact(totalExpenses)}</div>
        </div>
        <div className={`kpi-card ${net < 0 ? 'kpi-danger' : ''}`}>
          <div className="kpi-header"><span className="kpi-icon" style={{ background: net < 0 ? '#ef444418' : '#10b98118', color: net < 0 ? '#ef4444' : '#10b981' }}>◈</span></div>
          <div className="kpi-label">Net</div>
          <div className="kpi-amount">{fmtCompact(net)}</div>
        </div>
      </div>

      <div className="reports-grid">
        <div className="panel chart-panel">
          <h3>Income vs Expenses</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-dim)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => fmtCompact(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel chart-panel">
          <h3>Expense Breakdown</h3>
          {pieData.length === 0 ? (
            <EmptyState icon="📊" message="No expenses in this period" />
          ) : (
            <div className="category-chart-wrap">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={2} stroke="var(--bg)">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="category-legend">
                {pieData.map(c => (
                  <div key={c.name} className="legend-item">
                    <span className="legend-dot" style={{ background: c.fill }} />
                    <span className="legend-name">{c.name}</span>
                    <span className="legend-val">{fmt(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="panel">
          <h3>Debt Payoff Progress</h3>
          {debts.length === 0 ? (
            <EmptyState icon="▲" message="No debts to show" />
          ) : (
            <div className="debt-progress-list">
              {debts.map(d => {
                const paid = (d.original || 0) - (d.balance || 0);
                const pct = d.original > 0 ? (paid / d.original) * 100 : 0;
                return (
                  <div key={d.id} className="debt-progress-item">
                    <div className="debt-progress-head">
                      <span>{d.name}</span>
                      <span className="text-dim">{fmt(d.balance)} left</span>
                    </div>
                    <ProgressBar percent={pct} size="small" />
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
