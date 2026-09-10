export function fmt(n) {
  return '₱' + Number(n || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtCompact(n) {
  if (Math.abs(n) >= 1_000_000) return '₱' + (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return '₱' + (n / 1_000).toFixed(1) + 'K';
  return fmt(n);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function currentMonth() {
  return today().slice(0, 7);
}

export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return (s[(v - 20) % 10] || s[v] || s[0]);
}

export function percentChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function getMonthName(monthStr) {
  const [y, m] = monthStr.split('-');
  return new Date(y, parseInt(m) - 1).toLocaleString('en-US', { month: 'long' });
}

export const DEFAULT_CATEGORIES = [
  'Housing', 'Food', 'Transport', 'Utilities', 'Entertainment',
  'Healthcare', 'Shopping', 'Education', 'Savings', 'Other',
];

export const CATEGORY_COLORS = {
  Housing: '#10b981', Food: '#f59e0b', Transport: '#3b82f6',
  Utilities: '#8b5cf6', Entertainment: '#ec4899', Healthcare: '#ef4444',
  Shopping: '#6366f1', Education: '#06b6d4', Savings: '#14b8a6', Other: '#64748b',
};

export const EXPENSE_COLORS = [
  '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899',
  '#ef4444', '#6366f1', '#06b6d4', '#14b8a6', '#64748b',
  '#f97316', '#84cc16', '#0ea5e9', '#a855f7', '#d946ef',
];
