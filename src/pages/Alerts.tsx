import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db';
import { useAuth } from '../AuthContext';
import { deriveAlerts } from '../derive';
import type { AlertItem, AlertType } from '../derive';
import { AlertTriangle, Bell, FileText, ShieldCheck } from 'lucide-react';

type Tab = 'All' | 'Critical' | 'Expiring' | 'Missing' | 'Needs Review';

const tabs: Tab[] = ['All', 'Critical', 'Expiring', 'Missing', 'Needs Review'];

function tabFor(type: AlertType): Tab {
  switch (type) {
    case 'coverage_gap': return 'Critical';
    case 'expiring': return 'Expiring';
    case 'missing': return 'Missing';
    case 'needs_review': return 'Needs Review';
  }
}

function alertIcon(type: AlertType) {
  if (type === 'coverage_gap') return <AlertTriangle size={20} color="var(--color-danger)" className="alert-icon" />;
  if (type === 'missing') return <FileText size={20} color="var(--color-danger)" className="alert-icon" />;
  if (type === 'expiring') return <Bell size={20} color="var(--color-warning)" className="alert-icon" />;
  return <AlertTriangle size={20} color="var(--color-warning)" className="alert-icon" />;
}

export default function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [tab, setTab] = useState<Tab>('All');

  useEffect(() => {
    if (user) setAlerts(deriveAlerts(user.companyId));
  }, [user]);

  const filtered = alerts.filter(alert => tab === 'All' || tabFor(alert.type) === tab);

  const actionLabel = (type: AlertType) => {
    switch (type) {
      case 'coverage_gap': return 'Review';
      case 'expiring': return 'View Document';
      case 'missing': return 'Request Document';
      case 'needs_review': return 'Review';
    }
  };

  const actionLink = (alert: AlertItem) => {
    if (alert.type === 'expiring') return '/documents';
    if (alert.type === 'missing') return '/vendors';
    return `/project/${alert.projectId}`;
  };

  const projectFor = (alert: AlertItem) => db.projects.find(p => p.id === alert.projectId)?.name;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '4px' }}>Alerts</h1>
          <p className="text-muted" style={{ margin: 0 }}>Stay ahead of missing documents, coverage gaps, and upcoming expirations.</p>
        </div>
      </div>

      <div className="card">
        <div className="tabs" role="tablist" aria-label="Filter alerts">
          {tabs.map(t => (
            <button key={t} className={`tab${tab === t ? ' active' : ''}`} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
              {t}
              {t !== 'All' && alerts.filter(a => tabFor(a.type) === t).length > 0 && (
                <span style={{ marginLeft: 6, fontSize: '0.75rem', background: 'var(--color-neutral-bg)', borderRadius: 999, padding: '1px 7px' }}>
                  {alerts.filter(a => tabFor(a.type) === t).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <ShieldCheck size={40} color="var(--color-success)" className="empty-icon" />
            <h3>You're all caught up.</h3>
            <p style={{ marginBottom: 0 }}>No active compliance alerts require your attention.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {filtered.map(alert => (
              <div key={alert.id} className="alert-row">
                {alertIcon(alert.type)}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{alert.title} — {alert.vendorName}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                    {alert.description}
                    {projectFor(alert) && <span> ({projectFor(alert)})</span>}
                  </div>
                </div>
                <Link to={actionLink(alert)} className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap' }}>
                  {actionLabel(alert.type)}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
