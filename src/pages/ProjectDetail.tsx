import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../db';
import type { Vendor, Project, CoverageRequirement, Document } from '../db';
import { StatusBadge } from './Dashboard';
import { Plus, Edit2, Check, X, ShieldAlert, FileText, AlertTriangle, Trash2, UserPlus, ClipboardList, Activity } from 'lucide-react';
import { useAuth } from '../AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

function complianceExplanation(status: string): string {
  switch (status) {
    case 'Compliant': return 'This requirement appears to be satisfied based on the analyzed document.';
    case 'Non-Compliant': return 'The detected coverage is below the minimum required for this project.';
    case 'Missing': return 'No matching coverage was identified in the analyzed document.';
    case 'Needs Review': return 'Coverage information could not be determined with sufficient confidence. Review the source document.';
    case 'Expiring Soon': return 'This policy is approaching its configured expiration threshold.';
    default: return 'This requirement may need attention.';
  }
}

function matrixStatus(req: CoverageRequirement, docs: Document[]): { color: string; label: string } {
  const matching = docs.filter(d => d.coverage_type?.toLowerCase() === req.coverage_type.toLowerCase());
  if (matching.length === 0) {
    return req.required
      ? { color: 'var(--color-neutral)', label: 'Missing' }
      : { color: 'var(--color-neutral-bg)', label: 'Optional' };
  }
  const best = matching.sort((a, b) => (b.coverage_limit || 0) - (a.coverage_limit || 0))[0];
  if (req.minimum_limit && (!best.coverage_limit || best.coverage_limit < req.minimum_limit)) {
    return { color: 'var(--color-danger)', label: 'Non-Compliant' };
  }
  if (best.compliance_status === 'Expiring Soon') {
    return { color: 'var(--color-warning)', label: 'Expiring Soon' };
  }
  return { color: 'var(--color-success)', label: 'Compliant' };
}

