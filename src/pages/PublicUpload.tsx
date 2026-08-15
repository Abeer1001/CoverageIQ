import { useEffect, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Loader2, UploadCloud, AlertCircle, AlertTriangle } from 'lucide-react';
import { db, type Document, type Vendor } from '../db';
import { LogoMark } from '../components/Logo';

export default function PublicUpload() {
  const { token } = useParams();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [stage, setStage] = useState<'idle' | 'uploading' | 'analyzing' | 'complete' | 'error'>('idle');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const project = vendor ? db.projects.find(item => item.id === vendor.projectId) : undefined;
  const requirements = vendor ? db.requirements.filter(item => item.projectId === vendor.projectId) : [];

  useEffect(() => setVendor(db.vendors.find(item => item.upload_token === token) || null), [token]);

  async function handleFile(file: File) {
    if (!file || !vendor || !project) return;
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError('Choose a PDF, JPG, or PNG file no larger than 10 MB.'); setStage('error'); return;
    }
    try {
      setError(''); setStage('uploading');
      const payload = new FormData();
      payload.append('file', file);
      payload.append('manifest', JSON.stringify({ project: { id: project.id, name: project.name }, vendor: { id: vendor.id, name: vendor.name, email: vendor.email, upload_token: vendor.upload_token }, requirements }));
      const stored = await fetch('/api/upload', { method: 'POST', body: payload });
      const storedData = await stored.json();
      if (!stored.ok) throw new Error(storedData.error || 'Upload failed.');
      setStage('analyzing');
      const analyzed = await fetch('/api/analyze-document', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: storedData.id }) });
      const analysis = await analyzed.json();
      if (!analyzed.ok) throw new Error(analysis.error || 'Analysis failed.');
      const serverDocument = analysis.compliance.document;
      const document: Document = { id: serverDocument.id, vendorId: vendor.id, projectId: project.id, upload_date: serverDocument.uploaded_at, insurer_name: serverDocument.insurer_name || '', policy_number: serverDocument.policy_number || '', coverage_type: serverDocument.coverage_type || '', coverage_limit: serverDocument.coverage_limit || undefined, effective_date: serverDocument.effective_date || '', expiration_date: serverDocument.expiration_date || '', compliance_status: serverDocument.compliance_status || 'Needs Review', gap_analysis: serverDocument.gap_analysis || 'Analysis requires review.', file_name: serverDocument.filename, file_type: serverDocument.mime_type, confidence: serverDocument.confidence };
      db.documents = [...db.documents.filter(item => item.id !== document.id), document];
      db.vendors = db.vendors.map(item => item.id === vendor.id ? { ...item, overall_status: analysis.compliance.status } : item);
      db.logActivity(project.id, `${vendor.name} uploaded and analyzed ${file.name}`, vendor.id);
      setStage('complete');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The document could not be processed.');
      setStage('error');
    }
  }

  function onInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  if (!vendor) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', padding: 'var(--space-4)' }}>
        <div className="card text-center" style={{ maxWidth: 460 }}>
          <AlertTriangle size={40} color="var(--color-text-muted)" style={{ marginBottom: 'var(--space-2)' }} />
          <h2>Invalid or expired upload link.</h2>
          <p style={{ margin: 0 }}>This upload link is no longer valid. Please contact the requesting contractor for a new link.</p>
        </div>
      </div>
    );
  }

  const retry = () => { setError(''); setStage('idle'); };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-body)', padding: 'var(--space-4)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 620, padding: 'var(--space-6) var(--space-4)', textAlign: 'center' }}>
        <div className="flex-center" style={{ gap: 8, color: 'var(--color-brand)', marginBottom: 'var(--space-1)' }}>
          <LogoMark size={30} />
          <h2 style={{ margin: 0 }}>CoverageIQ</h2>
        </div>
        <p style={{ fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-light)', marginBottom: 'var(--space-3)' }}>Insurance Document Submission</p>
        <p className="text-muted" style={{ marginBottom: 'var(--space-3)' }}>
          <strong>Vendor:</strong> {vendor.name} &nbsp;·&nbsp; <strong>Project:</strong> {project?.name}
        </p>
        <h3>Submit your insurance certificate</h3>
        <p className="text-muted" style={{ marginBottom: 'var(--space-4)' }}>
          Upload your current insurance certificate or policy document. CoverageIQ will securely process the document for the requesting contractor.
        </p>

        {stage === 'idle' && (
          <label
            style={{ display: 'block', cursor: 'pointer', border: `2px dashed ${dragging ? 'var(--color-brand)' : 'var(--color-border)'}`, borderRadius: 12, padding: 44, background: dragging ? 'var(--color-success-bg)' : 'transparent' }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <UploadCloud size={46} color="var(--color-brand)" />
            <h4 style={{ marginTop: 'var(--space-2)' }}>Drag and drop your file here</h4>
            <p className="text-muted">or</p>
            <span className="btn btn-primary">Choose File</span>
            <p className="text-muted" style={{ marginTop: 'var(--space-2)', fontSize: '0.8125rem' }}>PDF, JPG, or PNG · up to 10 MB</p>
            <input hidden type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={onInput} />
          </label>
        )}

        {stage === 'uploading' && (
          <div style={{ padding: 40 }}>
            <Loader2 className="spin" size={42} color="var(--color-brand)" />
            <p style={{ marginTop: 'var(--space-2)' }}>Uploading document...</p>
          </div>
        )}

        {stage === 'analyzing' && (
          <div style={{ padding: 40 }}>
            <Loader2 className="spin" size={42} color="var(--color-brand)" />
            <p style={{ marginTop: 'var(--space-2)' }}>Analyzing certificate...</p>
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>Extracting policy information and comparing coverage with project requirements.</p>
          </div>
        )}

        {stage === 'error' && (
          <div>
            <div className="badge badge-danger" style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', padding: '10px', marginBottom: 'var(--space-3)', whiteSpace: 'normal' }} role="alert">
              <AlertCircle size={18} /> {error}
            </div>
            <button className="btn btn-secondary" onClick={retry}>Try another document</button>
          </div>
        )}

        {stage === 'complete' && (
          <div>
            <div className="flex-center" style={{ color: 'var(--color-success)', marginBottom: 'var(--space-2)' }}>
              <CheckCircle size={40} />
            </div>
            <h3>Document received.</h3>
            <p className="text-muted" style={{ marginBottom: 'var(--space-3)' }}>
              Your document has been submitted successfully. You can close this page.
            </p>
          </div>
        )}
      </div>
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
