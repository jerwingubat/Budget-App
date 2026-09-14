function today() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Text normalization ──────────────────────────────────────────

export function normalizeText(raw) {
  return String(raw || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u200b/g, '')
    .replace(/\u200c/g, '')
    .replace(/\u200d/g, '')
    .replace(/\ufeff/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, '-')
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim().replace(/[_*#=~]{3,}/g, '').trim())
    .filter(Boolean)
    .join('\n');
}

function toLines(text) {
  return normalizeText(text).split('\n');
}

function cleanDigits(str) {
  return String(str).replace(/[Oo]/g, '0').replace(/[lI]/g, '1').replace(/[Ss]/g, '5');
}

function parseMoney(raw) {
  const n = parseFloat(String(raw || '').replace(/[^\d.,-]/g, '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

// ─── Price extraction helpers ─────────────────────────────────────

const MONEY_TOKEN = `(?:₱|PHP|Php|php|P\\s?)?(\\d{1,3}(?:,\\d{3})*(\\.\\d{2})?)`;
const MONEY_RE = new RegExp(MONEY_TOKEN, 'gi');

function collectMoneys(line) {
  const out = [];
  let m;
  while ((m = MONEY_RE.exec(line)) !== null) {
    if (!/^\d$/.test(m[0][0]) || m[0].includes('.')) {
      out.push({ index: m.index, value: parseMoney(m[1]) });
    }
  }
  out.sort((a, b) => b.index - a.index);
  return out.filter(e => e.value != null);
}

export function lastMoney(line) {
  const moneys = collectMoneys(line);
  if (!moneys.length) return null;
  return moneys[0].value;
}

// ─── Merchant ─────────────────────────────────────────────────────

const MERCHANT_NOISE = [
  /^(\d|[-+:*])/,
  /tin\s*[:.]?\s*\d/i,
  /otr\s*[:.]?\s*\d/i,
  /(register|reg)\s*[:.]?/i,
  /bin[\s:]/i,
  /\b(vat|vatable|or\s*no\.?|si\s*no\.?|date|time)\b/i,
  /\b(thank you|please|welcome|good bye|sir|ma'am|mam|mrs\.?|mr\.?)\b/i,
  /^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}$/,
  /\b(qty|quantity|item|description|amount|unit price|u\/p|price)\b/i,
  /\b(cash|change|total|subtotal|balance due|amount due|grand total)\b/i,
  /^[\d ().,#-]+$/,
  /[\w.-]+@[\w.-]+/,
  /\.(com|ph|net)/i,
];

function isMerchantNoise(line) {
  return MERCHANT_NOISE.some(re => re.test(line));
}

export function extractMerchant(text) {
  const lines = toLines(text).slice(0, 10).filter(l => l.length >= 2);
  let best = null;
  let bestScore = 0;
  lines.forEach((line, idx) => {
    if (isMerchantNoise(line)) return;
    const letters = (line.match(/[A-Za-z]/g) || []).length;
    if (letters < 3 || letters > 55) return;
    let score = letters - line.length / 6;
    score += Math.max(0, 8 - idx) * 0.6; // merchants sit near the top
    if (line.includes(':')) score -= 5;  // "ROUTE: xyz" style labels
    if (/\b(route|pax|payment|pay|fare|fee|usage|bill|invoice no)\b/i.test(line)) score -= 5;
    if (letters > 10) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = line;
    }
  });
  return best ? best.replace(/^\W+/, '').replace(/[|]/g, '').trim() : '';
}

// ─── Date ──────────────────────────────────────────────────────

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function toISODate(day, month, year) {
  const d = String(Number(day)).padStart(2, '0');
  const m = String(Number(month)).padStart(2, '0');
  const y = String(Number(year));
  if (!(Number(month) >= 1 && Number(month) <= 12)) return null;
  if (!(Number(day) >= 1 && Number(day) <= 31)) return null;
  if (!/^\d{4}$/.test(y)) return null;
  return `${y}-${m}-${d}`;
}

function parseDateParts(a, b, c) {
  const cleaned = [a, b, c].map(p => cleanDigits(String(p)));
  const yearIdx = cleaned.findIndex(p => /^\d{4}$/.test(p));
  if (yearIdx === -1) return null;
  const year = cleaned[yearIdx];
  const yearNum = Number(year);
  if (yearNum < 2000 || yearNum > new Date().getFullYear() + 1) return null;
  const rest = cleaned.filter((_, i) => i !== yearIdx).map(p => String(Number(p)));
  const x = rest[0];
  const y = rest[1];
  if (!x || !y) return null;
  if (yearIdx === 0) return toISODate(Number(y), Number(x), year); // YYYY/MM/DD
  if (Number(x) > 12) return toISODate(Number(x), Number(y), year); // DD/MM/YYYY
  if (Number(y) > 12) return toISODate(Number(y), Number(x), year); // MM/DD/YYYY
  return toISODate(Number(y), Number(x), year); // ambiguous → MM/DD
}

function withinReasonableRange(iso) {
  return !!iso && iso >= '2000-01-01' && iso <= new Date().toISOString().slice(0, 10);
}

export function extractDate(text) {
  const lines = toLines(text);
  const hunt = cleanDigits(text);

  // 1. Month-name form: "October 25, 2024"
  const monthRe = new RegExp(
    `\\b(${MONTHS.join('|')})\\w*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20\\d{2})\\b`, 'i'
  );
  for (const line of lines) {
    const m = line.match(monthRe);
    if (m) {
      const month = MONTHS.indexOf(m[1].toLowerCase().slice(0, 3)) + 1;
      const iso = toISODate(m[2], month, m[3]);
      if (withinReasonableRange(iso)) return iso;
    }
  }

  // 2. Numeric patterns (OCR digits cleaned): YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY
  //    and garbled variants like "2/O25/2O24".
  const numericRe = /\b(\d{1,4})[/\-.](\d{1,4})[/\-.](\d{2,4})\b/g;
  let m;
  while ((m = numericRe.exec(hunt)) !== null) {
    const iso = parseDateParts(m[1], m[2], m[3]);
    if (withinReasonableRange(iso)) return iso;
  }

  // 3. Label-driven lines as fallback
  for (const line of lines) {
    if (!/\b(?:date|or.?date|trans.?date)\b/i.test(line)) continue;
    const dm = line.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/);
    if (dm) {
      const iso = parseDateParts(dm[1], dm[2], dm[3]);
      if (withinReasonableRange(iso)) return iso;
    }
  }
  return null;
}

// ─── Total ────────────────────────────────────────────────────────

const TOTAL_KEYWORDS = [
  /amount due|total amount due/i,
  /grand total|total sales/i,
  /balance due/i,
  /\btotal\b/i,
];

export function extractTotal(text) {
  const lines = toLines(text);
  for (const re of TOTAL_KEYWORDS) {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (!re.test(lines[i])) continue;
      const amount = lastMoney(lines[i]);
      if (amount != null) return amount;
    }
  }
  const all = [];
  for (const line of lines) {
    const m = lastMoney(line);
    if (m != null) all.push(m);
  }
  if (all.length) return all[all.length - 1];
  return null;
}

export function sumLineItems(items) {
  return items.reduce((sum, it) => sum + (Number(it.total) || 0), 0);
}

// ─── Tax / Tip ────────────────────────────────────────────────────

export function extractTax(text) {
  const lines = toLines(text);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const m = line.match(
      /(?:total\s*vAT|vAT(?:ABLE)?\s*(?:amount|sales)?|VAT-EXEMPT|ZERO RATED|OUTPUT VAT)\s*[:.]?\s*(?:\u20B1|P)?\s*(\d[\d,.]*)/i
    ) || line.match(/^\s*(?:A|B|C)\s*[:.]?\s*(\d[\d,.]*)/i);
    if (m) {
      const val = parseMoney(m[1]);
      if (val != null) return Math.round(val * 100) / 100;
    }
  }
  return null;
}

export function extractTip(text) {
  const lines = toLines(text);
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(/(?:tip|tips|service charge|gratuity)\s*[:.]?\s*(?:\u20B1|P)?\s*(₱)?\s*(\d[\d,.]*)/i);
    if (m && m[2]) {
      const val = parseMoney(m[2]);
      if (val != null) return Math.round(val * 100) / 100;
    }
  }
  return null;
}

// ─── Payment method ───────────────────────────────────────────────

export function extractPaymentMethod(text) {
  const t = text.toLowerCase();
  const checks = [
    [/grab\s?pay|grabpay/i, 'GrabPay'],
    [/shopee\s?pay|shopeepay/i, 'ShopeePay'],
    [/gcash|g ?cash/i, 'GCash'],
    [/paymaya|maya/i, 'Maya'],
    [/unionbank|metrobank|bpi|bdo|landbank|rcbc|visa|mastercard|maestro|jcb|amex|credit card|debit card|\bcard\b/i, 'Card'],
    [/cash/i, 'Cash'],
  ];
  for (const [re, label] of checks) {
    if (re.test(t)) return label;
  }
  return '';
}

// ─── Line items ───────────────────────────────────────────────────

const HEADER_RE = /\b(qty|quantity|description|particulars?|items?|article|unit price|u\/p|amount|price|barcode|code)\b/i;
const FOOTER_RE = /\b(subtotal|total|vat|sales|amount due|balance due|change|cash|discount)\b/i;
const ITEM_NOISE_RE = /(thank|welcome|good bye|please|official receipt|sales invoice|or\s*number|tin\s*[:.]?\s*\d)/i;
const QTY_RE = /(\d+(?:\.\d+)?)\s*[xX@]\s*(₱|PHP|Php|php|P)?\s?(\d{1,3}(?:,\d{3})*\.\d{2})/;

export function extractLineItems(text) {
  const lines = toLines(text);
  let headerIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (!HEADER_RE.test(lines[i])) continue;
    const upper = lines[i].toUpperCase();
    const strong = /\bQTY\b/.test(lines[i]) || /\bU\/P\b/.test(upper) || /\bDESCRIPTION\b/.test(upper);
    const hits = ['qty', 'description', 'amount', 'price', 'item', 'unit'].filter(kw => lines[i].toLowerCase().includes(kw)).length;
    if (strong || hits >= 2) { headerIdx = i; break; }
  }

  let footerIdx = -1;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (FOOTER_RE.test(lines[i])) { footerIdx = i; break; }
  }

  const end = footerIdx === -1 ? lines.length : footerIdx;
  const items = [];

  for (let i = headerIdx === -1 ? 0 : headerIdx + 1; i < end; i++) {
    const line = lines[i];
    const money = lastMoney(line);
    if (money == null) continue;

    let name = line.replace(MONEY_RE, ' ').trim();
    name = name.replace(/^\s*[•*.\-_–]+\s*/, '').replace(/\/[A-Za-z]{1,4}\s*$/, '').replace(/\s+/g, ' ').trim();
    if (name.length < 2 || !/[A-Za-z\u00c0-\u024f]/.test(name)) continue;
    if (ITEM_NOISE_RE.test(name)) continue;
    if (name.length > 60) continue;

    const qtyMatch = line.match(QTY_RE);
    let qty = 1;
    let price = money;
    let total = money;
    if (qtyMatch && qtyMatch[3]) {
      qty = Number(qtyMatch[1]) || 1;
      price = parseMoney(qtyMatch[3]) ?? price;
      total = Math.round(qty * price * 100) / 100;
      name = name.replace(QTY_RE, '').replace(/\s+/g, ' ').trim();
    }

    items.push({ name, qty, price, total });
  }

  return dedupeLineItems(items.slice(0, 40));
}

