import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';

// ─── Toast System ───────────────────────────────────────────────
const ToastContext = createContext(null);
let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((message, type = 'success', duration = 3000) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);
  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  return (
    <ToastContext.Provider value={{ addToast: add }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => remove(t.id)}>
            <span className="toast-icon">
              {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
            </span>
            <span className="toast-msg">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export function useToast() { return useContext(ToastContext); }

// ─── Modal ──────────────────────────────────────────────────────
export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ─── Form Helpers ───────────────────────────────────────────────
export function FormField({ label, children, hint }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      {children}
      {hint && <span className="form-hint">{hint}</span>}
    </div>
  );
}
export function FormRow({ children }) { return <div className="form-row">{children}</div>; }

// ─── Progress Bar ───────────────────────────────────────────────
export function ProgressBar({ percent, size = 'normal' }) {
  const cls = percent >= 90 ? 'danger' : percent >= 70 ? 'warning' : 'ok';
  return (
    <div className={`progress-bar ${size === 'small' ? 'progress-sm' : ''}`}>
      <div className={`progress-fill ${cls}`} style={{ width: `${Math.min(percent, 100)}%` }} />
    </div>
  );
}

// ─── Skeleton Loader ────────────────────────────────────────────
export function Skeleton({ width, height = 20, radius, style }) {
  return (
    <div className="skeleton" style={{ width, height, borderRadius: radius || 'var(--radius)', ...style }} />
  );
}
export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <Skeleton width="40%" height={14} />
      <Skeleton width="60%" height={28} style={{ marginTop: 12 }} />
    </div>
  );
}
export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="skeleton-table">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-row">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} width={`${60 + Math.random() * 30}%`} height={16} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────
export function EmptyState({ icon = '📋', message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <p>{message}</p>
      {action}
    </div>
  );
}

// ─── Badge ──────────────────────────────────────────────────────
export function Badge({ children, variant = 'default' }) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}

// ─── Search Input ───────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="search-input-wrap">
      <span className="search-icon">⌕</span>
      <input
        type="text"
        className="search-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && <button className="search-clear" onClick={() => onChange('')}>×</button>}
    </div>
  );
}

// ─── FAB (Floating Action Button) ──────────────────────────────
export function FAB({ onClick, icon = '+', label }) {
  return (
    <button className="fab" onClick={onClick} title={label}>
      <span className="fab-icon">{icon}</span>
      {label && <span className="fab-label">{label}</span>}
    </button>
  );
}

// ─── Tabs ───────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs">
      {tabs.map(t => (
        <button
          key={t.value}
          className={`tab ${active === t.value ? 'tab-active' : ''}`}
          onClick={() => onChange(t.value)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Keyboard Shortcut Hook ────────────────────────────────────
export function useKbdShortcut(combo, handler) {
  useEffect(() => {
    const handler_ = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (combo === 'mod+k' && mod && e.key === 'k') { e.preventDefault(); handler(); }
      if (combo === 'mod+n' && mod && e.key === 'n') { e.preventDefault(); handler(); }
    };
    document.addEventListener('keydown', handler_);
    return () => document.removeEventListener('keydown', handler_);
  }, [combo, handler]);
}

// ─── Offline Indicator ──────────────────────────────────────────
export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const h1 = () => setOnline(true);
    const h2 = () => setOnline(false);
    window.addEventListener('online', h1);
    window.addEventListener('offline', h2);
    return () => { window.removeEventListener('online', h1); window.removeEventListener('offline', h2); };
  }, []);
  return online;
}
