import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { section: 'Overview', items: [
    { to: '/dashboard', icon: '📊', label: 'Dashboard' }
  ]},
  { section: 'Masters', items: [
    { to: '/masters/users', icon: '👥', label: 'User Master', roles: ['admin'] },
    { to: '/masters/raw-materials', icon: '🧪', label: 'Raw Materials' },
    { to: '/masters/packing-machines', icon: '⚙️', label: 'Packing Machines' },
    { to: '/masters/access-rights', icon: '🔐', label: 'Access Rights', roles: ['admin'] },
  ]},
  { section: 'Transactions', items: [
    { to: '/transactions/production-planning', icon: '📋', label: 'Production Planning' },
    { to: '/scan', icon: '📱', label: 'Scanner (Mobile)', external: true },
  ]},
  { section: 'Reports', items: [
    { to: '/reports/raw-material-usage', icon: '📈', label: 'RM Usage Report' },
  ]},
  { section: 'Utility', items: [
    { to: '/utility/backup', icon: '💾', label: 'Backup Database', roles: ['admin'] },
    { to: '/utility/restore', icon: '🔄', label: 'Restore Database', roles: ['admin'] },
  ]},
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">🏭</div>
          <div className="logo-title">Production Management</div>
          <div className="logo-sub">System v1.0</div>
        </div>

        <nav style={{ flex: 1, paddingBottom: '16px' }}>
          {NAV.map(section => {
            const visibleItems = section.items.filter(item =>
              !item.roles || item.roles.includes(user?.role)
            );
            if (!visibleItems.length) return null;
            return (
              <div className="nav-section" key={section.section}>
                <div className="nav-section-label">{section.section}</div>
                {visibleItems.map(item => (
                  item.external ? (
                    <a key={item.to} href={item.to} target="_blank" rel="noreferrer" className="nav-item">
                      <span className="nav-icon">{item.icon}</span>
                      {item.label}
                      <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)' }}>↗</span>
                    </a>
                  ) : (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      {item.label}
                    </NavLink>
                  )
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            <div className="user-info" style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name truncate">{user?.full_name}</div>
              <div className="user-role">{user?.role?.replace('_', ' ')}</div>
            </div>
            <button onClick={handleLogout} className="btn btn-sm btn-secondary btn-icon" title="Logout" style={{ padding: '6px' }}>
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-area">
        <header className="topbar">
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="badge badge-blue">
              {user?.role?.replace(/_/g, ' ')}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
            </span>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
