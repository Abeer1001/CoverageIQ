import { db } from './db';

export type AlertType = 'coverage_gap' | 'expiring' | 'missing' | 'needs_review';

export interface AlertItem {
  id: string;
  type: AlertType;
  title: string;
  vendorName: string;
  vendorId: string;
  projectId: string;
  description: string;
  coverageType?: string;
  requiredLimit?: number;
  detectedLimit?: number;
}

export interface NotificationItem {
  id: string;
  kind: 'document' | 'analysis' | 'issue' | 'expiration' | 'missing' | 'activity';
  title: string;
  description: string;
  date: string;
}

function companyVendors(companyId: string) {
  const projectIds = new Set(db.projects.filter(p => p.companyId === companyId).map(p => p.id));
  return db.vendors.filter(v => projectIds.has(v.projectId));
}

export function deriveAlerts(companyId: string): AlertItem[] {
  const alerts: AlertItem[] = [];
  const vendors = companyVendors(companyId);

  vendors.forEach(vendor => {
    const docs = db.documents.filter(d => d.vendorId === vendor.id);
    const reqs = db.requirements.filter(r => r.projectId === vendor.projectId);

    if (docs.length === 0) {
      if (reqs.some(r => r.required)) {
        alerts.push({
          id: `missing-${vendor.id}`,
          type: 'missing',
          title: 'Document Required',
          vendorName: vendor.name,
          vendorId: vendor.id,
          projectId: vendor.projectId,
          description: `${vendor.name} has not submitted the required insurance document.`,
        });
      }
      return;
    }

    reqs.filter(r => r.required).forEach(req => {
      const matching = docs.filter(d => d.coverage_type?.toLowerCase() === req.coverage_type.toLowerCase());
      if (matching.length === 0) {
        alerts.push({
          id: `missing-${vendor.id}-${req.id}`,
          type: 'missing',
          title: 'Required Coverage Missing',
          vendorName: vendor.name,
          vendorId: vendor.id,
          projectId: vendor.projectId,
          description: `${req.coverage_type} has not been submitted for ${vendor.name}.`,
        });
        return;
      }
      const best = matching.sort((a, b) => (b.coverage_limit || 0) - (a.coverage_limit || 0))[0];
      if (req.minimum_limit && (!best.coverage_limit || best.coverage_limit < req.minimum_limit)) {
        const detected = best.coverage_limit || 0;
        const shortfall = req.minimum_limit - detected;
        alerts.push({
          id: `gap-${vendor.id}-${req.id}`,
          type: 'coverage_gap',
          title: 'Coverage Gap',
          vendorName: vendor.name,
          vendorId: vendor.id,
          projectId: vendor.projectId,
          coverageType: req.coverage_type,
          requiredLimit: req.minimum_limit,
          detectedLimit: best.coverage_limit || undefined,
          description: `${req.coverage_type} is $${shortfall.toLocaleString()} below the required $${req.minimum_limit.toLocaleString()} for ${vendor.name}.`,
        });
      }
    });

    docs.forEach(doc => {
      const expiration = new Date(doc.expiration_date).getTime();
      if (!Number.isFinite(expiration)) return;
      const days = Math.ceil((expiration - Date.now()) / 86400000);
      if (days < 0) {
        alerts.push({
          id: `expired-${doc.id}`,
          type: 'expiring',
          title: 'Policy Expired',
          vendorName: vendor.name,
          vendorId: vendor.id,
          projectId: vendor.projectId,
          description: `The ${doc.coverage_type || 'insurance'} policy for ${vendor.name} has expired.`,
        });
      } else if (days <= 30) {
        alerts.push({
          id: `expiring-${doc.id}`,
          type: 'expiring',
          title: 'Policy Expiring Soon',
          vendorName: vendor.name,
          vendorId: vendor.id,
          projectId: vendor.projectId,
          description: `The current certificate for ${vendor.name} expires on ${new Date(doc.expiration_date).toLocaleDateString()}.`,
        });
      }
    });

    if (vendor.overall_status === 'Needs Review') {
      alerts.push({
        id: `review-${vendor.id}`,
        type: 'needs_review',
        title: 'Document Needs Review',
        vendorName: vendor.name,
        vendorId: vendor.id,
        projectId: vendor.projectId,
        description: `Coverage information for ${vendor.name} could not be determined with sufficient confidence. Review the source document.`,
      });
    }
  });

  return alerts;
}

export function deriveNotifications(companyId: string): NotificationItem[] {
  const projectIds = new Set(db.projects.filter(p => p.companyId === companyId).map(p => p.id));
  const notifications: NotificationItem[] = [];

  deriveAlerts(companyId).forEach(alert => {
    const kindMap: Record<AlertType, NotificationItem['kind']> = {
      coverage_gap: 'issue',
      expiring: 'expiration',
      missing: 'missing',
      needs_review: 'analysis',
    };
    notifications.push({
      id: `n-${alert.id}`,
      kind: kindMap[alert.type],
      title: alert.title,
      description: alert.description,
      date: new Date().toISOString(),
    });
  });

  db.activity
    .filter(a => projectIds.has(a.projectId))
    .forEach(activity => {
      notifications.push({
        id: `a-${activity.id}`,
        kind: 'activity',
        title: 'Activity',
        description: activity.description,
        date: activity.date,
      });
    });

  return notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