function dedupeLineItems(items) {
  const seen = new Map();
  for (const it of items) {
    const key = it.name.toLowerCase();
    if (seen.has(key)) {
      const prev = seen.get(key);
      prev.qty += it.qty;
      prev.total = Math.round((prev.total + it.total) * 100) / 100;
      prev.price = prev.total / prev.qty;
    } else {
      seen.set(key, { ...it });
    }
  }
  return [...seen.values()];
}

// ─── Confidence ───────────────────────────────────────────────────

export function computeConfidence(parsed) {
  return {
    merchant: parsed.merchant ? (parsed.merchant.length >= 4 ? 'high' : 'medium') : 'none',
    date: parsed.date ? 'high' : 'none',
    total: parsed.total ? 'high' : 'none',
    tax: parsed.tax ? 'medium' : 'none',
    tip: parsed.tip ? 'medium' : 'none',
    paymentMethod: parsed.paymentMethod ? 'medium' : 'none',
    lineItems: parsed.lineItems.length ? 'high' : 'none',
  };
}

// ─── Orchestrator ─────────────────────────────────────────────────

export function parseReceipt(rawText) {
  const text = normalizeText(rawText);
  const parsed = {
    merchant: extractMerchant(text),
    date: extractDate(text),
    total: extractTotal(text),
    tax: extractTax(text),
    tip: extractTip(text),
    paymentMethod: extractPaymentMethod(text),
    lineItems: extractLineItems(text),
    rawText: text,
  };
  parsed.total = parsed.total || sumLineItems(parsed.lineItems) || null;
  parsed.confidence = computeConfidence(parsed);
  return parsed;
}

