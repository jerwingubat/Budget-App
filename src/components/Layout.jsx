import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOnlineStatus, PWAInstallBanner } from './UI';

const NAV = [
  { to: '/', icon: '◈', label: 'Dashboard' },
  { to: '/transactions', icon: '⇄', label: 'Transactions' },
  { to: '/budgets', icon: '◔', label: 'Budgets' },
  { to: '/credit-cards', icon: '▣', label: 'Credit Cards' },
  { to: '/debts', icon: '▲', label: 'Debts' },
  { to: '/reports', icon: '◉', label: 'Reports' },
  { to: '/settings', icon: '⚙', label: 'Settings' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const online = useOnlineStatus();
  const location = useLocation();
  const navigate = useNavigate();
  const current = NAV.find(n => n.to === location.pathname) || NAV[0];

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
          <div className={`sync-indicator ${online ? 'online' : 'offline'}`}>
            <span className="sync-dot" />
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
        {NAV.slice(0, 5).map(n => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `bottomnav-item ${isActive ? 'active' : ''}`}>
            <span className="bottomnav-icon">{n.icon}</span>
            <span className="bottomnav-label">{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
