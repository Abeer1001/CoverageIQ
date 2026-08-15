import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { db } from '../db';
import type { Vendor } from '../db';
import { StatusBadge } from './Dashboard';
import { Plus, Search, Link2, Mail, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

const filters = ['All', 'Compliant', 'Non-Compliant', 'Needs Review', 'Expiring Soon', 'Missing'] as const;

export default function Vendors() {
  const { user } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);

  const [vName, setVName] = useState('');
  const [vContact, setVContact] = useState('');
  const [vEmail, setVEmail] = useState('');
  const [vProject, setVProject] = useState(() => db.projects.find(project => project.companyId === user?.companyId)?.id || '');

  const company = db.companies.find(c => c.id === user?.companyId);

  useEffect(() => {
    const projectIds = new Set(db.projects.filter(project => project.companyId === user?.companyId).map(project => project.id));
    setVendors(db.vendors.filter(vendor => projectIds.has(vendor.projectId)));
  }, [user?.companyId]);

  const refresh = () => {
    const projectIds = new Set(db.projects.filter(project => project.companyId === user?.companyId).map(project => project.id));
    setVendors(db.vendors.filter(vendor => projectIds.has(vendor.projectId)));
  };

  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const existing = db.vendors.find(v => v.id === editingId)!;
      db.vendors = db.vendors.map(v => v.id === editingId ? { ...existing, name: vName.trim(), contact_name: vContact.trim(), email: vEmail.trim(), projectId: vProject } : v);
      db.logActivity(vProject, `Updated vendor ${vName.trim()}`, editingId);
      toast.push('Changes saved successfully.');
    } else {
      const newV: Vendor = {
        id: crypto.randomUUID(),
        name: vName.trim(),
        contact_name: vContact.trim(),
        email: vEmail.trim(),
        projectId: vProject,
        upload_token: crypto.randomUUID(),
        overall_status: 'Missing',
      };
      db.vendors = [...db.vendors, newV];
      db.logActivity(vProject, `Added vendor ${vName.trim()}`, newV.id);
      toast.push('Vendor added successfully.');
    }
    refresh();
    setShowAdd(false);
    setEditingId(null);
    setVName(''); setVContact(''); setVEmail('');
  };

  const editVendor = (vendor: Vendor) => {
    setEditingId(vendor.id);
    setVName(vendor.name); setVContact(vendor.contact_name); setVEmail(vendor.email); setVProject(vendor.projectId);
    setShowAdd(true);
  };

  const removeVendor = () => {
    if (!deleteTarget) return;
    db.vendors = db.vendors.filter(v => v.id !== deleteTarget.id);
    db.documents = db.documents.filter(d => d.vendorId !== deleteTarget.id);
    db.logActivity(deleteTarget.projectId, `Removed vendor ${deleteTarget.name}`, deleteTarget.id);
    toast.push('Vendor removed.');
    setDeleteTarget(null);
    refresh();
  };

  const copyLink = (vendor: Vendor) => {
    navigator.clipboard.writeText(`${window.location.origin}/upload/${vendor.upload_token}`);
    toast.push('Upload link copied.');
  };

  const inviteVendor = (vendor: Vendor) => {
    const project = db.projects.find(p => p.id === vendor.projectId);
    const link = `${window.location.origin}/upload/${vendor.upload_token}`;
    const subject = encodeURIComponent(`Insurance document request for ${project?.name || 'your project'}`);
    const body = encodeURIComponent(
      `Hi ${vendor.contact_name || vendor.name},\n\n${company?.name || 'We'} are requesting an updated insurance document for ${project?.name || 'your project'}.\n\nPlease use the secure link below to submit your document:\n\n${link}\n\nIf you have questions about the requested coverage, please contact ${company?.name || 'us'}.\n\nThank you,\n${company?.name || ''}`,
    );
    window.location.href = `mailto:${vendor.email}?subject=${subject}&body=${body}`;
  };

  const filtered = vendors.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) || v.email.toLowerCase().includes(search.toLowerCase()) || v.contact_name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'All' || v.overall_status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '4px' }}>Vendors</h1>
          <p className="text-muted" style={{ margin: 0 }}>Track insurance documents and compliance status across your subcontractors.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => { setEditingId(null); setShowAdd(true); }}><Plus size={16} /> Add Vendor</button>
        </div>
      </div>

      {showAdd && (
        <div className="card mb-4" style={{ border: '1px solid var(--color-brand)' }}>
          <h3 className="mb-2">{editingId ? 'Edit Vendor' : 'Add Vendor'}</h3>
          <form onSubmit={handleSaveVendor} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="v-name">Company Name</label>
              <input id="v-name" type="text" required className="form-input" value={vName} onChange={e => setVName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="v-contact">Contact Name</label>
              <input id="v-contact" type="text" required className="form-input" value={vContact} onChange={e => setVContact(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="v-email">Email</label>
              <input id="v-email" type="email" required className="form-input" value={vEmail} onChange={e => setVEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="v-project">Project</label>
              <select id="v-project" required className="form-input" value={vProject} onChange={e => setVProject(e.target.value)}>
                {db.projects.filter(p => p.companyId === user?.companyId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowAdd(false); setEditingId(null); }}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Add Vendor'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', width: '100%', maxWidth: '360px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '6px 12px' }}>
            <Search size={18} color="var(--color-text-muted)" />
            <input type="text" placeholder="Search vendors..." aria-label="Search vendors" style={{ border: 'none', background: 'none', outline: 'none', width: '100%', fontSize: '0.875rem' }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="pill-group" style={{ marginBottom: 'var(--space-3)' }} role="tablist" aria-label="Filter vendors by status">
          {filters.map(f => (
            <button key={f} className={`pill${filter === f ? ' active' : ''}`} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Project</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(vendor => {
                const project = db.projects.find(p => p.id === vendor.projectId);
                return (
                  <tr key={vendor.id}>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--color-text-main)' }}>{vendor.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>{vendor.contact_name}{vendor.contact_name && vendor.email ? ' · ' : ''}{vendor.email}</div>
                    </td>
                    <td>{project?.name || '—'}</td>
                    <td><StatusBadge status={vendor.overall_status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}>
                        <Link to={`/vendor/${vendor.id}`} className="btn btn-secondary btn-sm">View</Link>
                        <button className="btn btn-secondary btn-sm" aria-label={`Copy upload link for ${vendor.name}`} onClick={() => copyLink(vendor)}><Link2 size={14} /></button>
                        <button className="btn btn-secondary btn-sm" aria-label={`Send invitation to ${vendor.name}`} onClick={() => inviteVendor(vendor)}><Mail size={14} /></button>
                        <button className="btn btn-secondary btn-sm" aria-label={`Edit ${vendor.name}`} onClick={() => editVendor(vendor)}><Edit2 size={14} /></button>
                        <button className="btn btn-secondary btn-sm" aria-label={`Remove ${vendor.name}`} onClick={() => setDeleteTarget(vendor)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      <Search size={32} className="empty-icon" />
                      <h3>No vendors match your filters.</h3>
                      <p>{vendors.length === 0 ? 'Add your first vendor to start tracking insurance compliance.' : 'Try a different search term or filter.'}</p>
                      {vendors.length === 0 && <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Add Vendor</button>}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove this vendor?"
        description="This will remove the vendor from the project. Existing document history may also be affected."
        confirmLabel="Remove Vendor"
        onConfirm={removeVendor}
        onCancel={() => setDeleteTarget(null)}
      />
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