export default function ProjectDetail() {
  const { user } = useAuth();
  const { projectId } = useParams();
  const toast = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [requirements, setRequirements] = useState<CoverageRequirement[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activity, setActivity] = useState<{ id: string; description: string; date: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
  const [editingReqId, setEditingReqId] = useState<string | null>(null);
  const [editReqData, setEditReqData] = useState<Partial<CoverageRequirement>>({});
  const [addingRequirement, setAddingRequirement] = useState(false);
  const [newRequirement, setNewRequirement] = useState({ coverage_type: '', minimum_limit: '', required: true, notes: '' });
  const [deleteReqTarget, setDeleteReqTarget] = useState<CoverageRequirement | null>(null);

  const [editingProject, setEditingProject] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, user?.companyId]);

  const loadData = () => {
    if (projectId) {
      const p = db.projects.find(pr => pr.id === projectId && pr.companyId === user?.companyId) || null;
      setProject(p);
      setVendors(db.vendors.filter(v => v.projectId === projectId));
      setRequirements(db.requirements.filter(r => r.projectId === projectId));
      setDocuments(db.documents.filter(d => d.projectId === projectId));
      setActivity(db.activity.filter(a => a.projectId === projectId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      if (p) { setProjectName(p.name); setProjectDescription(p.description || ''); }
      setLoading(false);
    }
  };

  const handleSaveReq = (reqId: string) => {
    db.requirements = db.requirements.map(r => r.projectId === projectId && r.id === reqId ? { ...r, ...editReqData } : r);
    setEditingReqId(null);
    db.reanalyzeProject(projectId!);
    loadData();
    db.logActivity(projectId!, 'Updated insurance requirement');
    toast.push('Requirement updated.');
  };

  const handleAddRequirement = () => {
    if (!projectId || !newRequirement.coverage_type.trim()) return;
    db.requirements = [...db.requirements, {
      id: crypto.randomUUID(),
      projectId,
      coverage_type: newRequirement.coverage_type.trim(),
      minimum_limit: newRequirement.minimum_limit ? Number(newRequirement.minimum_limit) : undefined,
      required: newRequirement.required,
      notes: newRequirement.notes.trim() || undefined,
    }];
    db.reanalyzeProject(projectId);
    db.logActivity(projectId, `Added ${newRequirement.coverage_type} requirement`);
    toast.push('Requirement added successfully.');
    setNewRequirement({ coverage_type: '', minimum_limit: '', required: true, notes: '' });
    setAddingRequirement(false);
    loadData();
  };

  const handleDeleteReq = () => {
    if (!deleteReqTarget || !projectId) return;
    db.requirements = db.requirements.filter(r => r.id !== deleteReqTarget.id);
    db.reanalyzeProject(projectId);
    db.logActivity(projectId, `Removed ${deleteReqTarget.coverage_type} requirement`);
    toast.push('Requirement removed.');
    setDeleteReqTarget(null);
    loadData();
  };

  const handleSaveProject = () => {
    if (!project || !projectName.trim()) return;
    db.projects = db.projects.map(p => p.id === project.id ? { ...p, name: projectName.trim(), description: projectDescription.trim() } : p);
    db.logActivity(project.id, `Updated project ${projectName.trim()}`);
    toast.push('Changes saved successfully.');
    setEditingProject(false);
    loadData();
  };

  const copyUploadLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/upload/${token}`);
    toast.push('Upload link copied.');
  };

  if (loading) return <div><div className="skeleton" style={{ height: 32, maxWidth: 300, marginBottom: 16 }} /><div className="skeleton" style={{ height: 120, marginBottom: 16 }} /><div className="skeleton" style={{ height: 200 }} /></div>;
  if (!project) {
    return (
      <div className="error-state">
        <AlertTriangle size={40} className="empty-icon" />
        <h3>We couldn't find what you're looking for.</h3>
        <p style={{ marginBottom: 'var(--space-3)' }}>This project may have been archived or removed.</p>
        <Link to="/projects" className="btn btn-primary">Back to Projects</Link>
      </div>
    );
  }

  const total = vendors.length;
  const compliant = vendors.filter(v => v.overall_status === 'Compliant').length;
  const nonCompliant = vendors.filter(v => v.overall_status === 'Non-Compliant').length;
  const expiring = vendors.filter(v => v.overall_status === 'Expiring Soon').length;
  const needsReview = vendors.filter(v => v.overall_status === 'Needs Review').length;
  const compliancePercentage = total === 0 ? 0 : Math.round((compliant / total) * 100);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {editingProject ? (
        <form className="card mb-4" onSubmit={e => { e.preventDefault(); handleSaveProject(); }}>
          <h3>Edit Project</h3>
          <div className="form-group">
            <label className="form-label" htmlFor="pd-name">Project name</label>
            <input id="pd-name" className="form-input" value={projectName} onChange={e => setProjectName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="pd-desc">Description</label>
            <textarea id="pd-desc" className="form-input" rows={2} value={projectDescription} onChange={e => setProjectDescription(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setEditingProject(false)}>Cancel</button>
            <button className="btn btn-primary">Save Project</button>
          </div>
        </form>
      ) : (
        <div className="page-header">
          <div>
            <h1 style={{ marginBottom: '4px' }}>{project.name}</h1>
            <p className="text-muted" style={{ margin: 0 }}>Monitor vendor insurance compliance for this project.</p>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-secondary" onClick={() => setEditingProject(true)}><Edit2 size={16} /> Edit Project</button>
            <Link to="/vendors" className="btn btn-secondary"><UserPlus size={16} /> Add Vendor</Link>
            <button className="btn btn-primary" onClick={() => document.getElementById('requirements')?.scrollIntoView({ behavior: 'smooth' })}><ClipboardList size={16} /> Manage Requirements</button>
          </div>
        </div>
      )}

      <div className="card mb-4">
        <div className="flex-between mb-2">
          <h3 style={{ margin: 0 }}>Compliance Overview</h3>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: compliancePercentage >= 80 ? 'var(--color-success)' : 'var(--color-warning)' }}>
            {compliancePercentage}% Overall Compliance
          </div>
        </div>
        <div className="kpi-grid" style={{ marginBottom: 0 }}>
          <div className="card kpi-card" style={{ boxShadow: 'none' }}>
            <div className="kpi-label">Total Vendors</div>
            <div className="kpi-value">{total}</div>
          </div>
          <div className="card kpi-card" style={{ boxShadow: 'none' }}>
            <div className="kpi-label">Compliant</div>
            <div className="kpi-value" style={{ color: 'var(--color-success)' }}>{compliant}</div>
          </div>
          <div className="card kpi-card" style={{ boxShadow: 'none' }}>
            <div className="kpi-label">Non-Compliant</div>
            <div className="kpi-value" style={{ color: 'var(--color-danger)' }}>{nonCompliant}</div>
          </div>
          <div className="card kpi-card" style={{ boxShadow: 'none' }}>
            <div className="kpi-label">Expiring / Review</div>
            <div className="kpi-value" style={{ color: 'var(--color-warning)' }}>{expiring + needsReview}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-4)' }}>
        <div className="card" style={{ height: 'fit-content' }} id="requirements">
          <div className="flex-between" style={{ marginBottom: 'var(--space-2)' }}>
            <div>
              <h3 style={{ margin: 0 }}>Insurance Requirements</h3>
              <p className="text-muted" style={{ fontSize: '0.8125rem', margin: 0 }}>Define the coverage and minimum limits vendors must meet for this project.</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setAddingRequirement(true)}><Plus size={14} /> Add Requirement</button>
          </div>

          {addingRequirement && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, padding: 12, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <label className="form-label" htmlFor="req-type">Coverage Type</label>
              <input id="req-type" className="form-input" placeholder="e.g. General Liability" value={newRequirement.coverage_type} onChange={event => setNewRequirement({ ...newRequirement, coverage_type: event.target.value })} />
              <label className="form-label" htmlFor="req-limit">Minimum Limit</label>
              <input id="req-limit" className="form-input" type="number" placeholder="e.g. 1000000" value={newRequirement.minimum_limit} onChange={event => setNewRequirement({ ...newRequirement, minimum_limit: event.target.value })} />
              <label className="form-label" htmlFor="req-notes">Notes</label>
              <input id="req-notes" className="form-input" placeholder="Optional" value={newRequirement.notes} onChange={event => setNewRequirement({ ...newRequirement, notes: event.target.value })} />
              <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={newRequirement.required} onChange={event => setNewRequirement({ ...newRequirement, required: event.target.checked })} /> Required
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={handleAddRequirement}>Save Requirement</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setAddingRequirement(false)}>Cancel</button>
              </div>
            </div>
          )}

          <ul style={{ listStyle: 'none', padding: 0 }}>
            {requirements.map(req => (
              <li key={req.id} style={{ padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-border)' }}>
                {editingReqId === req.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input type="text" className="form-input" aria-label="Coverage type" value={editReqData.coverage_type} onChange={e => setEditReqData({ ...editReqData, coverage_type: e.target.value })} />
                    <input type="number" className="form-input" placeholder="Minimum limit" aria-label="Minimum limit" value={editReqData.minimum_limit || ''} onChange={e => setEditReqData({ ...editReqData, minimum_limit: parseInt(e.target.value) || undefined })} />
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingReqId(null)}><X size={16} /></button>
                      <button className="btn btn-primary btn-sm" onClick={() => handleSaveReq(req.id)}><Check size={16} /></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-between">
                    <div>
                      <div style={{ fontWeight: 500 }}>{req.coverage_type}{!req.required && <span style={{ color: 'var(--color-text-light)', fontSize: '0.75rem' }}> (optional)</span>}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {req.minimum_limit ? `Minimum $${req.minimum_limit.toLocaleString()}` : 'No minimum limit'}
                        {req.notes ? ` · ${req.notes}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary btn-sm" aria-label={`Edit ${req.coverage_type}`} onClick={() => { setEditingReqId(req.id); setEditReqData(req); }}><Edit2 size={14} /></button>
                      <button className="btn btn-secondary btn-sm" aria-label={`Remove ${req.coverage_type}`} onClick={() => setDeleteReqTarget(req)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                )}
              </li>
            ))}
            {requirements.length === 0 && (
              <li className="empty-state" style={{ padding: 'var(--space-3) 0' }}>
                <p style={{ margin: 0 }}>No requirements yet. Add one to define what coverage vendors must meet.</p>
              </li>
            )}
          </ul>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginTop: 'var(--space-3)' }}>
            Changing requirements automatically recalculates compliance for all assigned vendors.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="card">
            <h3 style={{ marginBottom: 'var(--space-3)' }}>Vendors</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map(vendor => (
                    <React.Fragment key={vendor.id}>
                      <tr>
                        <td>
                          <div style={{ fontWeight: 500, color: 'var(--color-text-main)' }}>{vendor.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>{vendor.contact_name}{vendor.contact_name && vendor.email ? ' · ' : ''}{vendor.email}</div>
                        </td>
                        <td><StatusBadge status={vendor.overall_status} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setExpandedVendor(expandedVendor === vendor.id ? null : vendor.id)}>
                              {expandedVendor === vendor.id ? 'Hide Details' : 'View Documents'}
                            </button>
                            <button className="btn btn-secondary btn-sm" aria-label="Copy upload link" onClick={() => copyUploadLink(vendor.upload_token)}>Copy Upload Link</button>
                          </div>
                        </td>
                      </tr>
                      {expandedVendor === vendor.id && (
                        <tr>
                          <td colSpan={3} style={{ backgroundColor: 'var(--color-neutral-bg)', padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
                            <h4 style={{ marginBottom: 'var(--space-2)' }}>Document Review</h4>
                            {documents.filter(d => d.vendorId === vendor.id).length === 0 ? (
                              <div className="empty-state" style={{ padding: 'var(--space-4) 0' }}>
                                <FileText size={32} className="empty-icon" />
                                <p style={{ margin: '0 0 var(--space-2)' }}>No documents uploaded yet.</p>
                                <button className="btn btn-primary btn-sm" onClick={() => copyUploadLink(vendor.upload_token)}>Copy Upload Link</button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                {documents.filter(d => d.vendorId === vendor.id).map(doc => (
                                  <div key={doc.id} className="card" style={{ padding: 'var(--space-3)', boxShadow: 'none' }}>
                                    <div className="flex-between mb-4">
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <ShieldAlert size={18} color="var(--color-text-muted)" />
                                        <h4 style={{ margin: 0 }}>{doc.coverage_type} <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>({doc.insurer_name || 'Insurer not identified'})</span></h4>
                                      </div>
                                      <StatusBadge status={doc.compliance_status} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--space-2)', fontSize: '0.8125rem', marginBottom: 'var(--space-3)' }}>
                                      <div><div className="text-muted">Policy Number</div><strong>{doc.policy_number || '—'}</strong></div>
                                      <div><div className="text-muted">Coverage Limit</div><strong>{doc.coverage_limit ? `$${doc.coverage_limit.toLocaleString()}` : 'N/A'}</strong></div>
                                      <div><div className="text-muted">Effective</div><strong>{doc.effective_date ? new Date(doc.effective_date).toLocaleDateString() : '—'}</strong></div>
                                      <div><div className="text-muted">Expires</div><strong style={{ color: doc.compliance_status === 'Expiring Soon' ? 'var(--color-warning)' : 'inherit' }}>{doc.expiration_date ? new Date(doc.expiration_date).toLocaleDateString() : '—'}</strong></div>
                                    </div>
                                    <div style={{
                                      backgroundColor: doc.compliance_status === 'Non-Compliant' ? 'var(--color-danger-bg)' : doc.compliance_status === 'Compliant' ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                                      padding: 'var(--space-2)',
                                      borderRadius: 'var(--radius-sm)',
                                      fontSize: '0.875rem',
                                      border: '1px solid var(--color-border)',
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '8px',
                                    }}>
                                      {doc.compliance_status === 'Compliant' ? <ShieldAlert size={18} color="var(--color-success)" style={{ marginTop: 2, flexShrink: 0 }} /> : <AlertTriangle size={18} style={{ color: doc.compliance_status === 'Non-Compliant' ? 'var(--color-danger)' : 'var(--color-warning)', marginTop: '2px', flexShrink: 0 }} />}
                                      <div>
                                        <strong style={{ color: doc.compliance_status === 'Non-Compliant' ? 'var(--color-danger)' : doc.compliance_status === 'Compliant' ? 'var(--color-success)' : 'var(--color-warning)' }}>Finding:</strong>
                                        <div style={{ marginTop: '4px' }}>{complianceExplanation(doc.compliance_status)}</div>
                                        {doc.gap_analysis && doc.compliance_status !== 'Compliant' && <div style={{ marginTop: '4px', color: 'var(--color-text-muted)' }}>{doc.gap_analysis}</div>}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {vendors.length === 0 && (
                    <tr>
                      <td colSpan={3}>
                        <div className="empty-state">
                          <UserPlus size={32} className="empty-icon" />
                          <h3>No vendors assigned to this project.</h3>
                          <p>Add a vendor to start collecting insurance documents.</p>
                          <Link to="/vendors" className="btn btn-primary"><Plus size={16} /> Add Vendor</Link>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="flex-between mb-2">
              <h3 style={{ margin: 0 }}>Recent Activity</h3>
              <Activity size={18} color="var(--color-text-muted)" />
            </div>
            {activity.length === 0 ? (
              <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>No activity recorded yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {activity.slice(0, 8).map(item => (
                  <li key={item.id} style={{ fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                    <span>{item.description}</span>
                    <span style={{ color: 'var(--color-text-light)', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{new Date(item.date).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 'var(--space-4)' }}>
        <div style={{ marginBottom: 'var(--space-2)' }}>
          <h3 style={{ margin: 0 }}>Coverage Matrix</h3>
          <p className="text-muted" style={{ fontSize: '0.8125rem', margin: 0 }}>Coverage status for each vendor against every requirement.</p>
        </div>
        {vendors.length === 0 || requirements.length === 0 ? (
          <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>
            {vendors.length === 0 ? 'Add vendors to see their coverage status.' : 'Add requirements to build the coverage matrix.'}
          </p>
        ) : (
          <>
            <div className="matrix-scroll">
              <table className="matrix">
                <thead>
                  <tr>
                    <th className="matrix-vendor-head">Vendor</th>
                    {requirements.map(req => (
                      <th key={req.id} className="matrix-head">
                        <span style={{ display: 'block', fontWeight: 600 }}>{req.coverage_type}</span>
                        <span style={{ display: 'block', fontWeight: 400, fontSize: '0.7rem', color: 'var(--color-text-light)' }}>
                          {req.minimum_limit ? `$${req.minimum_limit.toLocaleString()}` : 'No min'}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vendors.map(vendor => (
                    <tr key={vendor.id}>
                      <td className="matrix-vendor">
                        <div style={{ fontWeight: 500 }}>{vendor.name}</div>
                      </td>
                      {requirements.map(req => {
                        const vendorDocs = documents.filter(d => d.vendorId === vendor.id);
                        const status = matrixStatus(req, vendorDocs);
                        return (
                          <td key={req.id} className="matrix-cell" title={`${vendor.name} — ${req.coverage_type}: ${status.label}`}>
                            <span className="matrix-dot" style={{ background: status.color }} aria-label={status.label} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)', fontSize: '0.75rem', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
              <span className="flex-center" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--color-success)', display: 'inline-block' }} /> Compliant</span>
              <span className="flex-center" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--color-danger)', display: 'inline-block' }} /> Non-Compliant</span>
              <span className="flex-center" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--color-warning)', display: 'inline-block' }} /> Expiring</span>
              <span className="flex-center" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--color-neutral)', display: 'inline-block' }} /> Missing</span>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteReqTarget}
        title="Remove this requirement?"
        description="This may change the compliance status of vendors on this project."
        confirmLabel="Remove Requirement"
        onConfirm={handleDeleteReq}
        onCancel={() => setDeleteReqTarget(null)}
      />
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
