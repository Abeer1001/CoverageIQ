import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';

const root = process.cwd();
const dataDir = join(root, 'data');
const uploadDir = join(dataDir, 'uploads');
await mkdir(uploadDir, { recursive: true });
const database = new DatabaseSync(join(dataDir, 'coverageiq.sqlite'));
database.exec(`PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS vendors (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, name TEXT NOT NULL, email TEXT, status TEXT NOT NULL DEFAULT 'Missing', upload_token TEXT);
  CREATE TABLE IF NOT EXISTS requirements (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, coverage_type TEXT NOT NULL, minimum_limit REAL, required INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, vendor_id TEXT NOT NULL, project_id TEXT NOT NULL, filename TEXT NOT NULL, storage_path TEXT NOT NULL, mime_type TEXT NOT NULL, uploaded_at TEXT NOT NULL, analysis_status TEXT NOT NULL, insurer_name TEXT, policy_number TEXT, coverage_type TEXT, coverage_limit REAL, effective_date TEXT, expiration_date TEXT, confidence REAL, raw_ai_response TEXT, compliance_status TEXT, gap_analysis TEXT);
`);
try { database.exec('ALTER TABLE vendors ADD COLUMN upload_token TEXT'); } catch { /* existing database already has the column */ }

function json(response, status, body) { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(body)); }
async function requestJson(request) { const chunks = []; for await (const chunk of request) chunks.push(chunk); return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
function getDocument(id) { return database.prepare('SELECT * FROM documents WHERE id = ?').get(id); }
function money(value) { return `$${Number(value || 0).toLocaleString('en-US')}`; }
function compareDocument(document) {
  const requirements = database.prepare('SELECT * FROM requirements WHERE project_id = ?').all(document.project_id);
  const documents = database.prepare('SELECT * FROM documents WHERE vendor_id = ? AND analysis_status = ?').all(document.vendor_id, 'COMPLETE');
  const coverages = documents.flatMap(item => {
    try { return JSON.parse(item.raw_ai_response || '{}').extracted?.coverages?.map(coverage => ({ ...item, coverage_type: coverage.type, coverage_limit: coverage.limit })) || [item]; }
    catch { return [item]; }
  });
  const expiration = new Date(document.expiration_date).getTime();
  const documentStatus = !Number.isFinite(expiration) ? 'Needs Review' : expiration < Date.now() ? 'Non-Compliant' : expiration - Date.now() <= 30 * 86400000 ? 'Expiring Soon' : 'Compliant';
  const results = requirements.map(requirement => {
    const matching = coverages.filter(item => item.coverage_type?.toLowerCase() === requirement.coverage_type.toLowerCase());
    if (!matching.length) return { coverage_type: requirement.coverage_type, status: requirement.required ? 'Missing' : 'Compliant', required_limit: requirement.minimum_limit, detected_limit: null, gap: requirement.required ? 'Required coverage is missing.' : 'Optional coverage not supplied.' };
    const best = matching.sort((a, b) => (b.coverage_limit || 0) - (a.coverage_limit || 0))[0];
    if (requirement.minimum_limit && (!best.coverage_limit || best.coverage_limit < requirement.minimum_limit)) {
      const shortfall = requirement.minimum_limit - (best.coverage_limit || 0);
      return { coverage_type: requirement.coverage_type, status: 'Non-Compliant', required_limit: requirement.minimum_limit, detected_limit: best.coverage_limit, gap: `Required: ${money(requirement.minimum_limit)}. Detected: ${money(best.coverage_limit)}. Shortfall: ${money(shortfall)}.` };
    }
    return { coverage_type: requirement.coverage_type, status: documentStatus, required_limit: requirement.minimum_limit, detected_limit: best.coverage_limit, gap: documentStatus === 'Expiring Soon' ? 'Policy expires within 30 days.' : documentStatus === 'Non-Compliant' ? 'Policy has expired.' : 'Requirement met.' };
  });
  const priority = ['Non-Compliant', 'Missing', 'Needs Review', 'Expiring Soon', 'Compliant'];
  const status = results.map(result => result.status).sort((a, b) => priority.indexOf(a) - priority.indexOf(b))[0] || 'Needs Review';
  const own = results.find(result => result.coverage_type.toLowerCase() === document.coverage_type?.toLowerCase());
  database.prepare('UPDATE documents SET compliance_status = ?, gap_analysis = ? WHERE id = ?').run(own?.status || documentStatus, own?.gap || 'No matching project requirement found.', document.id);
  database.prepare('UPDATE vendors SET status = ? WHERE id = ?').run(status, document.vendor_id);
  return { status, requirements: results, document: getDocument(document.id) };
}
function upsertManifest(manifest) {
  if (!manifest?.project?.id || !manifest?.vendor?.id || !manifest?.vendor?.upload_token || !Array.isArray(manifest.requirements)) throw new Error('Upload manifest is incomplete.');
  database.prepare('INSERT INTO projects (id,name) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name').run(manifest.project.id, manifest.project.name || 'Untitled project');
  const existingVendor = database.prepare('SELECT upload_token FROM vendors WHERE id = ?').get(manifest.vendor.id);
  if (existingVendor?.upload_token && existingVendor.upload_token !== manifest.vendor.upload_token) throw Object.assign(new Error('Invalid upload link.'), { status: 403 });
  database.prepare('INSERT INTO vendors (id,project_id,name,email,status,upload_token) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET project_id=excluded.project_id,name=excluded.name,email=excluded.email').run(manifest.vendor.id, manifest.project.id, manifest.vendor.name || 'Vendor', manifest.vendor.email || '', 'Missing', manifest.vendor.upload_token);
  const remove = database.prepare('DELETE FROM requirements WHERE project_id = ?'); remove.run(manifest.project.id);
  const insert = database.prepare('INSERT INTO requirements (id,project_id,coverage_type,minimum_limit,required) VALUES (?,?,?,?,?)');
  manifest.requirements.forEach(requirement => insert.run(requirement.id || randomUUID(), manifest.project.id, requirement.coverage_type, requirement.minimum_limit || null, requirement.required ? 1 : 0));
}
async function extractWithOpenAI(document) {
  if (!process.env.OPENAI_API_KEY) throw Object.assign(new Error('OPENAI_API_KEY is not configured on the server.'), { status: 503 });
  const bytes = await readFile(document.storage_path);
  const base64 = bytes.toString('base64');
  const isImage = document.mime_type.startsWith('image/');
  const payload = { model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', input: [{ role: 'user', content: [
    { type: 'input_text', text: 'Extract insurance certificate data. Return JSON only matching the schema. Never infer unavailable values. Normalize coverage limits to numbers and dates to YYYY-MM-DD.' },
    isImage ? { type: 'input_image', image_url: `data:${document.mime_type};base64,${base64}` } : { type: 'input_file', filename: document.filename, file_data: `data:${document.mime_type};base64,${base64}` }
  ] }], text: { format: { type: 'json_schema', name: 'insurance_certificate', strict: true, schema: { type: 'object', properties: { insurer: { type: ['string', 'null'] }, policy_number: { type: ['string', 'null'] }, coverages: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, limit: { type: ['number', 'null'] } }, required: ['type', 'limit'], additionalProperties: false } }, effective_date: { type: ['string', 'null'] }, expiration_date: { type: ['string', 'null'] }, confidence: { type: 'number' } }, required: ['insurer', 'policy_number', 'coverages', 'effective_date', 'expiration_date', 'confidence'], additionalProperties: false } } } };
  const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) throw Object.assign(new Error(`AI extraction failed: ${await response.text()}`), { status: 502 });
  const raw = await response.json(); const output = raw.output_text;
  if (!output) throw Object.assign(new Error('AI response did not include structured output.'), { status: 502 });
  return { extracted: JSON.parse(output), raw };
}
async function handler(request, response) {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (request.method === 'POST' && url.pathname === '/api/upload') {
      const webRequest = new Request(url, { method: 'POST', headers: request.headers, body: Readable.toWeb(request), duplex: 'half' });
      const form = await webRequest.formData(); const file = form.get('file'); const manifest = JSON.parse(String(form.get('manifest') || '{}'));
      if (!(file instanceof File)) return json(response, 400, { error: 'A document file is required.' });
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || file.size > 10 * 1024 * 1024) return json(response, 400, { error: 'Only PDF, JPG, and PNG files up to 10 MB are accepted.' });
      upsertManifest(manifest); const id = randomUUID(); const path = join(uploadDir, `${id}${extname(file.name)}`); await writeFile(path, Buffer.from(await file.arrayBuffer()));
      database.prepare('INSERT INTO documents (id,vendor_id,project_id,filename,storage_path,mime_type,uploaded_at,analysis_status) VALUES (?,?,?,?,?,?,?,?)').run(id, manifest.vendor.id, manifest.project.id, file.name, path, file.type, new Date().toISOString(), 'UPLOADED');
      return json(response, 201, { id, analysis_status: 'UPLOADED' });
    }
    if (request.method === 'POST' && url.pathname === '/api/analyze-document') {
      const body = await requestJson(request); const document = getDocument(body.id); if (!document) return json(response, 404, { error: 'Document not found.' });
      try { const { extracted, raw } = await extractWithOpenAI(document); const primary = extracted.coverages?.[0]; if (!primary?.type) throw new Error('AI could not identify a coverage type.'); database.prepare('UPDATE documents SET analysis_status=?, insurer_name=?, policy_number=?, coverage_type=?, coverage_limit=?, effective_date=?, expiration_date=?, confidence=?, raw_ai_response=? WHERE id=?').run('COMPLETE', extracted.insurer, extracted.policy_number, primary.type, primary.limit, extracted.effective_date, extracted.expiration_date, extracted.confidence, JSON.stringify({ extracted, raw }), document.id); return json(response, 200, { extracted, compliance: compareDocument(getDocument(document.id)) }); } catch (error) { database.prepare('UPDATE documents SET analysis_status=? WHERE id=?').run('FAILED', document.id); throw error; }
    }
    const documentMatch = url.pathname.match(/^\/api\/documents\/([^/]+)$/); if (request.method === 'GET' && documentMatch) { const document = getDocument(documentMatch[1]); return document ? json(response, 200, document) : json(response, 404, { error: 'Document not found.' }); }
    const vendorMatch = url.pathname.match(/^\/api\/vendors\/([^/]+)\/compliance$/); if (request.method === 'GET' && vendorMatch) { const vendor = database.prepare('SELECT * FROM vendors WHERE id=?').get(vendorMatch[1]); return vendor ? json(response, 200, { vendor, documents: database.prepare('SELECT * FROM documents WHERE vendor_id=?').all(vendor.id) }) : json(response, 404, { error: 'Vendor not found.' }); }
    const projectMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/compliance$/); if (request.method === 'GET' && projectMatch) { const vendors = database.prepare('SELECT * FROM vendors WHERE project_id=?').all(projectMatch[1]); return json(response, 200, { vendors, total: vendors.length, compliant: vendors.filter(v => v.status === 'Compliant').length }); }
    return json(response, 404, { error: 'Not found.' });
  } catch (error) { return json(response, error.status || 500, { error: error.message || 'Server error.' }); }
}
createServer(handler).listen(Number(process.env.PORT || 8787), () => console.log('CoverageIQ API listening on port 8787'));
