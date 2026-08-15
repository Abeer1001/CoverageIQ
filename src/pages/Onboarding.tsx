import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { db } from '../db';
import { CheckCircle, Plus } from 'lucide-react';
import { LogoMark } from '../components/Logo';

interface RequirementDraft {
  type: string;
  limit: string;
  required: boolean;
}

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');

  const [reqs, setReqs] = useState<RequirementDraft[]>([
    { type: 'General Liability', limit: '1000000', required: true },
    { type: 'Workers Compensation', limit: '', required: true },
    { type: 'Auto Liability', limit: '1000000', required: true },
  ]);

  const [vName, setVName] = useState('');
  const [vContact, setVContact] = useState('');
  const [vEmail, setVEmail] = useState('');

  if (!user) return null;

  const handleFinish = () => {
    const pId = crypto.randomUUID();
    db.projects = [...db.projects, { id: pId, name: projectName.trim(), description: description.trim(), companyId: user.companyId, status: 'Active', created_at: new Date().toISOString() }];

    reqs.filter(r => r.type.trim()).forEach(r => {
      db.requirements = [...db.requirements, {
        id: crypto.randomUUID(),
        projectId: pId,
        coverage_type: r.type.trim(),
        minimum_limit: r.limit ? parseInt(r.limit) : undefined,
        required: r.required,
      }];
    });

    if (vName.trim()) {
      db.vendors = [...db.vendors, {
        id: crypto.randomUUID(),
        name: vName.trim(),
        contact_name: vContact.trim(),
        email: vEmail.trim(),
        projectId: pId,
        upload_token: crypto.randomUUID(),
        overall_status: 'Missing',
      }];
    }

    db.logActivity(pId, `Created project ${projectName.trim()}`);
    db.recalculateVendorStatuses(pId);
    setStep(5);
  };

  const totalSteps = 4;
  const progress = Math.min(step, 4);

  return (
    <div className="flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-body)', padding: 'var(--space-4)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '520px', padding: 'var(--space-6)' }}>
        <div style={{ marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'center' }}>
          <LogoMark size={36} />
        </div>

        {step < 5 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <div className="health-bar" style={{ flex: 1 }}>
              <div className="health-seg" style={{ width: `${(progress / totalSteps) * 100}%`, background: 'var(--color-brand)' }} />
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Step {progress} of {totalSteps}</span>
          </div>
        )}

        {step === 1 && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={{ textAlign: 'center' }}>Welcome to CoverageIQ</h2>
            <p style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>Let's set up your workspace so you can start monitoring vendor insurance compliance.</p>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-2)' }} onClick={() => setStep(2)}>Get Started</button>
          </div>
        )}

        {step === 2 && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={{ textAlign: 'center' }}>Create your first project</h2>
            <p style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>You'll track vendors and insurance requirements against this project.</p>
            <div className="form-group">
              <label className="form-label" htmlFor="ob-project-name">Project name</label>
              <input id="ob-project-name" type="text" autoFocus placeholder="e.g. Downtown Office Renovation" className="form-input" value={projectName} onChange={e => setProjectName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ob-project-desc">Description</label>
              <textarea id="ob-project-desc" className="form-input" rows={2} placeholder="Optional — a short note about this project" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary" style={{ flex: 2 }} disabled={!projectName.trim()} onClick={() => setStep(3)}>Continue</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={{ textAlign: 'center' }}>Set insurance requirements</h2>
            <p style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>Add the coverage types and minimum limits your vendors need for {projectName.trim() || 'this project'}.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {reqs.map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <input type="text" className="form-input" aria-label="Coverage type" placeholder="Coverage type" value={r.type} onChange={e => { const nr = [...reqs]; nr[i].type = e.target.value; setReqs(nr); }} />
                  <input type="number" placeholder="Min. limit ($)" aria-label="Minimum limit" className="form-input" value={r.limit} onChange={e => { const nr = [...reqs]; nr[i].limit = e.target.value; setReqs(nr); }} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <input type="checkbox" checked={r.required} onChange={e => { const nr = [...reqs]; nr[i].required = e.target.checked; setReqs(nr); }} />
                    Required
                  </label>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setReqs([...reqs, { type: '', limit: '', required: true }])}>
                <Plus size={14} /> Add requirement
              </button>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-6)' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(2)}>Back</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => setStep(4)}>Continue</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={{ textAlign: 'center' }}>Add your first vendor</h2>
            <p style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>Add a subcontractor now, or skip this and add vendors later.</p>
            <div className="form-group">
              <label className="form-label" htmlFor="ob-v-name">Company name</label>
              <input id="ob-v-name" type="text" className="form-input" placeholder="e.g. ABC Electrical" value={vName} onChange={e => setVName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ob-v-contact">Contact name</label>
              <input id="ob-v-contact" type="text" className="form-input" placeholder="e.g. Jane Doe" value={vContact} onChange={e => setVContact(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ob-v-email">Email</label>
              <input id="ob-v-email" type="email" className="form-input" placeholder="name@company.com" value={vEmail} onChange={e => setVEmail(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(3)}>Back</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleFinish}>Finish Setup</button>
            </div>
            <div style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}>
              <button className="btn-ghost" style={{ fontSize: '0.875rem', color: 'var(--color-brand)' }} onClick={handleFinish}>Skip for now</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div style={{ animation: 'fadeIn 0.3s', textAlign: 'center' }}>
            <div className="flex-center" style={{ marginBottom: 'var(--space-3)' }}>
              <CheckCircle size={48} color="var(--color-success)" />
            </div>
            <h2>Your workspace is ready.</h2>
            <p style={{ marginBottom: 'var(--space-4)' }}>You can now add vendors, request documents, and monitor compliance for {projectName.trim()}.</p>
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
          </div>
        )}
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
