import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Settings, ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();
  
  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path)) ? 'active' : '';

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <ShieldAlert size={28} color="var(--color-brand)" />
        CoverageIQ
      </div>
      <nav className="sidebar-nav" style={{ flex: 1 }}>
        <Link to="/dashboard" className={`sidebar-link ${isActive('/dashboard')}`}>
          <LayoutDashboard size={20} />
          Dashboard
        </Link>
        <Link to="/projects" className={`sidebar-link ${isActive('/projects')}`}>
          <FileText size={20} />
          Projects
        </Link>
        <Link to="/vendors" className={`sidebar-link ${isActive('/vendors')}`}>
          <Users size={20} />
          Vendors
        </Link>
      </nav>
      <nav className="sidebar-nav">
        <Link to="/settings" className={`sidebar-link ${isActive('/settings')}`}>
          <Settings size={20} />
          Settings
        </Link>
        <button onClick={logout} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', fontFamily: 'inherit' }}>
          <LogOut size={20} />
          Sign Out
        </button>
      </nav>
    </div>
  );
}