// ─── Category suggestion ──────────────────────────────────────────

const CATEGORY_KEYWORDS = {
  Food: ['jollibee', "mcdo", "mcdonald", "chowking", "kfc", "greenwich", "wendy", "pizza hut", "j.co", "dunkin",
    "starbucks", "coffee", "milk tea", "restaurant", "grill", "burger", "bakery", "cafe", "karinderya",
    "puregold", "sm supermart", "sm supermarket", "robinsons supermarket", "robinsons super", "waltermart",
    "landmark supermarket", "savemore", "grocery", "supermarket", "minimart", "food", "market"],
  Transport: ['shell', 'petron', 'caltex', 'seaoil', 'phoenix', 'unioil', 'gas station', 'grab', 'angkas',
    'joyride', 'move it', 'lrt', 'mrt', 'pnr', 'jeepney', 'taxi', 'bus', 'ferry', 'parking', 'toll',
    'easytrip', 'autosweep', 'fuel', 'commute', 'fare'],
  Utilities: ['meralco', 'manila water', 'maynilad', 'pldt', 'globe', 'smart', 'converge', 'skycable',
    'sky cable', 'cignal', 'electric', 'water district', 'internet', 'wifi', 'prepaid load', 'utility'],
  Shopping: ['uniqlo', 'h&m', 'shopee', 'lazada', 'zalora', 'ace hardware', 'true value', 'handyman',
    'department store', 'mall of asia', 'sm city', 'sm mall', 'robinsons place', 'robinsons mall',
    'ayala mall', 'boutique', 'apparel', 'clothing'],
  Healthcare: ['mercury', 'generika', 'the generics', 'watsons', 'pharmacy', 'clinic', 'hospital', 'dental',
    'doctor', 'medical', 'rose pharmacy', 'southstar', 'medicine', 'drug'],
  Entertainment: ['netflix', 'spotify', 'youtube', 'disney', 'cinema', 'movie', 'concert', 'steam',
    'playstation', 'gaming', 'garena', 'mobile legends', 'videoke'],
  Education: ['national bookstore', 'fully booked', 'bookstore', 'books', 'school', 'tuition', 'university',
    'college', 'education', 'review center'],
  Savings: ['bank', 'investment', 'mutual', 'savings', 'bpi', 'bdo', 'metro bank', 'unionbank', 'psbank'],
  Housing: ['rent', 'apartment', 'condo', 'landlord', 'housing', 'electrician', 'plumber'],
};

