import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { UploadCloud, CheckCircle, AlertTriangle, ShieldAlert, FileText, Loader2 } from 'lucide-react';
import { db } from '../db';

export default function PublicUpload() {
  const { token } = useParams();
  const [vendor, setVendor] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'success'>('idle');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const v = db.vendors.find(v => v.upload_token === token);
    if (v) {
      setVendor(v);
      setProject(db.projects.find(p => p.id === v.projectId));
    }
  }, [token]);

  if (!vendor) {
    return <div className="flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-body)' }}><h2>Invalid or expired upload link.</h2></div>;
  }

  const handleSimulateUpload = () => {
    setStatus('uploading');
    
    setTimeout(() => {
      setStatus('analyzing');
      
      setTimeout(() => {
        // Find GL req limit to show accurate shortfall based on current reqs
        const reqs = db.requirements.filter(r => r.projectId === project.id);
        const glReq = reqs.find(r => r.coverage_type === 'General Liability');
        const requiredLimit = glReq?.minimum_limit || 1000000;
        const detectedLimit = requiredLimit / 2;
        const shortfall = requiredLimit - detectedLimit;

        const mockResult = {
          id: crypto.randomUUID(),
          vendorId: vendor.id,
          projectId: project.id,
          upload_date: new Date().toISOString(),
          insurer_name: 'Test Insurance Co',
          policy_number: `POL-${Math.floor(Math.random()*10000)}`,
          coverage_type: 'General Liability',
          coverage_limit: detectedLimit,
          effective_date: new Date().toISOString(),
          expiration_date: new Date(Date.now() + 365*24*60*60*1000).toISOString(),
          compliance_status: 'Non-Compliant' as const,
          gap_analysis: `Required: $${requiredLimit.toLocaleString()}. Detected: $${detectedLimit.toLocaleString()}. SHORTFALL: $${shortfall.toLocaleString()}`
        };
        
        db.documents = [...db.documents, mockResult];
        db.recalculateVendorStatuses(project.id);
        db.logActivity(project.id, `${vendor.name} uploaded a document`, vendor.id);

        setResult(mockResult);
        setStatus('success');
      }, 2500);
    }, 1500);
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-body)', padding: 'var(--space-4)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '600px', textAlign: 'center', padding: 'var(--space-6) var(--space-4)' }}>
        <div className="flex-center" style={{ gap: 'var(--space-1)', marginBottom: 'var(--space-4)', color: 'var(--color-brand)' }}>
          <ShieldAlert size={32} />
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-brand)' }}>CoverageIQ</h2>
        </div>
        
        <h3 style={{ marginBottom: 'var(--space-1)' }}>Upload Insurance Documents</h3>
        <p className="text-muted" style={{ marginBottom: 'var(--space-6)' }}>for <strong style={{ color: 'var(--color-text-main)' }}>{vendor.name}</strong> ({project?.name})</p>

        {status === 'idle' && (
          <div onClick={handleSimulateUpload} style={{ border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6) var(--space-4)', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: 'var(--color-bg-body)' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-brand)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}>
            <UploadCloud size={48} color="var(--color-brand)" style={{ margin: '0 auto var(--space-3)' }} />
            <h4 style={{ marginBottom: 'var(--space-1)' }}>Click to upload or drag and drop</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-light)' }}>PDF, JPG, PNG (max 10MB)</p>
            <div style={{ marginTop: 'var(--space-4)' }}>
              <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); handleSimulateUpload(); }}>
                Simulate Upload (Problematic COI)
              </button>
            </div>
          </div>
        )}

        {status === 'uploading' && (
          <div style={{ padding: 'var(--space-6) 0' }}>
            <div style={{ animation: 'pulse 1.5s infinite', margin: '0 auto var(--space-4)', width: 'fit-content' }}>
              <FileText size={48} color="var(--color-text-muted)" />
            </div>
            <h4>Uploading document...</h4>
          </div>
        )}

        {status === 'analyzing' && (
          <div style={{ padding: 'var(--space-6) 0' }}>
            <div style={{ animation: 'spin 2s linear infinite', margin: '0 auto var(--space-4)', width: 'fit-content', color: 'var(--color-brand)' }}>
              <Loader2 size={48} />
            </div>
            <h4>AI is analyzing your document...</h4>
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>Extracting data and checking against {project?.name} requirements.</p>
          </div>
        )}

        {status === 'success' && result && (
          <div style={{ textAlign: 'left', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginTop: 'var(--space-4)', animation: 'fadeIn 0.5s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-success)', marginBottom: 'var(--space-3)' }}>
              <CheckCircle size={28} />
              <div>
                <h4 style={{ margin: 0 }}>Document received.</h4>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Your certificate has been processed.</div>
              </div>
            </div>
            
            <div style={{ backgroundColor: 'var(--color-bg-body)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
              <div className="flex-between" style={{ marginBottom: 'var(--space-3)' }}>
                <h5 style={{ margin: 0, fontSize: '1rem' }}>{result.coverage_type}</h5>
                <span className={`badge ${result.compliance_status === 'Non-Compliant' ? 'badge-danger' : 'badge-success'}`}>
                  {result.compliance_status === 'Non-Compliant' ? 'NON-COMPLIANT' : 'COMPLIANT'}
                </span>
              </div>
              
              {result.compliance_status === 'Non-Compliant' && (
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', color: 'var(--color-danger)', fontSize: '0.875rem', backgroundColor: 'var(--color-danger-bg)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(220,38,38,0.2)' }}>
                  <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: '4px' }}>Gap Detected:</strong>
                    <span style={{ lineHeight: 1.5 }}>{result.gap_analysis}</span>
                  </div>
                </div>
              )}
            </div>
            <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setStatus('idle')}>Upload Another Document</button>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.05); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
