import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../db';
import type { Vendor, Document, CoverageRequirement } from '../db';
import { StatusBadge } from './Dashboard';
import { useAuth } from '../AuthContext';
import { useToast } from '../components/Toast';
import { Mail, Link2, Edit2, AlertTriangle, FileText, Activity } from 'lucide-react';

function requirementStatus(req: CoverageRequirement, docs: Document[]): { label: string; badge: 'success' | 'danger' | 'warning' | 'neutral'; detail: string } {
  const matching = docs.filter(d => d.coverage_type?.toLowerCase() === req.coverage_type.toLowerCase());
  if (matching.length === 0) {
    return req.required
      ? { label: 'Missing', badge: 'neutral', detail: 'No matching coverage identified in the analyzed documents.' }
      : { label: 'Optional', badge: 'neutral', detail: 'Optional coverage not supplied.' };
  }
  const best = matching.sort((a, b) => (b.coverage_limit || 0) - (a.coverage_limit || 0))[0];
  if (req.minimum_limit && (!best.coverage_limit || best.coverage_limit < req.minimum_limit)) {
    const shortfall = req.minimum_limit - (best.coverage_limit || 0);
    return { label: 'Non-Compliant', badge: 'danger', detail: `Detected $${(best.coverage_limit || 0).toLocaleString()} — shortfall $${shortfall.toLocaleString()}.` };
  }
  if (best.compliance_status === 'Expiring Soon') {
    return { label: 'Expiring Soon', badge: 'warning', detail: 'Policy is approaching its configured expiration threshold.' };
  }
  return { label: 'Compliant', badge: 'success', detail: 'This requirement appears to be satisfied.' };
}

function badgeClass(badge: string) {
  return badge === 'success' ? 'badge-success' : badge === 'danger' ? 'badge-danger' : badge === 'warning' ? 'badge-warning' : 'badge-neutral';
}

