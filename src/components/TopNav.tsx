import { Bell, Search, UserCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function TopNav() {
  const { user } = useAuth();
  
  return (
    <div className="top-nav">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)', width: '300px', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-body)' }}>
        <Search size={18} />
        <input type="text" placeholder="Search vendors or projects..." style={{ border: 'none', background: 'none', outline: 'none', width: '100%', fontSize: '0.875rem' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}>
          <Bell size={20} color="var(--color-text-muted)" />
          <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', backgroundColor: 'var(--color-danger)', borderRadius: '50%' }}></span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', cursor: 'pointer' }}>
          <UserCircle size={28} color="var(--color-text-muted)" />
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{user?.name}</span>
        </div>
      </div>
    </div>
  );
}
