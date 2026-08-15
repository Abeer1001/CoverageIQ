import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db';
import type { Vendor } from '../db';
import { useAuth } from '../AuthContext';
import { deriveAlerts } from '../derive';
import DonutChart from '../components/DonutChart';
import { CheckCircle, AlertTriangle, FileText, Bell, Plus, Users, Briefcase, ShieldCheck, ArrowRight } from 'lucide-react';

export function StatusBadge({ status }: { status: string }) {
  let badgeClass = 'badge-neutral';
  if (status === 'Compliant') badgeClass = 'badge-success';
  else if (status === 'Non-Compliant') badgeClass = 'badge-danger';
  else if (status === 'Expiring Soon') badgeClass = 'badge-warning';
  else if (status === 'Needs Review') badgeClass = 'badge-warning';
  else if (status === 'Missing') badgeClass = 'badge-neutral';

  return <span className={`badge ${badgeClass}`}>{status}</span>;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { user } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [projects, setProjects] = useState(db.projects);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.recalculateVendorStatuses();
    const companyProjects = db.projects.filter(project => project.companyId === user?.companyId);
    setVendors(db.vendors.filter(vendor => companyProjects.some(project => project.id === vendor.projectId)));
    setProjects(companyProjects);
    setLoading(false);
  }, [user?.companyId]);

  const alerts = user ? deriveAlerts(user.companyId) : [];

  const total = vendors.length;
  const compliant = vendors.filter(v => v.overall_status === 'Compliant').length;
  const nonCompliant = vendors.filter(v => v.overall_status === 'Non-Compliant').length;
  const expiring = vendors.filter(v => v.overall_status === 'Expiring Soon').length;
  const missing = vendors.filter(v => v.overall_status === 'Missing').length;
  const needsReview = vendors.filter(v => v.overall_status === 'Needs Review').length;
  const overallPct = total === 0 ? 0 : Math.round((compliant / total) * 100);

  const kpis = [
    { label: 'Total Vendors', value: total, color: 'var(--color-neutral)', icon: <Users size={20} color="var(--color-neutral)" /> },
    { label: 'Compliant', value: compliant, color: 'var(--color-success)', icon: <CheckCircle size={20} color="var(--color-success)" /> },
    { label: 'Non-Compliant', value: nonCompliant, color: 'var(--color-danger)', icon: <AlertTriangle size={20} color="var(--color-danger)" /> },
    { label: 'Expiring Soon', value: expiring, color: 'var(--color-warning)', icon: <Bell size={20} color="var(--color-warning)" /> },
    { label: 'Missing Documents', value: missing, color: '#9ca3af', icon: <FileText size={20} color="#9ca3af" /> },
  ];

  const actionFor = (type: string) => {
    switch (type) {
      case 'coverage_gap': return 'Review Vendor';
      case 'expiring': return 'View Document';
      case 'missing': return 'Request Update';
      case 'needs_review': return 'Review Vendor';
      default: return 'Review Vendor';
    }
  };

  const linkFor = (type: string, projectId: string) => {
    if (type === 'expiring') return '/documents';
    if (type === 'missing') return '/vendors';
    return `/project/${projectId}`;
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '4px' }}>{greeting()}, {user?.name.split(' ')[0]}.</h1>
          <p className="text-muted" style={{ margin: 0 }}>Here's the current health of your vendor compliance.</p>
        </div>
        <div className="page-header-actions">
          <Link to="/vendors" className="btn btn-secondary"><Plus size={16} /> Add Vendor</Link>
          <Link to="/projects" className="btn btn-primary"><Briefcase size={16} /> New Project</Link>
        </div>
      </div>

      <div className="kpi-grid">
        {kpis.map(kpi => (
          <div className="card kpi-card" key={kpi.label} style={{ borderTop: `4px solid ${kpi.color}` }}>
            <div className="flex-between">
              <div className="kpi-label">{kpi.label}</div>
              {kpi.icon}
            </div>
            <div className="kpi-value mt-4">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <div className="card">
          <div className="flex-between mb-2">
            <h3 style={{ margin: 0 }}>Compliance Health</h3>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: overallPct >= 80 ? 'var(--color-success)' : 'var(--color-warning)' }}>
              {overallPct}% Overall Compliance
            </div>
          </div>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 'var(--space-3)' }}>A current view of vendor compliance across your active projects.</p>
          {total === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-4) var(--space-2)' }}>
              <p style={{ margin: 0 }}>Add your first vendor to see compliance health.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <DonutChart
                segments={[
                  { value: compliant, color: 'var(--color-success)' },
                  { value: nonCompliant, color: 'var(--color-danger)' },
                  { value: expiring, color: 'var(--color-warning)' },
                  { value: needsReview, color: '#f59e0b' },
                  { value: missing, color: '#9ca3af' },
                ]}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>{overallPct}%</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>compliant</div>
                </div>
              </DonutChart>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', flex: 1, minWidth: 180 }}>
                {[
                  { label: 'Compliant', value: compliant, color: 'var(--color-success)' },
                  { label: 'Non-Compliant', value: nonCompliant, color: 'var(--color-danger)' },
                  { label: 'Expiring Soon', value: expiring, color: 'var(--color-warning)' },
                  { label: 'Needs Review', value: needsReview, color: '#f59e0b' },
                  { label: 'Missing Documents', value: missing, color: '#9ca3af' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: row.color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', flex: 1 }}>{row.label}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex-between mb-2">
            <h3 style={{ margin: 0 }}>Action Required</h3>
            {alerts.length > 0 && <Link to="/alerts" className="btn-ghost btn-sm" style={{ color: 'var(--color-brand)' }}>View all</Link>}
          </div>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 'var(--space-3)' }}>Issues that may need your attention.</p>
          {alerts.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-4) var(--space-2)' }}>
              <ShieldCheck size={32} color="var(--color-success)" className="empty-icon" />
              <h3>You're all caught up.</h3>
              <p style={{ marginBottom: 0 }}>No vendor compliance issues currently require attention.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {alerts.slice(0, 4).map(alert => (
                <div key={alert.id} className="alert-row">
                  {alert.type === 'coverage_gap' || alert.type === 'needs_review' ? (
                    <AlertTriangle size={18} color={alert.type === 'coverage_gap' ? 'var(--color-danger)' : 'var(--color-warning)'} className="alert-icon" />
                  ) : alert.type === 'missing' ? (
                    <FileText size={18} color="var(--color-danger)" className="alert-icon" />
                  ) : (
                    <Bell size={18} color="var(--color-warning)" className="alert-icon" />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{alert.title}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{alert.description}</div>
                  </div>
                  <Link to={linkFor(alert.type, alert.projectId)} className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap' }}>
                    {actionFor(alert.type)} <ArrowRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex-between mb-4">
          <h3 style={{ margin: 0 }}>Vendors</h3>
          <Link to="/vendors" className="btn btn-secondary btn-sm">View All Vendors</Link>
        </div>
        {loading ? (
          <div>
            {[0, 1, 2].map(i => (
              <div className="skeleton-row" key={i}>
                <div className="skeleton skeleton-avatar" />
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line" style={{ maxWidth: 120 }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {vendors.length === 0 ? (
                  <tr><td colSpan={4}>
                    <div className="empty-state">
                      <Users size={32} className="empty-icon" />
                      <h3>No vendors yet.</h3>
                      <p>Add a vendor to start tracking their insurance compliance.</p>
                      <Link to="/vendors" className="btn btn-primary"><Plus size={16} /> Add Vendor</Link>
                    </div>
                  </td></tr>
                ) : vendors.slice(0, 10).map(vendor => {
                  const project = projects.find(p => p.id === vendor.projectId);
                  return (
                    <tr key={vendor.id}>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--color-text-main)' }}>{vendor.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>{vendor.email}</div>
                      </td>
                      <td>{project?.name || 'Unknown'}</td>
                      <td><StatusBadge status={vendor.overall_status} /></td>
                      <td>
                        <Link to={`/project/${project?.id}`} className="btn btn-secondary btn-sm">View Details</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
