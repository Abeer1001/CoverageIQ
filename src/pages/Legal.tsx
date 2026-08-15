import { Link } from 'react-router-dom';
import { Building2, Lock, FileText } from 'lucide-react';

function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid var(--color-border)', padding: 'var(--space-3) var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-bg-card)' }}>
        <Link to="/" style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)', textDecoration: 'none' }}>CoverageIQ</Link>
        <Link to="/login" className="btn btn-secondary btn-sm">Sign In</Link>
      </header>
      <main style={{ flex: 1, maxWidth: 760, width: '100%', margin: '0 auto', padding: 'var(--space-5) var(--space-4)' }}>
        {children}
      </main>
      <footer style={{ borderTop: '1px solid var(--color-border)', padding: 'var(--space-3) var(--space-4)', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
        © {new Date().getFullYear()} CoverageIQ. All rights reserved.
      </footer>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

function Doc({ children }: { children: React.ReactNode }) {
  return <div style={{ animation: 'fadeIn 0.3s ease', color: 'var(--color-text)', lineHeight: 1.65 }}>{children}</div>;
}

export function About() {
  return (
    <LegalLayout>
      <Doc>
        <div className="icon-chip" style={{ marginBottom: 'var(--space-3)' }}><Building2 size={22} /></div>
        <h1 style={{ marginBottom: 'var(--space-2)' }}>About CoverageIQ</h1>
        <p className="text-muted" style={{ marginBottom: 'var(--space-4)' }}>Clear visibility into vendor insurance compliance, without the manual chasing.</p>

        <p>CoverageIQ helps contractors and project teams monitor vendor insurance coverage in one place. Instead of tracking certificates across spreadsheets and email threads, you get a single, organized view of every vendor, their documents, and how their coverage measures up to your project's requirements.</p>
        <p style={{ marginTop: 'var(--space-3)' }}>Uploaded certificates are analyzed to extract coverage types, limits, and policy dates. CoverageIQ then compares that information against the requirements you define for each project, so gaps and upcoming expirations surface as clear, actionable alerts.</p>
        <p style={{ marginTop: 'var(--space-3)' }}>We use AI-assisted analysis to help read and organize insurance documents. Final compliance determinations should always be reviewed by a qualified professional.</p>
      </Doc>
    </LegalLayout>
  );
}

export function Privacy() {
  return (
    <LegalLayout>
      <Doc>
        <div className="icon-chip" style={{ marginBottom: 'var(--space-3)' }}><Lock size={22} /></div>
        <h1 style={{ marginBottom: 'var(--space-2)' }}>Privacy Policy</h1>
        <p className="text-muted" style={{ marginBottom: 'var(--space-4)' }}>How we handle your data.</p>

        <h3>Information we collect</h3>
        <p>We collect the information you provide when you create an account, add projects and vendors, and upload insurance documents. This includes names, contact details, company information, and the contents of the certificates you submit.</p>

        <h3 style={{ marginTop: 'var(--space-4)' }}>How we use it</h3>
        <p>We use this information to provide the compliance monitoring features of CoverageIQ: organizing vendors, analyzing documents, and surfacing compliance status and alerts. We do not sell your data.</p>

        <h3 style={{ marginTop: 'var(--space-4)' }}>Document analysis</h3>
        <p>Documents you upload may be processed with AI-assisted analysis to extract coverage details. Review the extracted information before relying on it for compliance decisions.</p>

        <h3 style={{ marginTop: 'var(--space-4)' }}>Data retention</h3>
        <p>Your workspace data is retained while your account is active. Contact your administrator to request account or data removal.</p>

        <h3 style={{ marginTop: 'var(--space-4)' }}>Contact</h3>
        <p>Questions about this policy can be sent to <a href="mailto:support@coverageiq.com">support@coverageiq.com</a>.</p>
      </Doc>
    </LegalLayout>
  );
}

export function Terms() {
  return (
    <LegalLayout>
      <Doc>
        <div className="icon-chip" style={{ marginBottom: 'var(--space-3)' }}><FileText size={22} /></div>
        <h1 style={{ marginBottom: 'var(--space-2)' }}>Terms of Service</h1>
        <p className="text-muted" style={{ marginBottom: 'var(--space-4)' }}>The terms that govern your use of CoverageIQ.</p>

        <h3>Acceptance of terms</h3>
        <p>By creating an account or using CoverageIQ, you agree to these terms. If you do not agree, please do not use the service.</p>

        <h3 style={{ marginTop: 'var(--space-4)' }}>Your responsibilities</h3>
        <p>You are responsible for the accuracy of the information you provide, for keeping your account credentials secure, and for obtaining any necessary consent before uploading documents that contain third-party information.</p>

        <h3 style={{ marginTop: 'var(--space-4)' }}>Nature of the service</h3>
        <p>CoverageIQ provides organizational and analysis tools to assist with vendor insurance compliance monitoring. It is not a legal advisor, and it does not guarantee compliance with any law, regulation, or contract. You are responsible for reviewing documents and making final compliance determinations.</p>

        <h3 style={{ marginTop: 'var(--space-4)' }}>AI-assisted analysis</h3>
        <p>Some features use AI-assisted analysis. Results may be incomplete or inaccurate and should be reviewed by a qualified professional.</p>

        <h3 style={{ marginTop: 'var(--space-4)' }}>Changes to the service</h3>
        <p>We may update or modify CoverageIQ from time to time. We will make reasonable efforts to notify you of significant changes.</p>

        <h3 style={{ marginTop: 'var(--space-4)' }}>Contact</h3>
        <p>Questions about these terms can be sent to <a href="mailto:support@coverageiq.com">support@coverageiq.com</a>.</p>
      </Doc>
    </LegalLayout>
  );
}
