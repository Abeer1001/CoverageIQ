import { useState, useEffect } from 'react';
import { db } from '../db';
import type { Vendor } from '../db';
import { StatusBadge } from './Dashboard';
import { Plus, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  
  // Add vendor form
  const [vName, setVName] = useState('');
  const [vContact, setVContact] = useState('');
  const [vEmail, setVEmail] = useState('');
  const [vProject, setVProject] = useState(db.projects[0]?.id || '');

  useEffect(() => {
    setVendors(db.vendors);
  }, []);

  const handleAddVendor = (e: React.FormEvent) => {
    e.preventDefault();
    const newV: Vendor = {
      id: crypto.randomUUID(),
      name: vName,
      contact_name: vContact,
      email: vEmail,
      projectId: vProject,
      upload_token: crypto.randomUUID(),
      overall_status: 'Missing'
    };
    db.vendors = [...db.vendors, newV];
    db.logActivity(vProject, `Added vendor ${vName}`, newV.id);
    setVendors(db.vendors);
    setShowAdd(false);
    setVName(''); setVContact(''); setVEmail('');
  };

  const filtered = vendors.filter(v => v.name.toLowerCase().includes(search.toLowerCase()) || v.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="flex-between mb-4">
        <div>
          <h1 style={{ marginBottom: '4px' }}>Vendors</h1>
          <p className="text-muted" style={{ margin: 0 }}>Manage subcontractors and their compliance status.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Add Vendor</button>
      </div>

      {showAdd && (
        <div className="card mb-4" style={{ border: '1px solid var(--color-brand)' }}>
          <h3 className="mb-4">Add New Vendor</h3>
          <form onSubmit={handleAddVendor} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input type="text" required className="form-input" value={vName} onChange={e => setVName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Name</label>
              <input type="text" required className="form-input" value={vContact} onChange={e => setVContact(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" required className="form-input" value={vEmail} onChange={e => setVEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Assign to Project</label>
              <select required className="form-input" value={vProject} onChange={e => setVProject(e.target.value)}>
                {db.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Vendor</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="flex-between mb-4">
          <div style={{ display: 'flex', gap: 'var(--space-2)', flex: 1, maxWidth: '400px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', width: '100%', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '6px 12px' }}>
              <Search size={18} color="var(--color-text-muted)" />
              <input type="text" placeholder="Search vendors..." style={{ border: 'none', background: 'none', outline: 'none', width: '100%', fontSize: '0.875rem' }} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-secondary" style={{ padding: '6px 12px' }}><Filter size={18} /> Filter</button>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Vendor Details</th>
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
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>{vendor.contact_name} &bull; {vendor.email}</div>
                    </td>
                    <td>{project?.name}</td>
                    <td><StatusBadge status={vendor.overall_status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                        <Link to={`/project/${project?.id}`} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>View</Link>
                        <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => navigator.clipboard.writeText(`${window.location.origin}/upload/${vendor.upload_token}`)}>Copy Link</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)' }}>No vendors found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
