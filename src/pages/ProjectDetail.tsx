import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../db';
import type { Vendor, Project, CoverageRequirement, Document } from '../db';
import { StatusBadge } from './Dashboard';
import { Plus, Edit2, Check, X, ShieldAlert, FileText, AlertTriangle } from 'lucide-react';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [requirements, setRequirements] = useState<CoverageRequirement[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
  const [editingReqId, setEditingReqId] = useState<string | null>(null);
  const [editReqData, setEditReqData] = useState<Partial<CoverageRequirement>>({});

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = () => {
    if (projectId) {
      setProject(db.projects.find(p => p.id === projectId) || null);
      setVendors(db.vendors.filter(v => v.projectId === projectId));
      setRequirements(db.requirements.filter(r => r.projectId === projectId));
      setDocuments(db.documents.filter(d => d.projectId === projectId));
    }
  };

  const handleSaveReq = (reqId: string) => {
    const newReqs = requirements.map(r => r.id === reqId ? { ...r, ...editReqData } : r);
    db.requirements = db.requirements.map(r => r.projectId === projectId && r.id === reqId ? { ...r, ...editReqData } : r);
    setRequirements(newReqs);
    setEditingReqId(null);
    
    // Recalculate compliance for all vendors in this project because a requirement changed
    db.recalculateVendorStatuses(projectId);
    loadData(); // Refresh UI
    db.logActivity(projectId!, 'Updated insurance requirement');
  };

  if (!project) return <div>Loading project...</div>;

  const total = vendors.length;
  const compliant = vendors.filter(v => v.overall_status === 'Compliant').length;
  const nonCompliant = vendors.filter(v => v.overall_status === 'Non-Compliant').length;
  const expiring = vendors.filter(v => v.overall_status === 'Expiring Soon').length;
  const needsReview = vendors.filter(v => v.overall_status === 'Needs Review').length;

  const compliancePercentage = total === 0 ? 0 : Math.round((compliant / total) * 100);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="flex-between mb-4">
        <div>
          <h1 style={{ marginBottom: '4px' }}>{project.name}</h1>
          <p className="text-muted" style={{ margin: 0 }}>Manage compliance for this specific project.</p>
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 600, padding: '12px 24px', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
          Compliance Score: <span style={{ color: compliancePercentage >= 80 ? 'var(--color-success)' : 'var(--color-danger)', marginLeft: '8px' }}>{compliancePercentage}%</span>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="card kpi-card">
          <div className="kpi-label">Total Vendors</div>
          <div className="kpi-value">{total}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Compliant</div>
          <div className="kpi-value" style={{ color: 'var(--color-success)' }}>{compliant}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Non-Compliant</div>
          <div className="kpi-value" style={{ color: 'var(--color-danger)' }}>{nonCompliant}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Expiring / Review</div>
          <div className="kpi-value" style={{ color: 'var(--color-warning)' }}>{expiring + needsReview}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-4)' }}>
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="flex-between" style={{ marginBottom: 'var(--space-3)' }}>
            <h3 style={{ margin: 0 }}>Project Requirements</h3>
            <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}><Plus size={14} /> Add</button>
          </div>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {requirements.map(req => (
              <li key={req.id} style={{ padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-border)' }}>
                {editingReqId === req.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input type="text" className="form-input" value={editReqData.coverage_type} onChange={e => setEditReqData({...editReqData, coverage_type: e.target.value})} />
                    <input type="number" className="form-input" placeholder="Min Limit" value={editReqData.minimum_limit || ''} onChange={e => setEditReqData({...editReqData, minimum_limit: parseInt(e.target.value) || undefined})} />
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary" style={{ padding: '4px', border: 'none' }} onClick={() => setEditingReqId(null)}><X size={16} /></button>
                      <button className="btn btn-primary" style={{ padding: '4px' }} onClick={() => handleSaveReq(req.id)}><Check size={16} /></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-between">
                    <div>
                      <div style={{ fontWeight: 500 }}>{req.coverage_type}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {req.minimum_limit ? `$${req.minimum_limit.toLocaleString()}` : (req.required ? 'Required' : 'Optional')}
                      </div>
                    </div>
                    <button className="btn btn-secondary" style={{ padding: '4px', border: 'none' }} onClick={() => { setEditingReqId(req.id); setEditReqData(req); }}>
                      <Edit2 size={14} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginTop: 'var(--space-3)' }}>
            * Changing requirements will automatically recalculate compliance for all assigned vendors.
          </p>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-3)' }}>Assigned Vendors</h3>
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
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>/upload/{vendor.upload_token}</div>
                      </td>
                      <td><StatusBadge status={vendor.overall_status} /></td>
                      <td>
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => setExpandedVendor(expandedVendor === vendor.id ? null : vendor.id)}>
                          {expandedVendor === vendor.id ? 'Hide Details' : 'View Gap Analysis'}
                        </button>
                      </td>
                    </tr>
                    {expandedVendor === vendor.id && (
                      <tr>
                        <td colSpan={3} style={{ backgroundColor: 'var(--color-neutral-bg)', padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
                          <h4 style={{ marginBottom: 'var(--space-2)' }}>Document Review</h4>
                          {documents.filter(d => d.vendorId === vendor.id).length === 0 ? (
                            <div className="flex-center" style={{ padding: 'var(--space-4)', flexDirection: 'column', color: 'var(--color-text-muted)' }}>
                              <FileText size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
                              <p>No documents uploaded yet.</p>
                              <button className="btn btn-primary" style={{ fontSize: '0.75rem' }} onClick={() => navigator.clipboard.writeText(`${window.location.origin}/upload/${vendor.upload_token}`)}>Copy Upload Link</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                              {documents.filter(d => d.vendorId === vendor.id).map(doc => (
                                <div key={doc.id} className="card" style={{ padding: 'var(--space-3)', boxShadow: 'none' }}>
                                  <div className="flex-between mb-4">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <ShieldAlert size={18} color="var(--color-text-muted)" />
                                      <h4 style={{ margin: 0 }}>{doc.coverage_type} <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>({doc.insurer_name})</span></h4>
                                    </div>
                                    <StatusBadge status={doc.compliance_status} />
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--space-2)', fontSize: '0.8125rem', marginBottom: 'var(--space-3)' }}>
                                    <div><div className="text-muted">Policy Number</div><strong>{doc.policy_number}</strong></div>
                                    <div><div className="text-muted">Coverage Limit</div><strong>{doc.coverage_limit ? `$${doc.coverage_limit.toLocaleString()}` : 'N/A'}</strong></div>
                                    <div><div className="text-muted">Effective</div><strong>{new Date(doc.effective_date).toLocaleDateString()}</strong></div>
                                    <div><div className="text-muted">Expires</div><strong style={{ color: doc.compliance_status === 'Expiring Soon' ? 'var(--color-warning)' : 'inherit' }}>{new Date(doc.expiration_date).toLocaleDateString()}</strong></div>
                                  </div>
                                  
                                  {doc.compliance_status !== 'Compliant' && (
                                    <div style={{ 
                                      backgroundColor: doc.compliance_status === 'Non-Compliant' ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)', 
                                      padding: 'var(--space-2)', 
                                      borderRadius: 'var(--radius-sm)', 
                                      fontSize: '0.875rem',
                                      border: `1px solid ${doc.compliance_status === 'Non-Compliant' ? 'rgba(220,38,38,0.2)' : 'rgba(217,119,6,0.2)'}`,
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '8px'
                                    }}>
                                      <AlertTriangle size={18} style={{ color: doc.compliance_status === 'Non-Compliant' ? 'var(--color-danger)' : 'var(--color-warning)', marginTop: '2px', flexShrink: 0 }} />
                                      <div>
                                        <strong style={{ color: doc.compliance_status === 'Non-Compliant' ? 'var(--color-danger)' : 'var(--color-warning)' }}>Gap Analysis Result:</strong>
                                        <div style={{ marginTop: '4px' }}>{doc.gap_analysis}</div>
                                      </div>
                                    </div>
                                  )}
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
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: 'var(--space-4)' }}>No vendors assigned to this project.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
