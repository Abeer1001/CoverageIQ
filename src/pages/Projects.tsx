import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit2, Plus } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { db, type Project } from '../db';

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState(() => db.projects.filter(project => project.companyId === user?.companyId));
  const [editing, setEditing] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Active');
  const openNew = () => { setEditing({ id: '', name: '', companyId: user?.companyId || '', status: 'Active' }); setName(''); setDescription(''); setStatus('Active'); };
  const openEdit = (project: Project) => { setEditing(project); setName(project.name); setDescription(project.description || ''); setStatus(project.status); };
  const save = (event: React.FormEvent) => {
    event.preventDefault(); if (!editing || !name.trim() || !user) return;
    if (editing.id) {
      db.projects = db.projects.map(project => project.id === editing.id ? { ...project, name: name.trim(), description: description.trim(), status } : project);
      db.logActivity(editing.id, `Updated project ${name.trim()}`);
    } else {
      const id = crypto.randomUUID();
      db.projects = [...db.projects, { id, name: name.trim(), description: description.trim(), companyId: user.companyId, status, created_at: new Date().toISOString() }];
      db.logActivity(id, `Created project ${name.trim()}`);
    }
    setProjects(db.projects.filter(project => project.companyId === user.companyId)); setEditing(null);
  };
  return <div style={{ animation: 'fadeIn .3s ease' }}>
    <div className="flex-between mb-4"><div><h1 style={{ marginBottom: 4 }}>Projects</h1><p className="text-muted" style={{ margin: 0 }}>Set up the insurance requirements for each job.</p></div><button className="btn btn-primary" onClick={openNew}><Plus size={16}/> New Project</button></div>
    {editing && <form className="card mb-4" onSubmit={save}><h3>{editing.id ? 'Edit project' : 'Create project'}</h3><div className="form-group"><label className="form-label">Project name</label><input className="form-input" autoFocus value={name} onChange={event => setName(event.target.value)} required /></div><div className="form-group"><label className="form-label">Description</label><textarea className="form-input" value={description} onChange={event => setDescription(event.target.value)} rows={3} /></div><div className="form-group"><label className="form-label">Status</label><select className="form-input" value={status} onChange={event => setStatus(event.target.value)}><option>Active</option><option>On Hold</option><option>Completed</option></select></div><div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary">Save project</button></div></form>}
    <div className="card"><div className="table-container"><table><thead><tr><th>Project</th><th>Status</th><th>Vendors</th><th>Actions</th></tr></thead><tbody>{projects.map(project => <tr key={project.id}><td><strong>{project.name}</strong></td><td>{project.status}</td><td>{db.vendors.filter(vendor => vendor.projectId === project.id).length}</td><td style={{ display: 'flex', gap: 8 }}><Link className="btn btn-secondary" style={{ padding: '5px 8px', fontSize: '.75rem' }} to={`/project/${project.id}`}>Manage</Link><button className="btn btn-secondary" style={{ padding: '5px 8px' }} onClick={() => openEdit(project)} aria-label={`Edit ${project.name}`}><Edit2 size={14}/></button></td></tr>)}{projects.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32 }}>No projects yet. Create one to start managing compliance.</td></tr>}</tbody></table></div></div>
  </div>;
}
