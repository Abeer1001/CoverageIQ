export type Status = 'Compliant' | 'Needs Review' | 'Non-Compliant' | 'Expiring Soon' | 'Missing';

export interface User {
  id: string;
  email: string;
  name: string;
  companyId: string;
  passwordHash?: string;
}

export interface Company {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  companyId: string;
  status: string;
  description?: string;
  created_at?: string;
}

export interface CoverageRequirement {
  id: string;
  projectId: string;
  coverage_type: string;
  minimum_limit?: number;
  required: boolean;
}

export interface Vendor {
  id: string;
  name: string;
  projectId: string;
  upload_token: string;
  overall_status: Status;
  email: string;
  contact_name: string;
}

export interface Document {
  id: string;
  vendorId: string;
  projectId: string;
  upload_date: string;
  insurer_name: string;
  policy_number: string;
  coverage_type: string;
  coverage_limit?: number;
  effective_date: string;
  expiration_date: string;
  compliance_status: Status;
  gap_analysis: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  extraction_notes?: string;
  confidence?: number;
}

export interface ActivityLog {
  id: string;
  projectId: string;
  vendorId?: string;
  description: string;
  date: string;
}

export interface Reminder {
  id: string;
  documentId: string;
  vendorId: string;
  reminder_type: 'expired' | '30_days' | '14_days' | '3_days';
  sent_at: string;
}

// Database helper
class LocalDB {
  private get<T>(key: string): T[] {
    const data = localStorage.getItem(`coverageiq_${key}`);
    return data ? JSON.parse(data) : [];
  }
  private set<T>(key: string, data: T[]) {
    localStorage.setItem(`coverageiq_${key}`, JSON.stringify(data));
  }

  // Collections
  get users(): User[] { return this.get<User>('users'); }
  set users(v: User[]) { this.set('users', v); }

  get companies(): Company[] { return this.get<Company>('companies'); }
  set companies(v: Company[]) { this.set('companies', v); }

  get projects(): Project[] { return this.get<Project>('projects'); }
  set projects(v: Project[]) { this.set('projects', v); }

  get requirements(): CoverageRequirement[] { return this.get<CoverageRequirement>('requirements'); }
  set requirements(v: CoverageRequirement[]) { this.set('requirements', v); }

  get vendors(): Vendor[] { return this.get<Vendor>('vendors'); }
  set vendors(v: Vendor[]) { this.set('vendors', v); }

  get documents(): Document[] { return this.get<Document>('documents'); }
  set documents(v: Document[]) { this.set('documents', v); }

  get activity(): ActivityLog[] { return this.get<ActivityLog>('activity'); }
  set activity(v: ActivityLog[]) { this.set('activity', v); }

  get reminders(): Reminder[] { return this.get<Reminder>('reminders'); }
  set reminders(v: Reminder[]) { this.set('reminders', v); }

  logActivity(projectId: string, description: string, vendorId?: string) {
    this.activity = [...this.activity, {
      id: crypto.randomUUID(),
      projectId,
      vendorId,
      description,
      date: new Date().toISOString()
    }];
  }

  evaluateDocument(document: Document): Document {
    const requirement = this.requirements.find(r => r.projectId === document.projectId && r.coverage_type.toLowerCase() === document.coverage_type.toLowerCase());
    const notes: string[] = [];
    let status: Status = 'Compliant';
    if (!requirement) {
      status = 'Needs Review';
      notes.push('This coverage type is not listed in the project requirements.');
    } else if (requirement.minimum_limit && (!document.coverage_limit || document.coverage_limit < requirement.minimum_limit)) {
      status = 'Non-Compliant';
      notes.push(`Required limit: $${requirement.minimum_limit.toLocaleString()}; detected limit: ${document.coverage_limit ? `$${document.coverage_limit.toLocaleString()}` : 'not provided'}.`);
    }
    const expiration = new Date(document.expiration_date).getTime();
    if (!Number.isFinite(expiration)) {
      status = 'Needs Review';
      notes.push('Expiration date needs review.');
    } else {
      const daysUntilExpiration = Math.ceil((expiration - Date.now()) / 86400000);
      if (daysUntilExpiration < 0) {
        status = 'Non-Compliant';
        notes.push('Policy has expired.');
      } else if (daysUntilExpiration <= 30 && status === 'Compliant') {
        status = 'Expiring Soon';
        notes.push(`Policy expires in ${daysUntilExpiration} day${daysUntilExpiration === 1 ? '' : 's'}.`);
      }
    }
    if (!document.insurer_name || !document.policy_number || !document.effective_date) {
      if (status === 'Compliant') status = 'Needs Review';
      notes.push('One or more certificate fields are incomplete.');
    }
    if (!notes.length) notes.push('Document meets the matching project requirement.');
    return { ...document, compliance_status: status, gap_analysis: notes.join(' ') };
  }

