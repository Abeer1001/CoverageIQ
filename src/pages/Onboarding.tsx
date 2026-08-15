import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { db } from '../db';
import { ShieldAlert } from 'lucide-react';

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('General Contractor');
  const [projectName, setProjectName] = useState('');
  
  const [reqs, setReqs] = useState([
    { type: 'General Liability', limit: '1000000', required: true },
    { type: 'Workers Compensation', limit: '', required: true },
    { type: 'Auto Liability', limit: '1000000', required: true }
  ]);

  if (!user) return null;

  const handleFinish = () => {
    // Create Project
    const pId = crypto.randomUUID();
    db.projects = [...db.projects, { id: pId, name: projectName, companyId: user.companyId, status: 'Active' }];
    
    // Create Reqs
    const newReqs = reqs.map(r => ({
      id: crypto.randomUUID(),
      projectId: pId,
      coverage_type: r.type,
      minimum_limit: r.limit ? parseInt(r.limit) : undefined,
      required: r.required
    }));
    db.requirements = [...db.requirements, ...newReqs];
    
    db.logActivity(pId, 'Project created via onboarding');

    navigate('/dashboard');
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-body)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', padding: 'var(--space-6)' }}>
        <div style={{ marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'center' }}>
          <ShieldAlert size={36} color="var(--color-brand)" />
        </div>
        
        {step === 1 && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={{ textAlign: 'center' }}>Welcome to CoverageIQ, {user.name.split(' ')[0]}</h2>
            <p style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>Let's get your workspace set up.</p>
            <div className="form-group">
              <label className="form-label">What is your role?</label>
              <select className="form-input" value={role} onChange={e => setRole(e.target.value)}>
                <option>General Contractor</option>
                <option>Property Manager</option>
                <option>Other</option>
              </select>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-2)' }} onClick={() => setStep(2)}>Continue</button>
          </div>
        )}

        {step === 2 && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={{ textAlign: 'center' }}>Create your first project</h2>
            <p style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>You'll track vendors and requirements against this project.</p>
            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input type="text" autoFocus placeholder="e.g. Downtown Office Renovation" className="form-input" value={projectName} onChange={e => setProjectName(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary" style={{ flex: 2 }} disabled={!projectName} onClick={() => setStep(3)}>Continue</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={{ textAlign: 'center' }}>Set standard requirements</h2>
            <p style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>Define what insurance coverage is required for {projectName}.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {reqs.map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <input type="text" className="form-input" value={r.type} onChange={e => { const nr = [...reqs]; nr[i].type = e.target.value; setReqs(nr); }} />
                  <input type="number" placeholder="Limit ($)" className="form-input" value={r.limit} onChange={e => { const nr = [...reqs]; nr[i].limit = e.target.value; setReqs(nr); }} />
                  <input type="checkbox" checked={r.required} onChange={e => { const nr = [...reqs]; nr[i].required = e.target.checked; setReqs(nr); }} />
                </div>
              ))}
              <button className="btn btn-secondary" style={{ width: 'fit-content', padding: '4px 12px', fontSize: '0.75rem' }} onClick={() => setReqs([...reqs, { type: '', limit: '', required: true }])}>
                + Add Requirement
              </button>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-6)' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(2)}>Back</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleFinish}>Complete Setup</button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
