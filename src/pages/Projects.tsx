import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit2, Plus, Archive } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { db, type Project } from '../db';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

export default function Projects() {
  const { user } = useAuth();
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>(() => db.projects.filter(project => project.companyId === user?.companyId && project.status !== 'Archived'));
  const [editing, setEditing] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Active');
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null);

  const refresh = () => setProjects(db.projects.filter(project => project.companyId === user?.companyId && project.status !== 'Archived'));

  const openNew = () => { setEditing({ id: '', name: '', companyId: user?.companyId || '', status: 'Active' }); setName(''); setDescription(''); setStatus('Active'); };
  const openEdit = (project: Project) => { setEditing(project); setName(project.name); setDescription(project.description || ''); setStatus(project.status); };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing || !name.trim() || !user) return;
    if (editing.id) {
      db.projects = db.projects.map(project => project.id === editing.id ? { ...project, name: name.trim(), description: description.trim(), status } : project);
      db.logActivity(editing.id, `Updated project ${name.trim()}`);
      toast.push('Changes saved successfully.');
    } else {
      const id = crypto.randomUUID();
      db.projects = [...db.projects, { id, name: name.trim(), description: description.trim(), companyId: user.companyId, status, created_at: new Date().toISOString() }];
      db.logActivity(id, `Created project ${name.trim()}`);
      toast.push('Project created successfully.');
    }
    refresh();
    setEditing(null);
  };

  const confirmArchive = () => {
    if (!archiveTarget) return;
    db.projects = db.projects.map(project => project.id === archiveTarget.id ? { ...project, status: 'Archived' } : project);
    db.logActivity(archiveTarget.id, `Archived project ${archiveTarget.name}`);
    toast.push('Project archived.');
    setArchiveTarget(null);
    refresh();
  };

  return (
    <div style={{ animation: 'fadeIn .3s ease' }}>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: 4 }}>Projects</h1>
          <p className="text-muted" style={{ margin: 0 }}>Manage project-specific insurance requirements and vendor compliance.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> New Project</button>
        </div>
      </div>

      {editing && (
        <form className="card mb-4" onSubmit={save}>
          <h3>{editing.id ? 'Edit Project' : 'Create Project'}</h3>
          <div className="form-group">
            <label className="form-label" htmlFor="project-name">Project name</label>
            <input id="project-name" className="form-input" autoFocus value={name} onChange={event => setName(event.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="project-desc">Description</label>
            <textarea id="project-desc" className="form-input" value={description} onChange={event => setDescription(event.target.value)} rows={3} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="project-status">Status</label>
            <select id="project-status" className="form-input" value={status} onChange={event => setStatus(event.target.value)}>
              <option>Active</option>
              <option>On Hold</option>
              <option>Completed</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary">Save Project</button>
          </div>
        </form>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Status</th>
                <th>Vendors</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(project => (
                <tr key={project.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{project.name}</div>
                    {project.description && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>{project.description}</div>}
                  </td>
                  <td><span className="badge badge-neutral">{project.status}</span></td>
                  <td>{db.vendors.filter(vendor => vendor.projectId === project.id).length}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <Link className="btn btn-secondary btn-sm" to={`/project/${project.id}`}>Manage</Link>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(project)} aria-label={`Edit ${project.name}`}><Edit2 size={14} /></button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setArchiveTarget(project)} aria-label={`Archive ${project.name}`}><Archive size={14} /></button>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      <Archive size={32} className="empty-icon" />
                      <h3>No projects yet.</h3>
                      <p>Create your first project to start managing vendor requirements.</p>
                      <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Create Project</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!archiveTarget}
        title="Archive this project?"
        description="Archived projects will no longer appear in your active project list."
        confirmLabel="Archive Project"
        onConfirm={confirmArchive}
        onCancel={() => setArchiveTarget(null)}
      />
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