  // Core Business Logic
  calculateVendorStatus(vendorId: string): Status {
    const vendor = this.vendors.find(v => v.id === vendorId);
    if (!vendor) return 'Missing';
    
    const docs = this.documents.filter(d => d.vendorId === vendorId);
    const reqs = this.requirements.filter(r => r.projectId === vendor.projectId);

    if (docs.length === 0) return 'Missing';

    let missingRequired = false;
    reqs.forEach(req => {
      const hasCoverage = docs.some(d => d.coverage_type === req.coverage_type);
      if (!hasCoverage && req.required) {
        missingRequired = true;
      }
    });

    if (missingRequired) return 'Missing';
    if (docs.some(d => this.evaluateDocument(d).compliance_status === 'Non-Compliant')) return 'Non-Compliant';
    if (docs.some(d => this.evaluateDocument(d).compliance_status === 'Needs Review')) return 'Needs Review';
    if (docs.some(d => this.evaluateDocument(d).compliance_status === 'Expiring Soon')) return 'Expiring Soon';

    return 'Compliant';
  }

  recalculateVendorStatuses(projectId?: string) {
    let currentVendors = this.vendors;
    let updated = false;
    currentVendors = currentVendors.map(v => {
      if (projectId && v.projectId !== projectId) return v;
      const newStatus = this.calculateVendorStatus(v.id);
      if (v.overall_status !== newStatus) {
        updated = true;
        return { ...v, overall_status: newStatus };
      }
      return v;
    });
    if (updated) {
      this.vendors = currentVendors;
    }
  }

  reanalyzeProject(projectId: string) {
    this.documents = this.documents.map(document => document.projectId === projectId ? this.evaluateDocument(document) : document);
    this.recalculateVendorStatuses(projectId);
    this.createExpirationReminders(projectId);
  }

  createExpirationReminders(projectId?: string) {
    const current = this.reminders;
    const additions: Reminder[] = [];
    this.documents.filter(document => !projectId || document.projectId === projectId).forEach(document => {
      const days = Math.ceil((new Date(document.expiration_date).getTime() - Date.now()) / 86400000);
      const reminderType = days < 0 ? 'expired' : days <= 3 ? '3_days' : days <= 14 ? '14_days' : days <= 30 ? '30_days' : null;
      if (reminderType && !current.some(reminder => reminder.documentId === document.id && reminder.reminder_type === reminderType)) {
        additions.push({ id: crypto.randomUUID(), documentId: document.id, vendorId: document.vendorId, reminder_type: reminderType, sent_at: new Date().toISOString() });
        this.logActivity(document.projectId, `Expiration reminder created (${reminderType.replace('_', ' ')})`, document.vendorId);
      }
    });
    if (additions.length) this.reminders = [...current, ...additions];
  }
}

export const db = new LocalDB();

