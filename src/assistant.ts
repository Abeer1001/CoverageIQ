import { db } from './db';

function companyScope(companyId: string) {
  const projectIds = new Set(db.projects.filter(p => p.companyId === companyId).map(p => p.id));
  return {
    projects: db.projects.filter(p => projectIds.has(p.id)),
    vendors: db.vendors.filter(v => projectIds.has(v.projectId)),
    documents: db.documents.filter(d => projectIds.has(d.projectId)),
    requirements: db.requirements.filter(r => projectIds.has(r.projectId)),
  };
}

function buildWorkspaceContext(companyId: string): string {
  const { projects, vendors, documents, requirements } = companyScope(companyId);
  const company = db.companies.find(c => c.id === companyId);
  const lines: string[] = [];
  lines.push(`Company: ${company?.name || 'Unknown'}`);
  lines.push(`Projects (${projects.length}): ${projects.map(p => p.name).join(', ') || 'none'}`);
  lines.push(`Vendors (${vendors.length}):`);
  vendors.forEach(v => {
    const project = projects.find(p => p.id === v.projectId);
    const vdocs = documents.filter(d => d.vendorId === v.id);
    lines.push(`- ${v.name} (${v.overall_status}, project: ${project?.name || 'unknown'}, ${vdocs.length} document${vdocs.length === 1 ? '' : 's'})`);
    vdocs.forEach(d => {
      lines.push(`  - ${d.coverage_type || 'Insurance document'}${d.coverage_limit ? ` $${d.coverage_limit.toLocaleString()}` : ' no limit'} exp ${d.expiration_date ? new Date(d.expiration_date).toLocaleDateString() : 'n/a'} (${d.compliance_status})`);
    });
  });
  lines.push(`Requirements (${requirements.length}):`);
  requirements.forEach(r => {
    lines.push(`- ${r.coverage_type}${r.minimum_limit ? ` min $${r.minimum_limit.toLocaleString()}` : ''} ${r.required ? '(required)' : '(optional)'}`);
  });
  return lines.join('\n');
}

export async function askAssistant(message: string, companyId: string): Promise<string> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context: buildWorkspaceContext(companyId) }),
    });
    const data = await response.json();
    if (response.ok && typeof data.reply === 'string' && data.reply.trim()) {
      return data.reply.trim();
    }
    throw new Error(data.error || 'Assistant unavailable.');
  } catch {
    return getAssistantReply(message, companyId);
  }
}

