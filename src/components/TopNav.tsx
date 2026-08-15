import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, UserCircle, HelpCircle, ChevronDown, CheckCheck, FileText, AlertTriangle, Clock, Users } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { deriveNotifications } from '../derive';
import type { NotificationItem } from '../derive';

const READ_KEY = 'coverageiq_notif_read';

function notificationIcon(kind: NotificationItem['kind']) {
  switch (kind) {
    case 'document': return <FileText size={16} color="var(--color-brand)" />;
    case 'analysis': return <Clock size={16} color="var(--color-warning)" />;
    case 'issue': return <AlertTriangle size={16} color="var(--color-danger)" />;
    case 'expiration': return <Clock size={16} color="var(--color-warning)" />;
    case 'missing': return <FileText size={16} color="var(--color-danger)" />;
    default: return <Users size={16} color="var(--color-neutral)" />;
  }
}

export default function TopNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState<'notifications' | 'profile' | null>(null);
  const [query, setQuery] = useState('');
  const [readAt, setReadAt] = useState(() => Number(localStorage.getItem(READ_KEY) || 0));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const notifications = user ? deriveNotifications(user.companyId) : [];
  const unread = notifications.filter(n => new Date(n.date).getTime() > readAt).length;

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    navigate(query.trim() ? `/vendors?q=${encodeURIComponent(query.trim())}` : '/vendors');
  };

  const markAllRead = () => {
    const now = Date.now();
    localStorage.setItem(READ_KEY, String(now));
    setReadAt(now);
  };

  return (
    <div className="top-nav" ref={ref}>
      <form onSubmit={submitSearch} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--color-text-muted)', width: '300px', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-body)' }}>
        <Search size={18} />
        <input
          type="text"
          placeholder="Search vendors or projects..."
          aria-label="Search vendors or projects"
          style={{ border: 'none', background: 'none', outline: 'none', width: '100%', fontSize: '0.875rem' }}
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <button
          onClick={() => navigate('/help')}
          aria-label="Help & Support"
          className="btn-ghost"
          style={{ padding: '6px', borderRadius: 'var(--radius-md)', display: 'flex' }}
        >
          <HelpCircle size={20} color="var(--color-text-muted)" />
        </button>

        <div className="dropdown">
          <button
            onClick={() => setOpen(open === 'notifications' ? null : 'notifications')}
            aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
            aria-expanded={open === 'notifications'}
            className="btn-ghost"
            style={{ padding: '6px', borderRadius: 'var(--radius-md)', position: 'relative', display: 'flex' }}
          >
            <Bell size={20} color="var(--color-text-muted)" />
            {unread > 0 && (
              <span style={{ position: 'absolute', top: '2px', right: '2px', minWidth: '16px', height: '16px', backgroundColor: 'var(--color-danger)', borderRadius: '999px', color: 'white', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{unread}</span>
            )}
          </button>
          {open === 'notifications' && (
            <div className="dropdown-menu" style={{ width: 320, maxHeight: 400, overflowY: 'auto' }}>
              <div className="flex-between" style={{ padding: '8px 10px', borderBottom: '1px solid var(--color-border)', marginBottom: 4 }}>
                <strong style={{ fontSize: '0.875rem' }}>Notifications</strong>
                <button onClick={markAllRead} className="btn-ghost btn-sm" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <CheckCheck size={14} /> Mark all read
                </button>
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: 'var(--space-3)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                  No new notifications.
                </div>
              ) : (
                notifications.slice(0, 8).map(n => (
                  <div key={n.id} style={{ padding: '8px 10px', display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ marginTop: 2 }}>{notificationIcon(n.kind)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{n.title}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{n.description}</div>
                    </div>
                  </div>
                ))
              )}
              <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 4, padding: 4 }}>
                <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => { setOpen(null); navigate('/alerts'); }}>View all alerts</button>
              </div>
            </div>
          )}
        </div>

        <div className="dropdown">
          <button
            onClick={() => setOpen(open === 'profile' ? null : 'profile')}
            aria-label="Account menu"
            aria-expanded={open === 'profile'}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit' }}
          >
            <UserCircle size={28} color="var(--color-text-muted)" />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{user?.name}</span>
            <ChevronDown size={16} color="var(--color-text-muted)" />
          </button>
          {open === 'profile' && (
            <div className="dropdown-menu">
              <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--color-border)', marginBottom: 4 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user?.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{user?.email}</div>
              </div>
              <button onClick={() => { setOpen(null); navigate('/settings?tab=profile'); }}>Profile</button>
              <button onClick={() => { setOpen(null); navigate('/settings?tab=company'); }}>Company Settings</button>
              <button onClick={() => { setOpen(null); navigate('/settings?tab=notifications'); }}>Notification Preferences</button>
              <div className="dropdown-divider" />
              <button onClick={logout} style={{ color: 'var(--color-danger)' }}>Sign Out</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
