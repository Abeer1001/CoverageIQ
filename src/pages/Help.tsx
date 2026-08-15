import { useState } from 'react';
import { Search, Rocket, FolderKanban, Users, UploadCloud, ShieldCheck, Bell, LifeBuoy } from 'lucide-react';

const articles = [
  {
    icon: Rocket,
    title: 'Getting Started',
    body: 'Create your first project, set insurance requirements, and add vendors to begin monitoring compliance. Your dashboard shows an overview of vendor health across all active projects.',
  },
  {
    icon: FolderKanban,
    title: 'Managing Projects',
    body: 'Each project has its own insurance requirements and minimum coverage limits. Edit a project to update its name, description, or status. Archived projects are hidden from your active list.',
  },
  {
    icon: Users,
    title: 'Adding Vendors',
    body: 'Add vendors manually with their company name, contact, and email. Each vendor gets a secure upload link you can copy or send by email, so they can submit certificates without an account.',
  },
  {
    icon: UploadCloud,
    title: 'Uploading Documents',
    body: 'Vendors upload PDF, JPG, or PNG certificates through their secure link. CoverageIQ then analyzes the document to extract coverage types, limits, and policy dates.',
  },
  {
    icon: ShieldCheck,
    title: 'Understanding Compliance',
    body: 'CoverageIQ compares extracted coverage against your project requirements. A vendor is compliant when detected limits meet or exceed the minimum required for each required coverage type.',
  },
  {
    icon: Bell,
    title: 'Managing Alerts',
    body: 'Alerts surface coverage gaps, missing documents, and upcoming expirations. Review an alert to see the specific requirement and take action by requesting an updated certificate.',
  },
];

export default function Help() {
  const [query, setQuery] = useState('');

  const filtered = articles.filter(article =>
    (article.title + ' ' + article.body).toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="page-header" style={{ justifyContent: 'center', textAlign: 'center' }}>
        <div>
          <h1 style={{ marginBottom: '4px' }}>How can we help?</h1>
          <p className="text-muted" style={{ margin: 0 }}>Find answers about using CoverageIQ.</p>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', background: 'var(--color-bg-card)' }}>
          <Search size={18} color="var(--color-text-muted)" />
          <input type="text" placeholder="Search help articles..." aria-label="Search help articles" style={{ border: 'none', background: 'none', outline: 'none', width: '100%', fontSize: '0.9rem' }} value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="grid-3" style={{ maxWidth: 980, margin: '0 auto' }}>
        {filtered.map(article => {
          const Icon = article.icon;
          return (
            <div className="feature-card" key={article.title}>
              <div className="icon-chip">
                <Icon size={22} />
              </div>
              <h3>{article.title}</h3>
              <p>{article.body}</p>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="card text-center" style={{ gridColumn: '1 / -1' }}>
            <p style={{ margin: 0 }}>No help articles match your search.</p>
          </div>
        )}
      </div>

      <div className="card text-center" style={{ maxWidth: 640, margin: 'var(--space-4) auto 0' }}>
        <LifeBuoy size={28} color="var(--color-brand)" style={{ marginBottom: 'var(--space-2)' }} />
        <h3>Can't find what you're looking for?</h3>
        <p style={{ marginBottom: 'var(--space-3)' }}>Support for this workspace is provided by your company administrator.</p>
        <a href="mailto:support@coverageiq.com?subject=CoverageIQ%20Support" className="btn btn-primary">Contact Support</a>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