export default function VendorDetail() {
  const { vendorId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [requirements, setRequirements] = useState<CoverageRequirement[]>([]);
  const [activity, setActivity] = useState<{ id: string; description: string; date: string }[]>([]);

  useEffect(() => {
    const projectIds = new Set(db.projects.filter(p => p.companyId === user?.companyId).map(p => p.id));
    const v = db.vendors.find(item => item.id === vendorId && projectIds.has(item.projectId)) || null;
    setVendor(v);
    if (v) {
      setDocuments(db.documents.filter(d => d.vendorId === v.id));
      setRequirements(db.requirements.filter(r => r.projectId === v.projectId));
      setActivity(db.activity.filter(a => a.vendorId === v.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }
  }, [vendorId, user?.companyId]);

  if (!vendor) {
    return (
      <div className="error-state">
        <AlertTriangle size={40} className="empty-icon" />
        <h3>We couldn't find what you're looking for.</h3>
        <p style={{ marginBottom: 'var(--space-3)' }}>This vendor may have been removed.</p>
        <Link to="/vendors" className="btn btn-primary">Back to Vendors</Link>
      </div>
    );
  }

  const project = db.projects.find(p => p.id === vendor.projectId);
  const company = db.companies.find(c => c.id === user?.companyId);

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/upload/${vendor.upload_token}`);
    toast.push('Upload link copied.');
  };

  const requestUpdate = () => {
    const link = `${window.location.origin}/upload/${vendor.upload_token}`;
    const subject = encodeURIComponent(`Insurance document request for ${project?.name || 'your project'}`);
    const body = encodeURIComponent(`Hi ${vendor.contact_name || vendor.name},\n\n${company?.name || 'We'} are requesting an updated insurance document for ${project?.name || 'your project'}.\n\nPlease use the secure link below to submit your document:\n\n${link}\n\nThank you,\n${company?.name || ''}`);
    window.location.href = `mailto:${vendor.email}?subject=${subject}&body=${body}`;
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {vendor.name}
            <StatusBadge status={vendor.overall_status} />
          </h1>
          <p className="text-muted" style={{ margin: 0 }}>
            {project?.name}{vendor.contact_name ? ` · ${vendor.contact_name}` : ''}{vendor.email ? ` · ${vendor.email}` : ''}
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={requestUpdate}><Mail size={16} /> Request Updated Certificate</button>
          <button className="btn btn-secondary" onClick={copyLink}><Link2 size={16} /> Copy Upload Link</button>
          <Link to="/vendors" className="btn btn-primary"><Edit2 size={16} /> Edit Vendor</Link>
        </div>
      </div>

      <div className="card mb-4">
        <h3 style={{ marginBottom: 'var(--space-2)' }}>Compliance Summary</h3>
        <div className="kpi-grid" style={{ marginBottom: 0 }}>
          <div className="card kpi-card" style={{ boxShadow: 'none' }}>
            <div className="kpi-label">Documents</div>
            <div className="kpi-value">{documents.length}</div>
          </div>
          <div className="card kpi-card" style={{ boxShadow: 'none' }}>
            <div className="kpi-label">Compliant</div>
            <div className="kpi-value" style={{ color: 'var(--color-success)' }}>{documents.filter(d => d.compliance_status === 'Compliant').length}</div>
          </div>
          <div className="card kpi-card" style={{ boxShadow: 'none' }}>
            <div className="kpi-label">Non-Compliant</div>
            <div className="kpi-value" style={{ color: 'var(--color-danger)' }}>{documents.filter(d => d.compliance_status === 'Non-Compliant').length}</div>
          </div>
          <div className="card kpi-card" style={{ boxShadow: 'none' }}>
            <div className="kpi-label">Expiring / Review</div>
            <div className="kpi-value" style={{ color: 'var(--color-warning)' }}>{documents.filter(d => d.compliance_status === 'Expiring Soon' || d.compliance_status === 'Needs Review').length}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-2)' }}>Coverage Requirements</h3>
          {requirements.length === 0 ? (
            <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>No requirements are configured for this project yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {requirements.map(req => {
                const result = requirementStatus(req, documents);
                return (
                  <li key={req.id} style={{ padding: 'var(--space-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                    <div className="flex-between">
                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{req.coverage_type}</div>
                      <span className={`badge ${badgeClass(result.badge)}`}>{result.label}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                      {req.minimum_limit ? `Required minimum: $${req.minimum_limit.toLocaleString()}` : 'No minimum limit'}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: 4 }}>{result.detail}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-2)' }}>Documents</h3>
          {documents.length === 0 ? (
            <div className="empty-state">
              <FileText size={32} className="empty-icon" />
              <h3>No documents yet.</h3>
              <p style={{ marginBottom: 'var(--space-2)' }}>Share the upload link to request a certificate from this vendor.</p>
              <button className="btn btn-primary btn-sm" onClick={copyLink}><Link2 size={14} /> Copy Upload Link</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {documents.map(doc => (
                <div key={doc.id} style={{ padding: 'var(--space-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                  <div className="flex-between">
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{doc.coverage_type || 'Insurance document'}</div>
                    <StatusBadge status={doc.compliance_status} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                    {doc.insurer_name}{doc.policy_number ? ` · ${doc.policy_number}` : ''}
                    {doc.coverage_limit ? ` · $${doc.coverage_limit.toLocaleString()}` : ''}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {doc.expiration_date ? `Expires ${new Date(doc.expiration_date).toLocaleDateString()}` : 'Expiration not provided'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 'var(--space-4)' }}>
        <div className="flex-between mb-2">
          <h3 style={{ margin: 0 }}>Activity</h3>
          <Activity size={18} color="var(--color-text-muted)" />
        </div>
        {activity.length === 0 ? (
          <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>No activity recorded for this vendor yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {activity.slice(0, 8).map(item => (
              <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)', padding: 'var(--space-1) 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.875rem' }}>
                <span>{item.description}</span>
                <span style={{ color: 'var(--color-text-light)', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{new Date(item.date).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
