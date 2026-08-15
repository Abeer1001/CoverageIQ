import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db';
import type { Vendor } from '../db';
import { useAuth } from '../AuthContext';
import { CheckCircle, AlertTriangle, FileText, Plus, Bell } from 'lucide-react';

export function StatusBadge({ status }: { status: string }) {
  let badgeClass = 'badge-neutral';
  if (status === 'Compliant') { badgeClass = 'badge-success'; }
  else if (status === 'Non-Compliant') { badgeClass = 'badge-danger'; }
  else if (status === 'Expiring Soon') { badgeClass = 'badge-warning'; }
  else if (status === 'Needs Review') { badgeClass = 'badge-warning'; }
  
  return (
    <span className={`badge ${badgeClass}`}>
      {status}
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [projects, setProjects] = useState(db.projects);

  useEffect(() => {
    // Force recalculation to ensure fresh status
    db.recalculateVendorStatuses();
    setVendors(db.vendors);
    setProjects(db.projects);
  }, []);

  const total = vendors.length;
  const compliant = vendors.filter(v => v.overall_status === 'Compliant').length;
  const nonCompliant = vendors.filter(v => v.overall_status === 'Non-Compliant').length;
  const expiring = vendors.filter(v => v.overall_status === 'Expiring Soon').length;
  const missing = vendors.filter(v => v.overall_status === 'Missing').length;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="flex-between mb-4">
        <div>
          <h1 style={{ marginBottom: '4px' }}>Good morning, {user?.name.split(' ')[0]}</h1>
          <p className="text-muted" style={{ margin: 0 }}>Here's your compliance overview across all projects.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <select className="form-input" style={{ width: 'auto', padding: '8px 16px', fontWeight: 500 }}>
            <option>All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="btn btn-primary"><Plus size={16} /> Add Vendor</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="card kpi-card" style={{ borderTop: '4px solid var(--color-neutral)' }}>
          <div className="flex-between">
            <div className="kpi-label">Total Vendors</div>
            <UsersIcon />
          </div>
          <div className="kpi-value mt-4">{total}</div>
        </div>
        <div className="card kpi-card" style={{ borderTop: '4px solid var(--color-success)' }}>
          <div className="flex-between">
            <div className="kpi-label">Compliant</div>
            <CheckCircle size={20} color="var(--color-success)" />
          </div>
          <div className="kpi-value mt-4">{compliant}</div>
        </div>
        <div className="card kpi-card" style={{ borderTop: '4px solid var(--color-danger)' }}>
          <div className="flex-between">
            <div className="kpi-label">Non-Compliant</div>
            <AlertTriangle size={20} color="var(--color-danger)" />
          </div>
          <div className="kpi-value mt-4">{nonCompliant}</div>
        </div>
        <div className="card kpi-card" style={{ borderTop: '4px solid var(--color-warning)' }}>
          <div className="flex-between">
            <div className="kpi-label">Expiring Soon</div>
            <Bell size={20} color="var(--color-warning)" />
          </div>
          <div className="kpi-value mt-4">{expiring}</div>
        </div>
        <div className="card kpi-card" style={{ borderTop: '4px solid #9ca3af' }}>
          <div className="flex-between">
            <div className="kpi-label">Missing Docs</div>
            <FileText size={20} color="#9ca3af" />
          </div>
          <div className="kpi-value mt-4">{missing}</div>
        </div>
      </div>

      <div className="card">
        <div className="flex-between mb-4">
          <h3 style={{ margin: 0 }}>Vendor Status Overview</h3>
          <Link to="/vendors" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>View All Vendors</Link>
        </div>
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
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-6)' }}>No vendors yet. <br/><br/><button className="btn btn-primary">Invite Vendor</button></td></tr>
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
                      <Link to={`/project/${project?.id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                        View Details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

function UsersIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
}
