import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Loader2, ShieldAlert, UploadCloud } from 'lucide-react';
import { db, type Document, type Vendor } from '../db';

export default function PublicUpload() {
  const { token } = useParams();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [stage, setStage] = useState<'idle' | 'uploading' | 'analyzing' | 'complete' | 'error'>('idle');
  const [result, setResult] = useState<Document | null>(null);
  const [error, setError] = useState('');
  const project = vendor ? db.projects.find(item => item.id === vendor.projectId) : undefined;
  const requirements = vendor ? db.requirements.filter(item => item.projectId === vendor.projectId) : [];

  useEffect(() => setVendor(db.vendors.find(item => item.upload_token === token) || null), [token]);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
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
      const document: Document = { id: serverDocument.id, vendorId: vendor.id, projectId: project.id, upload_date: serverDocument.uploaded_at, insurer_name: serverDocument.insurer_name || '', policy_number: serverDocument.policy_number || '', coverage_type: serverDocument.coverage_type || '', coverage_limit: serverDocument.coverage_limit || undefined, effective_date: serverDocument.effective_date || '', expiration_date: serverDocument.expiration_date || '', compliance_status: serverDocument.compliance_status || 'Needs Review', gap_analysis: serverDocument.gap_analysis || 'Analysis requires review.', file_name: serverDocument.filename, file_type: serverDocument.mime_type, confidence: serverDocument.confidence, extraction_notes: 'Server-side AI extraction completed.' };
      db.documents = [...db.documents.filter(item => item.id !== document.id), document];
      db.vendors = db.vendors.map(item => item.id === vendor.id ? { ...item, overall_status: analysis.compliance.status } : item);
      db.logActivity(project.id, `${vendor.name} uploaded and analyzed ${file.name}`, vendor.id);
      setResult(document); setStage('complete');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The document could not be processed.'); setStage('error'); }
  }

  if (!vendor) return <div className="flex-center" style={{ minHeight: '100vh' }}><h2>Invalid or expired upload link.</h2></div>;
  const retry = () => { setError(''); setStage('idle'); };
  return <div className="flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-body)', padding: 'var(--space-4)' }}><div className="card" style={{ width: '100%', maxWidth: 620, padding: 'var(--space-6) var(--space-4)', textAlign: 'center' }}>
    <div className="flex-center" style={{ gap: 8, color: 'var(--color-brand)' }}><ShieldAlert size={30}/><h2>CoverageIQ</h2></div>
    <h3>Upload Insurance Document</h3><p className="text-muted">for <strong>{vendor.name}</strong> · {project?.name}</p>
    {stage === 'idle' && <label style={{ display: 'block', cursor: 'pointer', border: '2px dashed var(--color-border)', borderRadius: 12, padding: 44 }}><UploadCloud size={46} color="var(--color-brand)"/><h4>Choose a certificate to upload</h4><p className="text-muted">PDF, JPG, or PNG · up to 10 MB</p><input hidden type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={upload}/></label>}
    {stage === 'uploading' && <div style={{ padding: 40 }}><Loader2 className="spin" size={42}/><p>Uploading your document securely…</p></div>}
    {stage === 'analyzing' && <div style={{ padding: 40 }}><Loader2 className="spin" size={42}/><p>AI is extracting certificate data and comparing it with project requirements…</p></div>}
    {stage === 'error' && <div><p className="badge badge-danger" style={{ display: 'block' }}>{error}</p><button className="btn btn-secondary" onClick={retry}>Try another document</button></div>}
    {stage === 'complete' && result && <div style={{ textAlign: 'left' }}><div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--color-success)' }}><CheckCircle/><strong>Document saved and evaluated</strong></div><div className={`badge ${result.compliance_status === 'Compliant' ? 'badge-success' : result.compliance_status === 'Non-Compliant' ? 'badge-danger' : 'badge-warning'}`} style={{ marginTop: 12 }}>{result.compliance_status}</div><p><strong>{result.coverage_type}</strong><br/>{result.gap_analysis}</p>{result.compliance_status !== 'Compliant' && <p style={{ display: 'flex', gap: 8 }}><AlertTriangle color="var(--color-warning)"/>Please contact the contractor if an updated certificate is needed.</p>}<button className="btn btn-secondary" onClick={retry}>Upload another document</button></div>}
  </div><style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style></div>;
}
