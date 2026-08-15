import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { db } from '../db';
import { useToast } from '../components/Toast';
import { User, Building2, Bell, ShieldCheck } from 'lucide-react';

type Tab = 'profile' | 'company' | 'notifications' | 'security';

const PREFS_KEY = 'coverageiq_notif_prefs';

interface NotifPrefs {
  document: boolean;
  analysis: boolean;
  compliance: boolean;
  expiring: boolean;
  missing: boolean;
}

const defaultPrefs: NotifPrefs = { document: true, analysis: true, compliance: true, expiring: true, missing: true };

function loadPrefs(): NotifPrefs {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    return stored ? { ...defaultPrefs, ...JSON.parse(stored) } : defaultPrefs;
  } catch {
    return defaultPrefs;
  }
}

const notifOptions: { key: keyof NotifPrefs; label: string }[] = [
  { key: 'document', label: 'Document uploaded' },
  { key: 'analysis', label: 'Analysis completed' },
  { key: 'compliance', label: 'Compliance issues' },
  { key: 'expiring', label: 'Expiring policies' },
  { key: 'missing', label: 'Missing documents' },
];

const tabMeta: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: ShieldCheck },
];

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'profile';
  const [tab, setTab] = useState<Tab>(tabMeta.some(t => t.id === initialTab) ? initialTab : 'profile');

  const company = db.companies.find(c => c.id === user?.companyId);

  const [fullName, setFullName] = useState(user?.name || '');
  const [companyName, setCompanyName] = useState(company?.name || '');
  const [industry, setIndustry] = useState(company?.industry || '');
  const [prefs, setPrefs] = useState<NotifPrefs>(loadPrefs);

  const selectTab = (next: Tab) => {
    setTab(next);
    setSearchParams({ tab: next });
  };

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    updateUser({ name: fullName.trim() });
    toast.push('Changes saved successfully.');
  };

  const saveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !company) return;
    db.companies = db.companies.map(c => c.id === company.id ? { ...c, name: companyName.trim(), industry: industry.trim() } : c);
    toast.push('Changes saved successfully.');
  };

  const togglePref = (key: keyof NotifPrefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    toast.push('Notification preferences saved.');
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '4px' }}>Settings</h1>
          <p className="text-muted" style={{ margin: 0 }}>Manage your profile, company, and notification preferences.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 760 }}>
        <div className="tabs">
          {tabMeta.map(meta => {
            const Icon = meta.icon;
            return (
              <button key={meta.id} className={`tab${tab === meta.id ? ' active' : ''}`} onClick={() => selectTab(meta.id)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon size={16} /> {meta.label}
              </button>
            );
          })}
        </div>

        {tab === 'profile' && (
          <form onSubmit={saveProfile} style={{ maxWidth: 420 }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Profile</h3>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-name">Full Name</label>
              <input id="settings-name" className="form-input" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-email">Email</label>
              <input id="settings-email" className="form-input" value={user?.email || ''} disabled style={{ background: 'var(--color-neutral-bg)', color: 'var(--color-text-muted)' }} />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginTop: 4 }}>Used to sign in. Email changes aren't available in this workspace.</p>
            </div>
            <button className="btn btn-primary">Save Changes</button>
          </form>
        )}

        {tab === 'company' && (
          <form onSubmit={saveCompany} style={{ maxWidth: 420 }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Company</h3>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-company">Company Name</label>
              <input id="settings-company" className="form-input" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-industry">Industry</label>
              <input id="settings-industry" className="form-input" placeholder="e.g. General Contracting" value={industry} onChange={e => setIndustry(e.target.value)} />
            </div>
            <button className="btn btn-primary">Save Changes</button>
          </form>
        )}

        {tab === 'notifications' && (
          <div style={{ maxWidth: 420 }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Notifications</h3>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 'var(--space-3)' }}>Choose which email notifications you'd like to receive.</p>
            {notifOptions.map(option => (
              <label key={option.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}>
                <span style={{ fontSize: '0.9rem' }}>{option.label}</span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-checked={prefs[option.key]}
                  checked={prefs[option.key]}
                  onChange={() => togglePref(option.key)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
              </label>
            ))}
          </div>
        )}

        {tab === 'security' && (
          <div style={{ maxWidth: 420 }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Security</h3>
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>
              You're signed in as <strong>{user?.email}</strong>. Your session is stored locally in this workspace.
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-light)' }}>Password changes aren't available in this workspace. Contact your administrator for account changes.</p>
            <button className="btn btn-danger-solid" style={{ marginTop: 'var(--space-3)' }} onClick={() => { logout(); navigate('/login'); }}>Sign Out</button>
          </div>
        )}
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
