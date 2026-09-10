import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useCollection } from '../hooks/useFirestore';
import { fmt, fmtCompact, currentMonth, getMonthName, percentChange, CATEGORY_COLORS, EXPENSE_COLORS } from '../utils';
import { ProgressBar, SkeletonCard, EmptyState, FAB } from '../components/UI';

function TrendBadge({ value }) {
  if (value === 0) return null;
  const up = value > 0;
  return <span className={`trend ${up ? 'trend-up' : 'trend-down'}`}>{up ? '↑' : '↓'} {Math.abs(value).toFixed(0)}%</span>;
}

function KPICard({ label, amount, prevAmount, icon, color }) {
  const trend = percentChange(amount, prevAmount);
  return (
    <div className="kpi-card">
      <div className="kpi-header">
        <span className="kpi-icon" style={{ background: color + '18', color }}>{icon}</span>
        <TrendBadge value={trend} />
      </div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-amount">{fmtCompact(amount)}</div>
      <div className="kpi-sub">vs {fmtCompact(prevAmount)} last month</div>
    </div>
  );
}

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

export default function Dashboard() {
  const { items: transactions, loading: txLoading } = useCollection('transactions');
  const { items: budgets } = useCollection('budgets');
  const { items: debts } = useCollection('debts');
  const navigate = useNavigate();
  const month = currentMonth();

  const prevMonth = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    return `${y}-${String(m - 1 || 12).padStart(2, '0')}`;
  }, [month]);

  const stats = useMemo(() => {
    const monthTxs = transactions.filter(t => t.date?.startsWith(month));
    const prevTxs = transactions.filter(t => t.date?.startsWith(prevMonth));
    const income = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const prevIncome = prevTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const prevExpenses = prevTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const totalDebt = debts.reduce((s, d) => s + (d.balance || 0), 0);
    const recent = [...transactions].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 8);
    return { income, expenses, balance: income - expenses, totalDebt, recent, prevIncome, prevExpenses };
  }, [transactions, debts, month, prevMonth]);

  const categoryData = useMemo(() => {
    const monthExpenses = transactions.filter(t => t.type === 'expense' && t.date?.startsWith(month));
    const catTotals = {};
    monthExpenses.forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });
    return Object.entries(catTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, fill: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }));
  }, [transactions, month]);

  const cashFlowData = useMemo(() => {
    const months = [];
    const [y, m] = month.split('-').map(Number);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short' });
      const monthTxs = transactions.filter(t => t.date?.startsWith(key));
      const inc = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      months.push({ month: label, Income: inc, Expenses: exp });
    }
    return months;
  }, [transactions, month]);

  const budgetData = useMemo(() => {
    const monthExpenses = transactions.filter(t => t.type === 'expense' && t.date?.startsWith(month));
    const catTotals = {};
    monthExpenses.forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });
    return budgets.map(b => ({ ...b, spent: catTotals[b.category] || 0 }));
  }, [transactions, budgets, month]);

  if (txLoading) {
    return (
      <div>
        <div className="page-header"><h1>Dashboard</h1></div>
        <div className="kpi-grid">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-sub">{getMonthName(month)} overview</p>
        </div>
      </div>

      <div className="kpi-grid">
        <KPICard label="Total Balance" amount={stats.balance} prevAmount={stats.prevIncome - stats.prevExpenses} icon="◈" color="#10b981" />
        <KPICard label="Monthly Income" amount={stats.income} prevAmount={stats.prevIncome} icon="↑" color="#3b82f6" />
        <KPICard label="Monthly Spending" amount={stats.expenses} prevAmount={stats.prevExpenses} icon="↓" color="#ef4444" />
      </div>

      <div className="dashboard-charts">
        <div className="panel chart-panel">
          <h3>Cash Flow <span className="panel-sub">Last 6 months</span></h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={cashFlowData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-dim)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => fmtCompact(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel chart-panel">
          <h3>Spending by Category</h3>
          {categoryData.length === 0 ? (
            <EmptyState icon="📊" message="No expenses this month" />
          ) : (
            <div className="category-chart-wrap">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={2} stroke="var(--bg)">
                    {categoryData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="category-legend">
                {categoryData.map(c => (
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
      </div>

      <div className="dashboard-bottom">
        <div className="panel">
          <h3>Budget Overview</h3>
          {budgetData.length === 0 ? (
            <EmptyState icon="◔" message="No budgets set" action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/budgets')}>Set Budget</button>} />
          ) : (
            budgetData.slice(0, 6).map(b => {
              const pct = b.limit > 0 ? (b.spent / b.limit) * 100 : 0;
              return (
                <div key={b.id} className="budget-row">
                  <div className="budget-row-head">
                    <span>{b.category}</span>
                    <span className="text-dim">{fmt(b.spent)} / {fmt(b.limit)}</span>
                  </div>
                  <ProgressBar percent={pct} size="small" />
                </div>
              );
            })
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Recent Transactions</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/transactions')}>View all →</button>
          </div>
          {stats.recent.length === 0 ? (
            <EmptyState icon="⇄" message="No transactions yet" />
          ) : (
            <div className="recent-list">
              {stats.recent.map(t => (
                <div key={t.id} className="recent-item">
                  <div className="recent-info">
                    <span className="recent-desc">{t.description}</span>
                    <span className="recent-meta">{t.category} · {t.date}</span>
                  </div>
                  <span className={`recent-amount ${t.type}`}>
                    {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <FAB onClick={() => navigate('/transactions')} icon="+" label="Add" />
    </div>
  );
}
