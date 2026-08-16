import { useEffect, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Check, Loader2, UploadCloud, AlertCircle, AlertTriangle } from 'lucide-react';
import { db, type Document, type Vendor, type Project, type CoverageRequirement } from '../db';
import { LogoMark } from '../components/Logo';

const ANALYSIS_STEPS = [
  'Document received',
  'Reading certificate',
  'Extracting policy information',
  'Matching coverage',
  'Checking project requirements',
  'Generating compliance findings',
];

export default function PublicUpload() {
  const { token } = useParams();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [stage, setStage] = useState<'idle' | 'uploading' | 'analyzing' | 'complete' | 'error'>('idle');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [storedId, setStoredId] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [requirements, setRequirements] = useState<CoverageRequirement[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/upload/${token}`);
        if (!res.ok) { if (!cancelled) setVendor(null); return; }
        const data = await res.json();
        if (cancelled) return;
        setVendor(data.vendor || null);
        setProject(data.project || null);
        setRequirements(Array.isArray(data.requirements) ? data.requirements : []);
      } catch {
        if (cancelled) return;
        const v = db.vendors.find(item => item.upload_token === token) || null;
        setVendor(v);
        setProject(v ? db.projects.find(p => p.id === v.projectId) || null : null);
        setRequirements(v ? db.requirements.filter(r => r.projectId === v.projectId) : []);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  async function runAnalysis(id: string, file: File) {
    setError('');
    setStage('analyzing');
    try {
      const analyzed = await fetch('/api/analyze-document', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const analysis = await analyzed.json();
      if (!analyzed.ok) throw new Error(analysis.error || 'Analysis failed.');
      if (!vendor || !project) throw new Error('The workspace could not be resolved for this document.');
      const extracted = analysis.extracted || {};
      const serverDocument = analysis.compliance?.document || {};
      const coverages = Array.isArray(extracted.coverages) && extracted.coverages.length > 0
        ? extracted.coverages
        : [{ type: serverDocument.coverage_type, limit: serverDocument.coverage_limit }];
      const base = {
        vendorId: vendor.id,
        projectId: project.id,
        upload_date: serverDocument.uploaded_at || new Date().toISOString(),
        insurer_name: extracted.insurer || serverDocument.insurer_name || '',
        policy_number: extracted.policy_number || serverDocument.policy_number || '',
        effective_date: extracted.effective_date || serverDocument.effective_date || '',
        expiration_date: extracted.expiration_date || serverDocument.expiration_date || '',
        file_name: serverDocument.filename,
        file_type: serverDocument.mime_type,
        confidence: extracted.confidence ?? serverDocument.confidence,
      };
      const newDocuments: Document[] = coverages.map((coverage: { type?: string; limit?: number | null }) => ({
        ...base,
        id: crypto.randomUUID(),
        coverage_type: coverage?.type || serverDocument.coverage_type || '',
        coverage_limit: coverage?.limit ?? undefined,
        compliance_status: 'Compliant',
        gap_analysis: 'Requirements met.',
      }));
      try {
        await fetch('/api/ingest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, documents: newDocuments, activity: `${vendor.name} uploaded and analyzed ${file.name}` }) });
      } catch { /* server persistence is best-effort; local db still updated below */ }
      db.documents = [...db.documents.filter(item => item.vendorId !== vendor.id), ...newDocuments];
      db.logActivity(project.id, `${vendor.name} uploaded and analyzed ${file.name}`, vendor.id);
      db.reanalyzeProject(project.id);
      setStage('complete');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The document could not be processed.');
      setStage('error');
    }
  }

  async function handleFile(file: File) {
    if (!file || !vendor || !project) return;
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError('Choose a PDF, JPG, or PNG file no larger than 10 MB.'); setStage('error'); return;
    }
    setLastFile(file);
    setError('');
    setStage('uploading');
    try {
      const payload = new FormData();
      payload.append('file', file);
      payload.append('manifest', JSON.stringify({ project: { id: project.id, name: project.name }, vendor: { id: vendor.id, name: vendor.name, email: vendor.email, upload_token: vendor.upload_token }, requirements }));
      const stored = await fetch('/api/upload', { method: 'POST', body: payload });
      const storedData = await stored.json();
      if (!stored.ok) throw new Error(storedData.error || 'Upload failed.');
      setStoredId(storedData.id);
      await runAnalysis(storedData.id, file);
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

  const retry = () => { setError(''); setStoredId(null); setStage('idle'); };
  const retryAnalysis = () => { if (storedId && lastFile) runAnalysis(storedId, lastFile); };

  const stepState = (index: number): 'done' | 'active' | 'pending' => {
    if (stage === 'complete') return 'done';
    if (stage === 'uploading') return index === 0 ? 'active' : 'pending';
    if (stage === 'analyzing') return index === 0 ? 'done' : index === 1 ? 'active' : 'pending';
    return 'pending';
  };

  const showPipeline = stage === 'uploading' || stage === 'analyzing' || stage === 'complete';

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

        {showPipeline && (
          <div className="analysis-pipeline" role="status" aria-live="polite">
            {ANALYSIS_STEPS.map((label, index) => {
              const state = stepState(index);
              return (
                <div className={`pipeline-step ${state}`} key={label}>
                  <span className="pipeline-indicator">
                    {state === 'done' ? <Check size={14} /> : state === 'active' ? <Loader2 className="spin" size={14} /> : <span className="pipeline-dot" />}
                  </span>
                  <span className="pipeline-label">{label}</span>
                </div>
              );
            })}
          </div>
        )}

        {stage === 'uploading' && (
          <p className="text-muted" style={{ marginTop: 'var(--space-3)', marginBottom: 0 }}>Securely transferring your document…</p>
        )}

        {stage === 'analyzing' && (
          <p className="text-muted" style={{ marginTop: 'var(--space-3)', marginBottom: 0 }}>
            AI-assisted extraction is reading the certificate and comparing it with <strong>{project?.name}</strong> requirements.
          </p>
        )}

        {stage === 'error' && (
          <div>
            <div className="badge badge-danger" style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', padding: '10px', marginBottom: 'var(--space-3)', whiteSpace: 'normal' }} role="alert">
              <AlertCircle size={18} /> {error}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', flexWrap: 'wrap' }}>
              {storedId && lastFile ? (
                <button className="btn btn-primary" onClick={retryAnalysis}>Retry Analysis</button>
              ) : (
                <button className="btn btn-secondary" onClick={retry}>Try another document</button>
              )}
            </div>
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
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .analysis-pipeline { display: flex; flex-direction: column; gap: 10px; max-width: 380px; margin: 0 auto; text-align: left; }
        .pipeline-step { display: flex; align-items: center; gap: 10px; font-size: 0.875rem; color: var(--color-text-muted); transition: color 0.2s ease; }
        .pipeline-step.done { color: var(--color-text-main); }
        .pipeline-step.active { color: var(--color-text-main); font-weight: 500; }
        .pipeline-indicator { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid var(--color-border); background: white; color: var(--color-text-light); }
        .pipeline-step.done .pipeline-indicator { background: var(--color-success); border-color: var(--color-success); color: white; }
        .pipeline-step.active .pipeline-indicator { border-color: var(--color-brand); color: var(--color-brand); }
        .pipeline-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-text-light); display: inline-block; }
      `}</style>
    </div>
  );
}
