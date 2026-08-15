export type Status = 'Compliant' | 'Needs Review' | 'Non-Compliant' | 'Expiring Soon' | 'Missing';

export interface User {
  id: string;
  email: string;
  name: string;
  companyId: string;
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
}

export interface ActivityLog {
  id: string;
  projectId: string;
  vendorId?: string;
  description: string;
  date: string;
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

  logActivity(projectId: string, description: string, vendorId?: string) {
    this.activity = [...this.activity, {
      id: crypto.randomUUID(),
      projectId,
      vendorId,
      description,
      date: new Date().toISOString()
    }];
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

    if (docs.some(d => d.compliance_status === 'Non-Compliant') || missingRequired) return 'Non-Compliant';
    if (docs.some(d => d.compliance_status === 'Needs Review')) return 'Needs Review';
    if (docs.some(d => d.compliance_status === 'Expiring Soon')) return 'Expiring Soon';

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
}

export const db = new LocalDB();

// Seed Demo Data if empty
export function seedDatabase() {
  if (db.companies.length > 0) return; // Already seeded

  const cId = crypto.randomUUID();
  const pId = crypto.randomUUID();
  const uId = crypto.randomUUID();

  db.companies = [{ id: cId, name: 'Demo General Contractors' }];
  db.users = [{ id: uId, name: 'Admin User', email: 'admin@example.com', companyId: cId }];
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

  db.recalculateVendorStatuses();
  db.logActivity(pId, 'Demo workspace initialized');
}
