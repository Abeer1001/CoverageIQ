import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Users, FileText, Bell, Activity, Settings, HelpCircle, LogOut } from 'lucide-react';
import { useAuth } from '../AuthContext';
import Logo from './Logo';

const primaryNav = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: Briefcase },
  { to: '/vendors', label: 'Vendors', icon: Users },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/activity', label: 'Activity', icon: Activity },
];

const secondaryNav = [
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/help', label: 'Help & Support', icon: HelpCircle },
];

export default function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path)) ? 'active' : '';

  return (
    <div className="sidebar">
      <Link to="/" className="sidebar-logo" aria-label="CoverageIQ home">
        <Logo size={28} inverted />
      </Link>
      <nav className="sidebar-nav" style={{ flex: 1 }} aria-label="Primary navigation">
        {primaryNav.map(item => {
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} className={`sidebar-link ${isActive(item.to)}`}>
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <nav className="sidebar-nav" aria-label="Secondary navigation">
        {secondaryNav.map(item => {
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} className={`sidebar-link ${isActive(item.to)}`}>
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
        <button onClick={logout} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9375rem', textAlign: 'left' }}>
          <LogOut size={20} />
          Sign Out
        </button>
      </nav>
    </div>
  );
}
