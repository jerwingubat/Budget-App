import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOnlineStatus, PWAInstallBanner } from './UI';

const NAV = [
  { to: '/', icon: '◈', label: 'Dashboard' },
  { to: '/transactions', icon: '⇄', label: 'Transactions' },
  { to: '/budgets', icon: '◔', label: 'Budgets' },
  { to: '/credit-cards', icon: '▣', label: 'Cards' },
  { to: '/debts', icon: '▲', label: 'Debts' },
  { to: '/reports', icon: '◉', label: 'Reports' },
  { to: '/settings', icon: '⚙', label: 'Settings' },
];

const PRIMARY_NAV = NAV.slice(0, 3);
const MORE_NAV = NAV.slice(3);

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const online = useOnlineStatus();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const go = (to) => { setMoreOpen(false); navigate(to); };

  return (
    <div className="app-shell">
      {/* Top Nav */}
      <header className="topnav">
        <div className="topnav-left">
          <div className="topnav-brand">
            <span className="brand-icon">◆</span>
            <span className="brand-text">BudgetFlow</span>
          </div>
          <nav className="topnav-links">
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `topnav-link ${isActive ? 'active' : ''}`}>
                <span className="topnav-link-icon">{n.icon}</span>
                <span className="topnav-link-text">{n.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="topnav-right">
          <div className="sync-indicator" title={online ? 'Synced' : 'Offline'}>
            <span className={`sync-dot ${online ? 'online-dot' : ''}`} />
            <span className="sync-text">{online ? 'Synced' : 'Offline'}</span>
          </div>
          <div className="user-menu">
            {user?.photoURL && <img src={user.photoURL} alt="" className="user-avatar" referrerPolicy="no-referrer" />}
            <span className="user-name">{user?.displayName || user?.email}</span>
            <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <PWAInstallBanner />
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="bottomnav">
        {PRIMARY_NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `bottomnav-item ${isActive ? 'active' : ''}`}>
            <span className="bottomnav-icon">{n.icon}</span>
            <span className="bottomnav-label">{n.label}</span>
          </NavLink>
        ))}
        <button className={`bottomnav-item ${moreOpen ? 'active' : ''}`} onClick={() => setMoreOpen(o => !o)}>
          <span className="bottomnav-icon">☰</span>
          <span className="bottomnav-label">More</span>
        </button>
      </nav>

      {/* More Sheet */}
      {moreOpen && (
        <div className="more-sheet-overlay" onClick={() => setMoreOpen(false)}>
          <div className="more-sheet" onClick={e => e.stopPropagation()}>
            <div className="more-sheet-grip" />
            <p className="more-sheet-title">More</p>
            <div className="more-sheet-list">
              {MORE_NAV.map(n => (
                <button key={n.to} className={`more-sheet-item ${location.pathname === n.to ? 'active' : ''}`} onClick={() => go(n.to)}>
                  <span className="more-sheet-icon">{n.icon}</span>
                  <span>{n.label}</span>
                </button>
              ))}
            </div>
            <button className="more-sheet-item more-sheet-logout" onClick={logout}>
              <span className="more-sheet-icon">⎋</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}