export function getAssistantReply(raw: string, companyId: string): string {
  const q = raw.toLowerCase().replace(/[?.,!]/g, ' ').replace(/\s+/g, ' ').trim();
  const { projects, vendors, documents } = companyScope(companyId);

  const byStatus = (s: string) => vendors.filter(v => v.overall_status === s);
  const compliant = byStatus('Compliant');
  const nonCompliant = byStatus('Non-Compliant');
  const expiring = byStatus('Expiring Soon');
  const missing = byStatus('Missing');
  const needsReview = byStatus('Needs Review');

  const has = (...words: string[]) => words.some(w => q.includes(w));
  const listNames = (arr: { name: string }[], limit = 6) => {
    if (!arr.length) return '';
    const head = arr.slice(0, limit).map(v => `• ${v.name}`).join('\n');
    return arr.length > limit ? `${head}\n…and ${arr.length - limit} more` : head;
  };

  if (!q || has('hi', 'hello', 'hey')) {
    return 'Hi there! I can help you understand your vendor insurance compliance.\n\nTry asking me things like:\n• "Compliance summary"\n• "Who is non-compliant?"\n• "What\'s expiring soon?"\n• "How do I add a vendor?"';
  }

  if (has('what can you do', 'who are you', 'help me', 'how does this work', 'how do i use')) {
    return 'I\'m the CoverageIQ assistant. I can answer questions about your workspace and how to use CoverageIQ.\n\nYou can ask me things like:\n• "Compliance summary"\n• "Who is non-compliant?"\n• "What\'s expiring soon?"\n• "Which vendors are missing documents?"\n• "How do I add a project?"';
  }

  const mentionedVendor = vendors.find(v => q.includes(v.name.toLowerCase()));
  if (mentionedVendor) {
    const docs = documents.filter(d => d.vendorId === mentionedVendor.id);
    const project = projects.find(p => p.id === mentionedVendor.projectId);
    const docSummary = docs.length
      ? docs.map(d => `• ${d.coverage_type || 'Insurance document'}${d.coverage_limit ? ` — $${d.coverage_limit.toLocaleString()}` : ''} (${d.compliance_status})`).join('\n')
      : 'No documents on file.';
    return `${mentionedVendor.name} is currently ${mentionedVendor.overall_status}.\nProject: ${project?.name || 'Unknown'}\n\nDocuments:\n${docSummary}`;
  }

  const mentionedProject = projects.find(p => q.includes(p.name.toLowerCase()));
  if (mentionedProject) {
    const pVendors = vendors.filter(v => v.projectId === mentionedProject.id);
    const pCompliant = pVendors.filter(v => v.overall_status === 'Compliant').length;
    return `${mentionedProject.name} has ${pVendors.length} vendor${pVendors.length === 1 ? '' : 's'} (${pCompliant} compliant).\n\n${listNames(pVendors) || 'No vendors added yet.'}`;
  }

  if (has('compliance', 'summary', 'overview', 'health', 'how are we', 'status of', 'how compliant', 'standing')) {
    const total = vendors.length;
    if (total === 0) return 'You don\'t have any vendors yet. Add your first vendor to start tracking compliance.';
    const pct = Math.round((compliant.length / total) * 100);
    return `Here\'s your compliance summary:\n\n• Total vendors: ${total}\n• Compliant: ${compliant.length}\n• Non-compliant: ${nonCompliant.length}\n• Expiring soon: ${expiring.length}\n• Missing documents: ${missing.length}\n• Needs review: ${needsReview.length}\n\nOverall compliance: ${pct}%.`;
  }

  if (has('non-compliant', 'noncompliant', 'not compliant', 'out of compliance', 'gap', 'below', 'shortfall')) {
    if (!nonCompliant.length) return 'Good news — no vendors are currently flagged as non-compliant.';
    return `These vendors have compliance gaps:\n\n${listNames(nonCompliant)}`;
  }

  if (has('expiring', 'expire', 'expires', 'expiration', 'renewal', 'renew', 'upcoming')) {
    if (!expiring.length) return 'No policies are expiring within the next 30 days.';
    return `These vendors have policies expiring soon:\n\n${listNames(expiring)}`;
  }

  if (has('missing', 'no document', 'no certificate', 'not submitted', 'haven\'t submitted')) {
    if (!missing.length) return 'Every vendor has at least one document on file.';
    return `These vendors are missing required documents:\n\n${listNames(missing)}`;
  }

  if (has('needs review', 'review', 'unclear', 'uncertain', 'low confidence')) {
    if (!needsReview.length) return 'No documents currently need review.';
    return `These vendors need document review:\n\n${listNames(needsReview)}`;
  }

  if (has('how many', 'count', 'number of')) {
    if (has('vendor')) return `You have ${vendors.length} vendor${vendors.length === 1 ? '' : 's'} across ${projects.length} project${projects.length === 1 ? '' : 's'}.`;
    if (has('project')) return `You have ${projects.length} active project${projects.length === 1 ? '' : 's'}.`;
    if (has('document')) return `You have ${documents.length} document${documents.length === 1 ? '' : 's'} on file.`;
    return `You have ${projects.length} project${projects.length === 1 ? '' : 's'}, ${vendors.length} vendor${vendors.length === 1 ? '' : 's'}, and ${documents.length} document${documents.length === 1 ? '' : 's'}.`;
  }

  if (has('add vendor', 'create vendor', 'new vendor', 'invite vendor', 'add a vendor')) {
    return 'To add a vendor:\n1. Go to Vendors.\n2. Click "Add Vendor".\n3. Enter the company name, contact, and email.\n\nEach vendor gets a secure upload link you can copy or email so they can submit certificates without an account.';
  }

  if (has('add project', 'create project', 'new project', 'add a project')) {
    return 'To add a project:\n1. Go to Projects.\n2. Click "New Project".\n3. Give it a name and description.\n\nThen set its insurance requirements so coverage can be compared against them.';
  }

  if (has('requirement', 'coverage type', 'minimum limit', 'set coverage', 'required coverage')) {
    return 'Insurance requirements are set per project. Open a project and use "Manage Requirements" to add coverage types, minimum limits, and mark them as required or optional.\n\nCoverageIQ compares uploaded documents against these requirements to determine compliance.';
  }

  if (has('upload link', 'share link', 'invite', 'send link', 'submit document', 'vendors upload')) {
    return 'To request documents from a vendor:\n1. Open a vendor and click "Copy Upload Link", or\n2. Click "Request Updated Certificate" to email them directly.\n\nVendors use the link to upload their PDF, JPG, or PNG certificate without needing an account.';
  }

  if (has('alert', 'notify', 'notification')) {
    return 'Alerts surface coverage gaps, missing documents, and upcoming expirations. Open the Alerts page to review them, then request an updated certificate from the relevant vendor.';
  }

  if (has('document', 'upload', 'certificate', 'analyze')) {
    return 'Vendors upload certificates through their secure link. CoverageIQ analyzes the document to extract coverage types, limits, and policy dates, then compares them against your project requirements.\n\nYou can review all documents and their status on the Documents page.';
  }

  return 'I\'m not sure I understand that one. You can ask me about your compliance status, specific vendors, or how to use CoverageIQ.\n\nTry:\n• "Compliance summary"\n• "Who is non-compliant?"\n• "What\'s expiring soon?"\n• "How do I add a vendor?"';
}
