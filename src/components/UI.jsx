import { useState } from 'react';

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function FormField({ label, children }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function FormRow({ children }) {
  return <div className="form-row">{children}</div>;
}

export function EmptyState({ message }) {
  return <div className="empty-state">{message}</div>;
}

export function ProgressBar({ percent, size = 'normal' }) {
  const cls = percent >= 90 ? 'danger' : percent >= 70 ? 'warning' : 'ok';
  return (
    <div className={`progress-bar ${size === 'small' ? 'progress-sm' : ''}`}>
      <div className={`progress-fill ${cls}`} style={{ width: `${Math.min(percent, 100)}%` }} />
    </div>
  );
}