export function suggestCategory(receipt, categories = []) {
  const list = categories && categories.length ? categories : ['Other'];
  const catScores = Object.keys(CATEGORY_KEYWORDS).map(cat => {
    const words = CATEGORY_KEYWORDS[cat];
    let score = scoreText(receipt.merchant, words) * 1.5;
    for (const it of receipt.lineItems || []) {
      score += scoreText(it.name, words);
    }
    return { cat, score };
  }).sort((a, b) => b.score - a.score);

  const best = catScores[0];
  const fallback = list.includes('Other') ? 'Other' : (list[0] || 'Other');

  if (!best || best.score === 0) return fallback;
  if (list.includes(best.cat)) return best.cat;
  return fallback;
}

function scoreText(text, keywords) {
  if (!text) return 0;
  const t = String(text).toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (t.includes(kw)) score += kw.length;
  }
  return score;
}

// ─── Compose transaction ──────────────────────────────────────────

export function composeTransaction(receipt, categories) {
  const total = Number(receipt.total) || 0;
  const amount = Math.abs(Math.round(total * 100) / 100);
  const source = receipt.merchant || (receipt.lineItems[0] && receipt.lineItems[0].name) || 'Scanned receipt';
  return {
    type: 'expense',
    amount,
    description: source.replace(/\s+/g, ' ').trim() || 'Scanned receipt',
    category: suggestCategory(receipt, categories),
    date: receipt.date || today(),
  };
}