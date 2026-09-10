export function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

export const DEFAULT_CATEGORIES = [
  'Housing', 'Food', 'Transport', 'Utilities', 'Entertainment',
  'Healthcare', 'Shopping', 'Education', 'Savings', 'Other',
];

export const CATEGORY_COLORS = {
  Housing: '#6c5ce7', Food: '#00b894', Transport: '#74b9ff',
  Utilities: '#fdcb6e', Entertainment: '#e17055', Healthcare: '#d63031',
  Shopping: '#a29bfe', Education: '#00cec9', Savings: '#55efc4', Other: '#b2bec3',
};

export const EXPENSE_COLORS = [
  '#6c5ce7', '#00b894', '#74b9ff', '#fdcb6e', '#e17055',
  '#d63031', '#a29bfe', '#00cec9', '#55efc4', '#b2bec3',
  '#fd79a8', '#636e72', '#0984e3', '#e84393', '#00b894',
];