// Seed Demo Data if empty
export function seedDatabase() {
  if (db.companies.length > 0) {
    // Upgrade demo workspaces created before password authentication was added.
    db.users = db.users.map(user => user.email === 'admin@example.com' && !user.passwordHash
      ? { ...user, passwordHash: '51459c23ca91ebce271449dd8b5c26751c99039c2ae4c628067898ca0e104039' }
      : user);
    return;
  }

  const cId = crypto.randomUUID();
  const pId = crypto.randomUUID();
  const uId = crypto.randomUUID();

  db.companies = [{ id: cId, name: 'Demo General Contractors' }];
  db.users = [{ id: uId, name: 'Admin User', email: 'admin@example.com', companyId: cId, passwordHash: '51459c23ca91ebce271449dd8b5c26751c99039c2ae4c628067898ca0e104039' }];
  db.projects = [{ id: pId, name: 'Downtown Office Renovation', companyId: cId, status: 'Active' }];
  
  db.requirements = [
    { id: crypto.randomUUID(), projectId: pId, coverage_type: 'General Liability', minimum_limit: 1000000, required: true },
    { id: crypto.randomUUID(), projectId: pId, coverage_type: 'Auto Liability', minimum_limit: 1000000, required: true },
    { id: crypto.randomUUID(), projectId: pId, coverage_type: 'Workers Compensation', required: true },
    { id: crypto.randomUUID(), projectId: pId, coverage_type: 'Umbrella', minimum_limit: 2000000, required: true },
  ];

  const v1 = crypto.randomUUID();
  const v2 = crypto.randomUUID();
  const v3 = crypto.randomUUID();
  const v4 = crypto.randomUUID();
  const v5 = crypto.randomUUID();

  db.vendors = [
    { id: v1, name: 'XYZ Plumbing', contact_name: 'John Smith', email: 'john@xyz.com', projectId: pId, upload_token: crypto.randomUUID(), overall_status: 'Compliant' },
    { id: v2, name: 'ABC Electrical LLC', contact_name: 'Jane Doe', email: 'jane@abc.com', projectId: pId, upload_token: crypto.randomUUID(), overall_status: 'Non-Compliant' },
    { id: v3, name: 'Smith HVAC', contact_name: 'Bob Smith', email: 'bob@smith.com', projectId: pId, upload_token: crypto.randomUUID(), overall_status: 'Non-Compliant' },
    { id: v4, name: 'City Glass', contact_name: 'Alice Glass', email: 'alice@city.com', projectId: pId, upload_token: crypto.randomUUID(), overall_status: 'Expiring Soon' },
    { id: v5, name: 'Fast Framing', contact_name: 'Tom Frame', email: 'tom@fast.com', projectId: pId, upload_token: crypto.randomUUID(), overall_status: 'Missing' },
  ];

  const now = new Date();
  const nextYear = new Date(now); nextYear.setFullYear(now.getFullYear() + 1);
  const nextMonth = new Date(now); nextMonth.setDate(now.getDate() + 14);

  db.documents = [
    // Vendor 1: Fully Compliant
    { id: crypto.randomUUID(), vendorId: v1, projectId: pId, upload_date: now.toISOString(), insurer_name: 'SafeCo', policy_number: 'POL-101', coverage_type: 'General Liability', coverage_limit: 1000000, effective_date: now.toISOString(), expiration_date: nextYear.toISOString(), compliance_status: 'Compliant', gap_analysis: 'Requirements met.' },
    { id: crypto.randomUUID(), vendorId: v1, projectId: pId, upload_date: now.toISOString(), insurer_name: 'SafeCo', policy_number: 'POL-102', coverage_type: 'Auto Liability', coverage_limit: 1000000, effective_date: now.toISOString(), expiration_date: nextYear.toISOString(), compliance_status: 'Compliant', gap_analysis: 'Requirements met.' },
    { id: crypto.randomUUID(), vendorId: v1, projectId: pId, upload_date: now.toISOString(), insurer_name: 'SafeCo', policy_number: 'POL-103', coverage_type: 'Workers Compensation', effective_date: now.toISOString(), expiration_date: nextYear.toISOString(), compliance_status: 'Compliant', gap_analysis: 'Requirements met.' },
    { id: crypto.randomUUID(), vendorId: v1, projectId: pId, upload_date: now.toISOString(), insurer_name: 'SafeCo', policy_number: 'POL-104', coverage_type: 'Umbrella', coverage_limit: 2000000, effective_date: now.toISOString(), expiration_date: nextYear.toISOString(), compliance_status: 'Compliant', gap_analysis: 'Requirements met.' },

    // Vendor 2: Insufficient limit (GL $500k)
    { id: crypto.randomUUID(), vendorId: v2, projectId: pId, upload_date: now.toISOString(), insurer_name: 'BuildInsure', policy_number: 'ABC-500', coverage_type: 'General Liability', coverage_limit: 500000, effective_date: now.toISOString(), expiration_date: nextYear.toISOString(), compliance_status: 'Non-Compliant', gap_analysis: 'Required: $1,000,000. Detected: $500,000. SHORTFALL: $500,000' },
    
    // Vendor 3: Missing Umbrella coverage
    { id: crypto.randomUUID(), vendorId: v3, projectId: pId, upload_date: now.toISOString(), insurer_name: 'HVAC Guard', policy_number: 'HV-001', coverage_type: 'General Liability', coverage_limit: 1000000, effective_date: now.toISOString(), expiration_date: nextYear.toISOString(), compliance_status: 'Compliant', gap_analysis: 'Requirements met.' },
    // missing auto, workers comp, umbrella -> Non-Compliant

    // Vendor 4: Expiring soon (14 days)
    { id: crypto.randomUUID(), vendorId: v4, projectId: pId, upload_date: now.toISOString(), insurer_name: 'GlassSure', policy_number: 'GLS-999', coverage_type: 'General Liability', coverage_limit: 1000000, effective_date: now.toISOString(), expiration_date: nextMonth.toISOString(), compliance_status: 'Expiring Soon', gap_analysis: 'Expires within 30 days.' },
  ];

  db.reanalyzeProject(pId);
  db.logActivity(pId, 'Demo workspace initialized');
}
