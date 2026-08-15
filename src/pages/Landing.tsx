import { Link } from 'react-router-dom';
import { ShieldAlert, CheckCircle, FileText, AlertTriangle } from 'lucide-react';

export default function Landing() {
  return (
    <div style={{ backgroundColor: 'white', minHeight: '100vh' }}>
      {/* Header */}
      <header className="flex-between" style={{ padding: 'var(--space-3) var(--space-8)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontWeight: 700, fontSize: '1.25rem' }}>
          <ShieldAlert size={28} color="var(--color-brand)" />
          CoverageIQ
        </div>
        <nav style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', fontWeight: 500, fontSize: '0.875rem' }}>
          <a href="#how-it-works" style={{ textDecoration: 'none', color: 'var(--color-text-main)' }}>How It Works</a>
          <a href="#features" style={{ textDecoration: 'none', color: 'var(--color-text-main)' }}>Features</a>
          <a href="#pricing" style={{ textDecoration: 'none', color: 'var(--color-text-main)' }}>Pricing</a>
        </nav>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Link to="/login" className="btn btn-secondary">Sign In</Link>
          <Link to="/signup" className="btn btn-primary">Start Free</Link>
        </div>
      </header>

      {/* Hero */}
      <section style={{ padding: 'var(--space-8) var(--space-4)', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '3.5rem', marginBottom: 'var(--space-3)', letterSpacing: '-0.03em' }}>
          Know which vendors are actually covered.
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
          CoverageIQ automatically reviews subcontractor insurance documents against your project requirements, identifies coverage gaps, and keeps your compliance status up to date.
        </p>
        <div className="flex-center gap-2">
          <Link to="/signup" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '1rem' }}>Start Free</Link>
          <a href="#how-it-works" className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: '1rem' }}>See How It Works</a>
        </div>
      </section>

      {/* Problem */}
      <section style={{ backgroundColor: 'var(--color-bg-body)', padding: 'var(--space-8) var(--space-4)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ marginBottom: 'var(--space-6)' }}>Insurance compliance shouldn't live in spreadsheets and inboxes.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
              <div className="flex-center" style={{ width: '48px', height: '48px', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', borderRadius: '50%', margin: '0 auto var(--space-2)' }}>
                <FileText size={24} />
              </div>
              <h3>Missing Documents</h3>
              <p className="text-muted">Stop chasing subcontractors for their initial COIs.</p>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
              <div className="flex-center" style={{ width: '48px', height: '48px', backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)', borderRadius: '50%', margin: '0 auto var(--space-2)' }}>
                <AlertTriangle size={24} />
              </div>
              <h3>Coverage Gaps</h3>
              <p className="text-muted">Manually reading COIs leads to missed shortfalls in limits.</p>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
              <div className="flex-center" style={{ width: '48px', height: '48px', backgroundColor: 'var(--color-neutral-bg)', color: 'var(--color-neutral)', borderRadius: '50%', margin: '0 auto var(--space-2)' }}>
                <ShieldAlert size={24} />
              </div>
              <h3>Expired Policies</h3>
              <p className="text-muted">Vendors working on site with recently expired insurance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: 'var(--space-8) var(--space-4)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <h2>Simple, transparent pricing</h2>
          <p className="mb-4">Choose the plan that fits your business.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', textAlign: 'left' }}>
            <div className="card" style={{ padding: 'var(--space-4)' }}>
              <h3>FREE</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>$0<span style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}>/mo</span></div>
              <ul style={{ listStyle: 'none', marginBottom: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li className="flex-center" style={{ justifyContent: 'flex-start', gap: '8px' }}><CheckCircle size={16} color="var(--color-success)" /> 3 active vendors</li>
                <li className="flex-center" style={{ justifyContent: 'flex-start', gap: '8px' }}><CheckCircle size={16} color="var(--color-success)" /> 1 project</li>
                <li className="flex-center" style={{ justifyContent: 'flex-start', gap: '8px' }}><CheckCircle size={16} color="var(--color-success)" /> Basic tracking</li>
              </ul>
              <Link to="/signup" className="btn btn-secondary" style={{ width: '100%' }}>Get Started</Link>
            </div>
            <div className="card" style={{ padding: 'var(--space-4)', border: '2px solid var(--color-brand)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--color-brand)', color: 'white', padding: '2px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>POPULAR</div>
              <h3>PRO</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>$49<span style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}>/mo</span></div>
              <ul style={{ listStyle: 'none', marginBottom: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li className="flex-center" style={{ justifyContent: 'flex-start', gap: '8px' }}><CheckCircle size={16} color="var(--color-success)" /> 50 vendors</li>
                <li className="flex-center" style={{ justifyContent: 'flex-start', gap: '8px' }}><CheckCircle size={16} color="var(--color-success)" /> Unlimited projects</li>
                <li className="flex-center" style={{ justifyContent: 'flex-start', gap: '8px' }}><CheckCircle size={16} color="var(--color-brand)" /> AI document analysis</li>
                <li className="flex-center" style={{ justifyContent: 'flex-start', gap: '8px' }}><CheckCircle size={16} color="var(--color-brand)" /> Automated reminders</li>
              </ul>
              <Link to="/signup" className="btn btn-primary" style={{ width: '100%' }}>Upgrade to Pro</Link>
            </div>
            <div className="card" style={{ padding: 'var(--space-4)' }}>
              <h3>BUSINESS</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>$149<span style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}>/mo</span></div>
              <ul style={{ listStyle: 'none', marginBottom: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li className="flex-center" style={{ justifyContent: 'flex-start', gap: '8px' }}><CheckCircle size={16} color="var(--color-success)" /> Unlimited vendors</li>
                <li className="flex-center" style={{ justifyContent: 'flex-start', gap: '8px' }}><CheckCircle size={16} color="var(--color-success)" /> Advanced compliance</li>
                <li className="flex-center" style={{ justifyContent: 'flex-start', gap: '8px' }}><CheckCircle size={16} color="var(--color-success)" /> Team access</li>
                <li className="flex-center" style={{ justifyContent: 'flex-start', gap: '8px' }}><CheckCircle size={16} color="var(--color-success)" /> Priority support</li>
              </ul>
              <Link to="/signup" className="btn btn-secondary" style={{ width: '100%' }}>Contact Sales</Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: 'var(--space-8) var(--space-4)', textAlign: 'center' }}>
        <h2 style={{ color: 'white', marginBottom: 'var(--space-2)' }}>Stop chasing certificates. Start managing compliance.</h2>
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Link to="/signup" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '1rem' }}>Start Free</Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: 'var(--space-4) var(--space-8)', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontWeight: 600 }}>
          <ShieldAlert size={20} />
          CoverageIQ
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</a>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</a>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Contact</a>
        </div>
      </footer>
    </div>
  );
}
