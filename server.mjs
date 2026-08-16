import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { getDocument as getPdfDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import tesseract from 'tesseract.js';
const { createWorker } = tesseract;

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
  CREATE TABLE IF NOT EXISTS workspaces (company_id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL);
`);
try { database.exec('ALTER TABLE vendors ADD COLUMN upload_token TEXT'); } catch { /* existing database already has the column */ }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
function json(response, status, body) { response.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders }); response.end(JSON.stringify(body)); }
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
function loadWorkspace(companyId) {
  const row = database.prepare('SELECT data FROM workspaces WHERE company_id = ?').get(companyId);
  return row ? JSON.parse(row.data) : null;
}
function saveWorkspace(companyId, data) {
  database.prepare('INSERT INTO workspaces (company_id, data, updated_at) VALUES (?,?,?) ON CONFLICT(company_id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at').run(companyId, JSON.stringify(data), new Date().toISOString());
}
function evaluateWorkspaceDoc(doc, requirements) {
  const requirement = requirements.find(r => r.projectId === doc.projectId && String(r.coverage_type).toLowerCase() === String(doc.coverage_type).toLowerCase());
  const notes = [];
  let status = 'Compliant';
  if (!requirement) {
    status = 'Needs Review';
    notes.push('This coverage type is not listed in the project requirements.');
  } else if (requirement.minimum_limit && (!doc.coverage_limit || doc.coverage_limit < requirement.minimum_limit)) {
    status = 'Non-Compliant';
    notes.push(`Required limit: ${money(requirement.minimum_limit)}; detected limit: ${doc.coverage_limit ? money(doc.coverage_limit) : 'not provided'}.`);
  }
  const expiration = new Date(doc.expiration_date).getTime();
  if (!Number.isFinite(expiration)) {
    status = 'Needs Review';
    notes.push('Expiration date needs review.');
  } else {
    const days = Math.ceil((expiration - Date.now()) / 86400000);
    if (days < 0) { status = 'Non-Compliant'; notes.push('Policy has expired.'); }
    else if (days <= 30 && status === 'Compliant') { status = 'Expiring Soon'; notes.push(`Policy expires in ${days} day${days === 1 ? '' : 's'}.`); }
  }
  if (!doc.insurer_name || !doc.policy_number || !doc.effective_date) {
    if (status === 'Compliant') status = 'Needs Review';
    notes.push('One or more certificate fields are incomplete.');
  }
  if (!notes.length) notes.push('Document meets the matching project requirement.');
  return { ...doc, compliance_status: status, gap_analysis: notes.join(' ') };
}
function recalcWorkspaceVendor(data, vendorId) {
  const vendor = data.vendors.find(v => v.id === vendorId);
  if (!vendor) return 'Missing';
  const docs = data.documents.filter(d => d.vendorId === vendorId);
  const reqs = data.requirements.filter(r => r.projectId === vendor.projectId);
  if (docs.length === 0) return 'Missing';
  let missingRequired = false;
  reqs.forEach(req => {
    if (!docs.some(d => String(d.coverage_type) === String(req.coverage_type)) && req.required) missingRequired = true;
  });
  if (missingRequired) return 'Missing';
  if (docs.some(d => evaluateWorkspaceDoc(d, reqs).compliance_status === 'Non-Compliant')) return 'Non-Compliant';
  if (docs.some(d => evaluateWorkspaceDoc(d, reqs).compliance_status === 'Needs Review')) return 'Needs Review';
  if (docs.some(d => evaluateWorkspaceDoc(d, reqs).compliance_status === 'Expiring Soon')) return 'Expiring Soon';
  return 'Compliant';
}
function normalizeDate(value) {
  if (!value) return null;
  const match = String(value).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const slash = String(value).match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slash) {
    let year = Number(slash[3]); if (year < 100) year += 2000;
    return `${year}-${String(slash[1]).padStart(2, '0')}-${String(slash[2]).padStart(2, '0')}`;
  }
  return null;
}
function normalizeExtracted(data) {
  const coverages = Array.isArray(data?.coverages)
    ? data.coverages
        .map(c => ({ type: (c?.type || c?.coverage_type || '').toString().trim(), limit: typeof c?.limit === 'number' ? c.limit : (typeof c?.coverage_limit === 'number' ? c.coverage_limit : null) }))
        .filter(c => c.type)
    : [];
  return {
    insurer: data?.insurer || data?.insurer_name || null,
    policy_number: data?.policy_number || data?.policyNumber || null,
    coverages,
    effective_date: normalizeDate(data?.effective_date || data?.effectiveDate),
    expiration_date: normalizeDate(data?.expiration_date || data?.expirationDate),
    confidence: typeof data?.confidence === 'number' ? data.confidence : (coverages.length ? 0.6 : 0.3),
  };
}
async function extractPdfText(document) {
  const bytes = await readFile(document.storage_path);
  const pdf = await getPdfDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  return text.trim();
}
async function extractImageText(document) {
  const bytes = await readFile(document.storage_path);
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(bytes);
    return (data.text || '').trim();
  } finally {
    await worker.terminate();
  }
}
async function extractWithDeepSeek(text) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY is not configured on the server.');
  const prompt = `You extract structured data from insurance certificate text. Return a single JSON object (valid JSON, do not wrap in markdown) with this exact shape:
{
  "insurer": "string or null",
  "policy_number": "string or null",
  "coverages": [{"type": "string", "limit": number or null}],
  "effective_date": "YYYY-MM-DD or null",
  "expiration_date": "YYYY-MM-DD or null",
  "confidence": 0.0
}
Normalize coverage limits to plain numbers (no commas or dollar signs). Normalize dates to YYYY-MM-DD. Never invent values that are not present in the text. If a coverage is marked "Statutory", set limit to null.

Certificate text:
${text.slice(0, 16000)}`;
  const response = await fetch('https://api.deepseek.com/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.DEEPSEEK_MODEL || 'deepseek-chat', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, max_tokens: 2000, temperature: 0 }) });
  if (!response.ok) throw Object.assign(new Error(`DeepSeek extraction failed: ${await response.text()}`), { status: 502 });
  const raw = await response.json();
  const content = raw.choices?.[0]?.message?.content;
  if (!content) throw Object.assign(new Error('DeepSeek did not return a response.'), { status: 502 });
  let parsed;
  try { parsed = JSON.parse(content); }
  catch { const match = content.match(/\{[\s\S]*\}/); parsed = match ? JSON.parse(match[0]) : null; }
  if (!parsed) throw Object.assign(new Error('DeepSeek did not return valid JSON.'), { status: 502 });
  return { extracted: normalizeExtracted(parsed), raw };
}
const COVERAGE_NAMES = ['General Liability', 'Auto Liability', 'Workers Compensation', 'Excess Liability', 'Umbrella Liability', 'Professional Liability', 'Employers Liability'];
function extractLocally(text) {
  const insurer = (text.match(/insurer\s*:?\s*(.+?)(?=\s*(?:policy\s*(?:number|#|no\.?)|named\s+insured|effective\s+date|expiration\s+date|general\s+liability|auto(?:mobile)?\s+liability|workers'?\s+compensation|commercial|umbrella|excess|professional)\b)/i)?.[1] || '').trim() || null;
  const policyNumber = (text.match(/policy\s*(?:number|#|no\.?)\s*:?\s*([A-Za-z0-9-]+)/i)?.[1] || '').trim() || null;
  const effectiveDate = normalizeDate(text.match(/effective\s*date\s*:?\s*([\d/-]+)/i)?.[1]);
  const expirationDate = normalizeDate(text.match(/expiration\s*date\s*:?\s*([\d/-]+)/i)?.[1]);
  const positions = COVERAGE_NAMES
    .map(name => ({ name, index: text.toLowerCase().indexOf(name.toLowerCase()) }))
    .filter(item => item.index !== -1)
    .sort((a, b) => a.index - b.index);
  const coverages = positions.map((position, i) => {
    const segment = text.slice(position.index, i + 1 < positions.length ? positions[i + 1].index : text.length);
    const statutory = /statutory/i.test(segment);
    let limit = null;
    if (!statutory) {
      const moneyMatch = segment.match(/\$\s?([\d,]+(?:\.\d+)?)/);
      if (moneyMatch) limit = Number(moneyMatch[1].replace(/,/g, ''));
    }
    return { type: position.name, limit };
  });
  return { extracted: { insurer, policy_number: policyNumber, coverages, effective_date: effectiveDate, expiration_date: expirationDate, confidence: coverages.length ? 0.6 : 0.2 }, raw: null };
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
  return { extracted: normalizeExtracted(JSON.parse(output)), raw };
}
async function extractDocument(document) {
  if (document.mime_type === 'application/pdf') {
    const text = await extractPdfText(document);
    if (!text) throw Object.assign(new Error('No readable text could be extracted from this document.'), { status: 422 });
    try { return await extractWithDeepSeek(text); }
    catch { return extractLocally(text); }
  }
  if (document.mime_type.startsWith('image/')) {
    const text = await extractImageText(document);
    if (!text) throw Object.assign(new Error('No readable text could be extracted from this image.'), { status: 422 });
    try { return await extractWithDeepSeek(text); }
    catch { return extractLocally(text); }
  }
  return extractWithOpenAI(document);
}
async function chatWithOpenAI(message, context) {
  if (!process.env.OPENAI_API_KEY) throw Object.assign(new Error('OPENAI_API_KEY is not configured on the server.'), { status: 503 });
  const instructions = `You are the CoverageIQ assistant, a helpful, professional, and concise support assistant for CoverageIQ, an AI-assisted insurance compliance monitoring product for contractors and property managers.

You help users understand their vendor insurance compliance and how to use the product. Answer using the workspace context provided. Be accurate and grounded: only state facts that appear in the context. If the answer is not in the context, say you don't have that information rather than guessing.

Use calm, clear, responsible language. Refer to "AI-assisted analysis" and "identified gaps" rather than guaranteeing compliance. Never claim legal advice, certifications, or guaranteed compliance.

Keep answers short (2-5 sentences unless a short list is genuinely helpful). Use plain text with line breaks for lists. Do not use markdown.`;
  const payload = { model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', instructions, input: [{ role: 'user', content: `Workspace context:\n${context || '(no context provided)'}\n\nUser question:\n${message}` }] };
  const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) throw Object.assign(new Error(`Assistant request failed: ${await response.text()}`), { status: 502 });
  const raw = await response.json();
  const output = raw.output_text;
  if (!output) throw Object.assign(new Error('The assistant did not return a response.'), { status: 502 });
  return output;
}
async function chatWithDeepSeek(message, context) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw Object.assign(new Error('DEEPSEEK_API_KEY is not configured on the server.'), { status: 503 });
  const system = `You are the CoverageIQ assistant, a helpful, professional, and concise support assistant for CoverageIQ, an AI-assisted insurance compliance monitoring product for contractors and property managers.

You help users understand their vendor insurance compliance and how to use the product. Answer using the workspace context provided. Be accurate and grounded: only state facts that appear in the context. If the answer is not in the context, say you don't have that information rather than guessing.

Use calm, clear, responsible language. Refer to "AI-assisted analysis" and "identified gaps" rather than guaranteeing compliance. Never claim legal advice, certifications, or guaranteed compliance.

Keep answers short (2-5 sentences unless a short list is genuinely helpful). Use plain text with line breaks for lists. Do not use markdown.`;
  const response = await fetch('https://api.deepseek.com/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.DEEPSEEK_MODEL || 'deepseek-chat', messages: [{ role: 'system', content: system }, { role: 'user', content: `Workspace context:\n${context || '(no context provided)'}\n\nUser question:\n${message}` }], max_tokens: 700, temperature: 0.3 }) });
  if (!response.ok) throw Object.assign(new Error(`Assistant request failed: ${await response.text()}`), { status: 502 });
  const raw = await response.json();
  const content = raw.choices?.[0]?.message?.content;
  if (!content) throw Object.assign(new Error('The assistant did not return a response.'), { status: 502 });
  return content;
}
async function chatWithAssistant(message, context) {
  if (process.env.DEEPSEEK_API_KEY) {
    try { return await chatWithDeepSeek(message, context); } catch (error) { if (!process.env.OPENAI_API_KEY) throw error; }
  }
  return chatWithOpenAI(message, context);
}

async function handler(request, response) {
  if (request.method === 'OPTIONS') { response.writeHead(204, corsHeaders); response.end(); return; }
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
      try { const { extracted, raw } = await extractDocument(document); const primary = extracted.coverages?.[0]; if (!primary?.type) throw new Error('AI could not identify a coverage type.'); database.prepare('UPDATE documents SET analysis_status=?, insurer_name=?, policy_number=?, coverage_type=?, coverage_limit=?, effective_date=?, expiration_date=?, confidence=?, raw_ai_response=? WHERE id=?').run('COMPLETE', extracted.insurer, extracted.policy_number, primary.type, primary.limit, extracted.effective_date, extracted.expiration_date, extracted.confidence, JSON.stringify({ extracted, raw }), document.id); return json(response, 200, { extracted, compliance: compareDocument(getDocument(document.id)) }); } catch (error) { database.prepare('UPDATE documents SET analysis_status=? WHERE id=?').run('FAILED', document.id); throw error; }
    }
    if (request.method === 'POST' && url.pathname === '/api/chat') {
      const body = await requestJson(request); const message = typeof body.message === 'string' ? body.message.trim() : ''; const context = typeof body.context === 'string' ? body.context : '';
      if (!message) return json(response, 400, { error: 'A message is required.' });
      try { return json(response, 200, { reply: await chatWithAssistant(message, context) }); } catch (error) { return json(response, error.status || 500, { error: error.message || 'Server error.' }); }
    }
    const workspaceMatch = url.pathname.match(/^\/api\/workspace\/([^/]+)$/);
    if (request.method === 'GET' && workspaceMatch) {
      const data = loadWorkspace(workspaceMatch[1]);
      return data ? json(response, 200, { data }) : json(response, 404, { error: 'Workspace not found.' });
    }
    if (request.method === 'POST' && workspaceMatch) {
      const body = await requestJson(request);
      if (!body || typeof body.data !== 'object') return json(response, 400, { error: 'Workspace data is required.' });
      saveWorkspace(workspaceMatch[1], body.data);
      return json(response, 200, { ok: true });
    }
    const uploadTokenMatch = url.pathname.match(/^\/api\/upload\/([^/]+)$/);
    if (request.method === 'GET' && uploadTokenMatch) {
      const token = uploadTokenMatch[1];
      for (const row of database.prepare('SELECT company_id, data FROM workspaces').all()) {
        const data = JSON.parse(row.data);
        const vendor = (data.vendors || []).find(v => v.upload_token === token);
        if (vendor) {
          const project = (data.projects || []).find(p => p.id === vendor.projectId) || null;
          const requirements = (data.requirements || []).filter(r => r.projectId === vendor.projectId);
          return json(response, 200, { companyId: row.company_id, vendor, project, requirements });
        }
      }
      return json(response, 404, { error: 'Invalid or expired upload link.' });
    }
    if (request.method === 'POST' && url.pathname === '/api/ingest') {
      const body = await requestJson(request);
      const token = typeof body.token === 'string' ? body.token : '';
      const documents = Array.isArray(body.documents) ? body.documents : [];
      const activityDesc = typeof body.activity === 'string' ? body.activity : '';
      for (const row of database.prepare('SELECT company_id, data FROM workspaces').all()) {
        const data = JSON.parse(row.data);
        const vendor = (data.vendors || []).find(v => v.upload_token === token);
        if (vendor) {
          const reqs = (data.requirements || []).filter(r => r.projectId === vendor.projectId);
          const evaluated = documents.map(doc => evaluateWorkspaceDoc(doc, reqs));
          const mergedDocs = [...(data.documents || []).filter(d => d.vendorId !== vendor.id), ...evaluated];
          const activityEntry = { id: randomUUID(), projectId: vendor.projectId, vendorId: vendor.id, description: activityDesc || `${vendor.name} submitted documents`, date: new Date().toISOString() };
          const merged = { ...data, documents: mergedDocs, activity: [...(data.activity || []), activityEntry] };
          merged.vendors = (merged.vendors || []).map(v => v.id === vendor.id ? { ...v, overall_status: recalcWorkspaceVendor(merged, vendor.id) } : v);
          saveWorkspace(row.company_id, merged);
          return json(response, 200, { ok: true });
        }
      }
      return json(response, 404, { error: 'Invalid or expired upload link.' });
    }
    const documentMatch = url.pathname.match(/^\/api\/documents\/([^/]+)$/); if (request.method === 'GET' && documentMatch) { const document = getDocument(documentMatch[1]); return document ? json(response, 200, document) : json(response, 404, { error: 'Document not found.' }); }
    const vendorMatch = url.pathname.match(/^\/api\/vendors\/([^/]+)\/compliance$/); if (request.method === 'GET' && vendorMatch) { const vendor = database.prepare('SELECT * FROM vendors WHERE id=?').get(vendorMatch[1]); return vendor ? json(response, 200, { vendor, documents: database.prepare('SELECT * FROM documents WHERE vendor_id=?').all(vendor.id) }) : json(response, 404, { error: 'Vendor not found.' }); }
    const projectMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/compliance$/); if (request.method === 'GET' && projectMatch) { const vendors = database.prepare('SELECT * FROM vendors WHERE project_id=?').all(projectMatch[1]); return json(response, 200, { vendors, total: vendors.length, compliant: vendors.filter(v => v.status === 'Compliant').length }); }
    return json(response, 404, { error: 'Not found.' });
  } catch (error) { return json(response, error.status || 500, { error: error.message || 'Server error.' }); }
}
createServer(handler).listen(Number(process.env.PORT || 8787), () => console.log('CoverageIQ API listening on port 8787'));
