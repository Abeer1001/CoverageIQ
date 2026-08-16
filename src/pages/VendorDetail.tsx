import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../db';
import type { Vendor, Document, CoverageRequirement } from '../db';
import { StatusBadge } from './Dashboard';
import { useAuth } from '../AuthContext';
import { useToast } from '../components/Toast';
import ComparisonBar from '../components/ComparisonBar';
import { Mail, Link2, Edit2, AlertTriangle, FileText, Activity, Upload, FilePlus } from 'lucide-react';

function requirementStatus(req: CoverageRequirement, docs: Document[]): { label: string; badge: 'success' | 'danger' | 'warning' | 'neutral'; detail: string; detectedLimit?: number } {
  const matching = docs.filter(d => d.coverage_type?.toLowerCase() === req.coverage_type.toLowerCase());
  if (matching.length === 0) {
    return req.required
      ? { label: 'Missing', badge: 'neutral', detail: 'No matching coverage identified in the analyzed documents.', detectedLimit: undefined }
      : { label: 'Optional', badge: 'neutral', detail: 'Optional coverage not supplied.', detectedLimit: undefined };
  }
  const best = matching.sort((a, b) => (b.coverage_limit || 0) - (a.coverage_limit || 0))[0];
  if (req.minimum_limit && (!best.coverage_limit || best.coverage_limit < req.minimum_limit)) {
    const shortfall = req.minimum_limit - (best.coverage_limit || 0);
    return { label: 'Non-Compliant', badge: 'danger', detail: `Detected $${(best.coverage_limit || 0).toLocaleString()} — shortfall $${shortfall.toLocaleString()}.`, detectedLimit: best.coverage_limit || undefined };
  }
  if (best.compliance_status === 'Expiring Soon') {
    return { label: 'Expiring Soon', badge: 'warning', detail: 'Policy is approaching its configured expiration threshold.', detectedLimit: best.coverage_limit || undefined };
  }
  return { label: 'Compliant', badge: 'success', detail: 'This requirement appears to be satisfied.', detectedLimit: best.coverage_limit || undefined };
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
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [docCoverageType, setDocCoverageType] = useState('');
  const [docLimit, setDocLimit] = useState('');
  const [docInsurer, setDocInsurer] = useState('');
  const [docPolicy, setDocPolicy] = useState('');
  const [docEffective, setDocEffective] = useState('');
  const [docExpiration, setDocExpiration] = useState('');
  const [docBusy, setDocBusy] = useState(false);
  const [docError, setDocError] = useState('');

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

  const addManualDocument = () => {
    setDocError('');
    if (!docCoverageType.trim()) { setDocError('Coverage type is required.'); return; }
    if (!docInsurer.trim() || !docPolicy.trim()) { setDocError('Insurer and policy number are required.'); return; }
    if (!docExpiration) { setDocError('Expiration date is required.'); return; }
    const parsedLimit = docLimit.trim() ? Number(docLimit.replace(/[^0-9.]/g, '')) : undefined;
    if (docLimit.trim() && (!Number.isFinite(parsedLimit) || (parsedLimit as number) < 0)) { setDocError('Enter a valid coverage limit.'); return; }
    const newDoc: Document = {
      id: crypto.randomUUID(),
      vendorId: vendor.id,
      projectId: vendor.projectId,
      upload_date: new Date().toISOString(),
      insurer_name: docInsurer.trim(),
      policy_number: docPolicy.trim(),
      coverage_type: docCoverageType.trim(),
      coverage_limit: parsedLimit as number | undefined,
      effective_date: docEffective || new Date().toISOString(),
      expiration_date: docExpiration,
      compliance_status: 'Compliant',
      gap_analysis: 'Requirements met.',
      file_name: 'Manually entered',
    };
    db.documents = [...db.documents, newDoc];
    db.logActivity(vendor.projectId, `${user?.name || 'Admin'} manually added a ${docCoverageType.trim()} document for ${vendor.name}`, vendor.id);
    db.reanalyzeProject(vendor.projectId);
    setDocuments(db.documents.filter(d => d.vendorId === vendor.id));
    setActivity(db.activity.filter(a => a.vendorId === vendor.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setShowAddDoc(false);
    setDocCoverageType(''); setDocLimit(''); setDocInsurer(''); setDocPolicy(''); setDocEffective(''); setDocExpiration('');
    toast.push('Document added and compliance recalculated.');
  };

  const handleDocFile = async (file: File) => {
    setDocError('');
    if (!file) return;
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setDocError('Choose a PDF, JPG, or PNG file no larger than 10 MB.'); return;
    }
    setDocBusy(true);
    try {
      const requirements = db.requirements.filter(r => r.projectId === vendor.projectId);
      const payload = new FormData();
      payload.append('file', file);
      payload.append('manifest', JSON.stringify({ project: { id: project?.id, name: project?.name }, vendor: { id: vendor.id, name: vendor.name, email: vendor.email, upload_token: vendor.upload_token }, requirements }));
      const storedRes = await fetch('/api/upload', { method: 'POST', body: payload });
      const storedData = await storedRes.json();
      if (!storedRes.ok) throw new Error(storedData.error || 'Upload failed.');
      const analyzedRes = await fetch('/api/analyze-document', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: storedData.id }) });
      const analysis = await analyzedRes.json();
      if (!analyzedRes.ok) throw new Error(analysis.error || 'Analysis failed.');
      const extracted = analysis.extracted || {};
      const serverDocument = analysis.compliance?.document || {};
      const coverages = Array.isArray(extracted.coverages) && extracted.coverages.length > 0
        ? extracted.coverages
        : [{ type: serverDocument.coverage_type, limit: serverDocument.coverage_limit }];
      const base = {
        vendorId: vendor.id,
        projectId: vendor.projectId,
        upload_date: serverDocument.uploaded_at || new Date().toISOString(),
        insurer_name: extracted.insurer || serverDocument.insurer_name || '',
        policy_number: extracted.policy_number || serverDocument.policy_number || '',
        effective_date: extracted.effective_date || serverDocument.effective_date || '',
        expiration_date: extracted.expiration_date || serverDocument.expiration_date || '',
        file_name: serverDocument.filename || file.name,
        file_type: serverDocument.mime_type || file.type,
        confidence: extracted.confidence ?? serverDocument.confidence,
      };
      const newDocuments: Document[] = coverages.map((coverage: { type?: string; limit?: number | null }) => ({
        ...base,
        id: crypto.randomUUID(),
        coverage_type: coverage?.type || serverDocument.coverage_type || '',
        coverage_limit: coverage?.limit ?? undefined,
        compliance_status: 'Compliant',
        gap_analysis: 'Requirements met.',
      }));
      db.documents = [...db.documents, ...newDocuments];
      db.logActivity(vendor.projectId, `${user?.name || 'Admin'} uploaded and analyzed ${file.name} for ${vendor.name}`, vendor.id);
      db.reanalyzeProject(vendor.projectId);
      setDocuments(db.documents.filter(d => d.vendorId === vendor.id));
      setActivity(db.activity.filter(a => a.vendorId === vendor.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setShowAddDoc(false);
      toast.push('Document analyzed and saved.');
    } catch (cause) {
      setDocError(cause instanceof Error ? cause.message : 'The document could not be processed.');
    } finally {
      setDocBusy(false);
    }
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
                  <li key={req.id} style={{ padding: 'var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                    <div className="flex-between" style={{ marginBottom: 'var(--space-2)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{req.coverage_type}</div>
                      <span className={`badge ${badgeClass(result.badge)}`}>{result.label}</span>
                    </div>
                    {req.minimum_limit ? (
                      <ComparisonBar required={req.minimum_limit} detected={result.detectedLimit} />
                    ) : (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                        {result.label === 'Missing' ? 'No matching coverage detected.' : 'Coverage detected (no minimum limit required).'}
                      </div>
                    )}
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>{result.detail}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="flex-between" style={{ marginBottom: 'var(--space-2)' }}>
            <h3 style={{ margin: 0 }}>Documents</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAddDoc(v => !v)}>
              {showAddDoc ? <Edit2 size={14} /> : <FilePlus size={14} />} {showAddDoc ? 'Close' : 'Add Document'}
            </button>
          </div>

          {showAddDoc && (
            <div style={{ padding: 'var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)', background: 'var(--color-bg-body)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="doc-type">Coverage Type</label>
                  <input id="doc-type" className="form-input" placeholder="General Liability" value={docCoverageType} onChange={e => setDocCoverageType(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="doc-limit">Coverage Limit ($)</label>
                  <input id="doc-limit" className="form-input" inputMode="numeric" placeholder="1000000" value={docLimit} onChange={e => setDocLimit(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="doc-insurer">Insurer</label>
                  <input id="doc-insurer" className="form-input" placeholder="SafeCo" value={docInsurer} onChange={e => setDocInsurer(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="doc-policy">Policy Number</label>
                  <input id="doc-policy" className="form-input" placeholder="POL-123" value={docPolicy} onChange={e => setDocPolicy(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="doc-effective">Effective Date</label>
                  <input id="doc-effective" type="date" className="form-input" value={docEffective} onChange={e => setDocEffective(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="doc-expiration">Expiration Date</label>
                  <input id="doc-expiration" type="date" className="form-input" value={docExpiration} onChange={e => setDocExpiration(e.target.value)} />
                </div>
              </div>
              {docError && <div className="badge badge-danger" style={{ display: 'block', marginTop: 'var(--space-2)', whiteSpace: 'normal' }}>{docError}</div>}
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-primary btn-sm" onClick={addManualDocument} disabled={docBusy}><FilePlus size={14} /> Save Document</button>
                <label className="btn btn-secondary btn-sm" style={{ cursor: docBusy ? 'not-allowed' : 'pointer', opacity: docBusy ? 0.6 : 1 }}>
                  <Upload size={14} /> Upload & Analyze File
                  <input hidden type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={docBusy} onChange={e => { const f = e.target.files?.[0]; if (f) handleDocFile(f); e.target.value = ''; }} />
                </label>
                {docBusy && <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Processing document…</span>}
              </div>
            </div>
          )}

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
