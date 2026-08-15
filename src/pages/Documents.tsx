import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db';
import type { Document } from '../db';
import { useAuth } from '../AuthContext';
import { StatusBadge } from './Dashboard';
import { Search, FileText } from 'lucide-react';

type DocFilter = 'All' | 'Compliant' | 'Non-Compliant' | 'Needs Review' | 'Expiring' | 'Expired';

const filters: DocFilter[] = ['All', 'Compliant', 'Non-Compliant', 'Needs Review', 'Expiring', 'Expired'];

function isExpired(doc: Document): boolean {
  const expiration = new Date(doc.expiration_date).getTime();
  return Number.isFinite(expiration) && expiration < Date.now();
}

export default function Documents() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<DocFilter>('All');

  useEffect(() => {
    const projectIds = new Set(db.projects.filter(p => p.companyId === user?.companyId).map(p => p.id));
    setDocuments(db.documents.filter(d => projectIds.has(d.projectId)));
  }, [user?.companyId]);

  const matchesFilter = (doc: Document): boolean => {
    switch (filter) {
      case 'All': return true;
      case 'Expired': return isExpired(doc);
      case 'Expiring': return doc.compliance_status === 'Expiring Soon';
      case 'Compliant': return doc.compliance_status === 'Compliant';
      case 'Non-Compliant': return doc.compliance_status === 'Non-Compliant';
      case 'Needs Review': return doc.compliance_status === 'Needs Review';
      default: return true;
    }
  };

  const filtered = documents.filter(doc => {
    const haystack = `${doc.file_name || ''} ${doc.insurer_name} ${doc.policy_number} ${doc.coverage_type}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && matchesFilter(doc);
  });

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '4px' }}>Documents</h1>
          <p className="text-muted" style={{ margin: 0 }}>Review uploaded insurance documents and their analysis status.</p>
        </div>
      </div>

      <div className="card">
        <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', width: '100%', maxWidth: '360px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '6px 12px' }}>
            <Search size={18} color="var(--color-text-muted)" />
            <input type="text" placeholder="Search documents..." aria-label="Search documents" style={{ border: 'none', background: 'none', outline: 'none', width: '100%', fontSize: '0.875rem' }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="pill-group" style={{ marginBottom: 'var(--space-3)' }}>
          {filters.map(f => (
            <button key={f} className={`pill${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Document</th>
                <th>Vendor</th>
                <th>Coverage</th>
                <th>Limit</th>
                <th>Expires</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(doc => {
                const vendor = db.vendors.find(v => v.id === doc.vendorId);
                const project = db.projects.find(p => p.id === doc.projectId);
                const expired = isExpired(doc);
                return (
                  <tr key={doc.id}>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--color-text-main)' }}>{doc.file_name || 'Insurance document'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>{doc.insurer_name || 'Insurer not identified'}{doc.policy_number ? ` · ${doc.policy_number}` : ''}</div>
                    </td>
                    <td>
                      <div>{vendor?.name || '—'}</div>
                      {project && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>{project.name}</div>}
                    </td>
                    <td>{doc.coverage_type || '—'}</td>
                    <td>{doc.coverage_limit ? `$${doc.coverage_limit.toLocaleString()}` : '—'}</td>
                    <td style={{ color: expired ? 'var(--color-danger)' : doc.compliance_status === 'Expiring Soon' ? 'var(--color-warning)' : 'inherit' }}>
                      {doc.expiration_date ? new Date(doc.expiration_date).toLocaleDateString() : '—'}
                    </td>
                    <td><StatusBadge status={expired ? 'Non-Compliant' : doc.compliance_status} /></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <FileText size={32} className="empty-icon" />
                      <h3>{documents.length === 0 ? 'No documents uploaded yet.' : 'No documents match your filters.'}</h3>
                      <p>{documents.length === 0 ? 'Upload a certificate to begin analysis. Documents appear here once a vendor submits them.' : 'Try a different search term or filter.'}</p>
                      {documents.length === 0 && <Link to="/vendors" className="btn btn-primary">Go to Vendors</Link>}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
