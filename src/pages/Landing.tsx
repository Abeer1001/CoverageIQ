import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  FileText,
  Search,
  AlertTriangle,
  CheckCircle,
  LayoutDashboard,
  Clock,
  Link2,
  Sparkles,
  ArrowLeftRight,
  ChevronDown,
} from 'lucide-react';
import { LogoMark } from '../components/Logo';

const problemCards = [
  {
    icon: FileText,
    title: 'Lost in email',
    body: 'Insurance certificates are difficult to track when every vendor sends documents differently.',
  },
  {
    icon: Search,
    title: 'Manual checking',
    body: 'Reviewing coverage limits and policy dates vendor by vendor takes time.',
  },
  {
    icon: AlertTriangle,
    title: 'Surprise gaps',
    body: 'Missing or insufficient coverage can go unnoticed until someone checks manually.',
  },
];

const steps = [
  { title: 'Set your requirements', body: 'Define the insurance coverage and minimum limits required for each project.' },
  { title: 'Collect documents', body: 'Give vendors a secure upload link so they can submit their certificates directly.' },
  { title: 'Let CoverageIQ analyze', body: 'AI-assisted document analysis extracts policy information and coverage details.' },
  { title: 'Compare automatically', body: 'CoverageIQ compares extracted information against the requirements for that project.' },
  { title: 'Take action', body: 'See exactly which vendors need attention and why.' },
];

const features = [
  { icon: LayoutDashboard, title: 'Project-specific requirements', body: 'Set different insurance requirements for different projects instead of applying one generic checklist everywhere.' },
  { icon: Sparkles, title: 'AI-assisted document analysis', body: 'Extract key policy information from uploaded insurance documents without manually reading every certificate.' },
  { icon: ArrowLeftRight, title: 'Requirement comparison', body: 'Compare detected coverage limits against the actual requirements configured for the project.' },
  { icon: CheckCircle, title: 'Compliance dashboard', body: 'See compliant, non-compliant, expiring, and missing documents at a glance.' },
  { icon: Clock, title: 'Expiration monitoring', body: 'Identify policies approaching expiration before they become a last-minute problem.' },
  { icon: Link2, title: 'Vendor upload links', body: 'Give subcontractors a simple way to submit documents without exposing your internal dashboard.' },
];

const trustItems = [
  'Company-scoped access',
  'Secure vendor upload links',
  'Server-side API credentials',
  'Controlled document access',
  'Activity tracking',
];

const faqs = [
  { q: 'What does CoverageIQ analyze?', a: 'CoverageIQ analyzes uploaded insurance documents and extracts available policy information such as insurer, policy number, coverage types, limits, effective dates, and expiration dates.' },
  { q: 'Does CoverageIQ replace an insurance professional?', a: 'No. CoverageIQ is an AI-assisted compliance monitoring tool. Its findings are intended to help teams identify documents and potential coverage gaps that may require review.' },
  { q: 'Can requirements differ by project?', a: 'Yes. Each project can have its own insurance requirements and minimum coverage limits.' },
  { q: 'Do vendors need a CoverageIQ account?', a: 'No. Vendors can submit documents through their secure upload link without accessing the contractor\'s internal workspace.' },
  { q: 'What happens when a policy is expiring?', a: 'CoverageIQ can flag policies approaching expiration so the contractor can request updated documentation before the existing policy expires.' },
  { q: 'Can I edit requirements?', a: 'Yes. Project requirements can be updated, and compliance should be recalculated against the current requirements.' },
];

const pricingPlans = [
  {
    name: 'Free',
    description: 'For getting started.',
    features: ['1 project', 'Up to 5 vendors', 'Basic document tracking', 'Compliance dashboard'],
    cta: 'Start Free',
    featured: false,
  },
  {
    name: 'Pro',
    description: 'For growing contractors.',
    features: ['Multiple projects', 'More vendors', 'AI-assisted document analysis', 'Expiration monitoring', 'Compliance alerts', 'Vendor upload links'],
    cta: 'Start Pro',
    featured: true,
  },
  {
    name: 'Business',
    description: 'For larger teams.',
    features: ['Advanced project management', 'Higher vendor limits', 'Team workflows', 'Advanced monitoring', 'Priority support'],
    cta: 'Contact Sales',
    featured: false,
  },
];

export default function Landing() {
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll('.reveal'));
    if (!('IntersectionObserver' in window)) {
      targets.forEach(el => el.classList.add('in-view'));
      return;
    }
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    targets.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing">
      {/* Header */}
      <header className="landing-nav">
        <div className="landing-brand">
          <LogoMark size={28} />
          CoverageIQ
        </div>
        <nav className="landing-links" aria-label="Main navigation">
          <a href="#how-it-works">How It Works</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="landing-cta">
          <Link to="/login" className="btn btn-secondary">Sign In</Link>
          <Link to="/signup" className="btn btn-primary">Start Free</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <span className="eyebrow">Insurance compliance, without the spreadsheet</span>
          <h1>Know which vendors are <span className="grad-text">actually covered</span>.</h1>
          <p>CoverageIQ analyzes subcontractor insurance documents against your project requirements and shows you exactly what's covered, what's missing, and what needs attention.</p>
          <div className="flex-center gap-2">
            <Link to="/signup" className="btn btn-primary btn-lg">Start Free</Link>
            <a href="#how-it-works" className="btn btn-secondary btn-lg">See How It Works</a>
          </div>
          <p className="hero-support">Set up in minutes. No insurance expertise required.</p>

          <div className="hero-mockup" aria-hidden="true">
            <div className="mockup-window">
              <div className="mockup-titlebar">
                <span className="mockup-dots"><i /><i /><i /></span>
                <span className="mockup-url">app.coverageiq.com/dashboard</span>
              </div>
              <div className="mockup-body">
                <div className="mockup-top">
                  <div className="mockup-title">Compliance Health</div>
                  <span className="mockup-pill">Live workspace</span>
                </div>
                <div className="mockup-bar">
                  <span className="mockup-seg ok" style={{ flex: 3 }} />
                  <span className="mockup-seg warn" style={{ flex: 1 }} />
                  <span className="mockup-seg bad" style={{ flex: 1 }} />
                  <span className="mockup-seg neutral" style={{ flex: 1 }} />
                </div>
                <div className="mockup-legend">
                  <span><i className="ok" />Compliant</span>
                  <span><i className="warn" />Expiring</span>
                  <span><i className="bad" />Non-compliant</span>
                  <span><i className="neutral" />Missing</span>
                </div>
                <div className="mockup-rows">
                  <div className="mockup-row">
                    <span className="mockup-name">XYZ Plumbing</span>
                    <span className="mock-status ok">Compliant</span>
                  </div>
                  <div className="mockup-row">
                    <span className="mockup-name">ABC Electrical LLC</span>
                    <span className="mock-status bad">Non-compliant</span>
                  </div>
                  <div className="mockup-row">
                    <span className="mockup-name">City Glass</span>
                    <span className="mock-status warn">Expiring soon</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="section section-alt">
        <div className="section-inner">
          <div className="section-head reveal">
            <h2>Insurance compliance shouldn't live in your inbox.</h2>
            <p>Certificates of insurance arrive by email, get buried in folders, and end up scattered across spreadsheets. When coverage changes or documents expire, finding the problem can become a manual process.</p>
            <p style={{ marginTop: 'var(--space-2)' }}>CoverageIQ brings your vendor insurance requirements, documents, and compliance status into one place.</p>
          </div>
          <div className="grid-3 reveal">
            {problemCards.map(card => {
              const Icon = card.icon;
              return (
                <div className="feature-card text-center" key={card.title}>
                  <div className="icon-chip" style={{ margin: '0 auto var(--space-2)' }}>
                    <Icon size={22} />
                  </div>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section" id="how-it-works">
        <div className="section-inner">
          <div className="section-head reveal">
            <h2>From certificate to clear answer.</h2>
            <p>CoverageIQ turns insurance documents into actionable compliance information.</p>
          </div>
          <div className="steps reveal">
            {steps.map((step, index) => (
              <div className="step" key={step.title}>
                <div className="step-num">{index + 1}</div>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiator */}
      <section className="section section-alt">
        <div className="section-inner text-center">
          <div className="section-head reveal">
            <h2>We don't just store the certificate.</h2>
            <p style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--color-text-main)' }}>CoverageIQ tells you what is wrong with it.</p>
          </div>
          <div className="diff-grid reveal">
            <div className="diff-cell">
              <div className="diff-label">Project requirement</div>
              <div className="diff-value">General Liability</div>
              <div className="text-muted" style={{ fontSize: '0.9rem' }}>$1,000,000 minimum</div>
            </div>
            <div className="diff-cell">
              <div className="diff-label">Document</div>
              <div className="diff-value">General Liability</div>
              <div className="text-muted" style={{ fontSize: '0.9rem' }}>$500,000 detected</div>
            </div>
            <div className="diff-cell diff-bad">
              <div className="diff-label">Result</div>
              <div className="diff-value">Non-compliant</div>
              <div className="text-muted" style={{ fontSize: '0.9rem' }}>Shortfall $500,000</div>
            </div>
          </div>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Link to="/signup" className="btn btn-primary btn-lg">See Compliance in Action</Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section" id="features">
        <div className="section-inner">
          <div className="section-head reveal">
            <h2>Everything you need to stay ahead of vendor compliance.</h2>
          </div>
          <div className="grid-3 reveal">
            {features.map(feature => {
              const Icon = feature.icon;
              return (
                <div className="feature-card" key={feature.title}>
                  <div className="icon-chip">
                    <Icon size={22} />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Action */}
      <section className="section section-alt">
        <div className="section-inner text-center">
          <h2 style={{ fontSize: '2rem' }}>Stop asking, "Did they send the certificate?"</h2>
          <p style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--color-text-main)' }}>Start asking: "Are they actually covered?"</p>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Link to="/signup" className="btn btn-primary btn-lg">Start Monitoring Vendors</Link>
          </div>
        </div>
      </section>

      {/* Security / Trust */}
      <section className="section">
        <div className="section-inner text-center">
          <div className="section-head reveal">
            <h2>Built for sensitive business documents.</h2>
            <p>CoverageIQ is designed around controlled access, company-scoped data, and secure document handling.</p>
          </div>
          <ul className="trust-list reveal">
            {trustItems.map(item => (
              <li key={item}>
                <ShieldCheck size={20} color="var(--color-success)" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="section section-alt" id="faq">
        <div className="section-inner">
          <div className="section-head reveal">
            <h2>Frequently asked questions</h2>
          </div>
          <div className="faq-list reveal">
            {faqs.map(faq => (
              <details className="faq-item" key={faq.q}>
                <summary>
                  {faq.q}
                  <ChevronDown size={18} color="var(--color-text-muted)" />
                </summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="section" id="pricing">
        <div className="section-inner">
          <div className="section-head reveal">
            <h2>Simple, transparent pricing</h2>
            <p>Choose the plan that fits how you manage vendor compliance.</p>
          </div>
          <div className="pricing-grid reveal">
            {pricingPlans.map(plan => (
              <div className={`pricing-card${plan.featured ? ' featured' : ''}`} key={plan.name}>
                <div className="pricing-name">{plan.name}</div>
                <div className="pricing-desc">{plan.description}</div>
                <ul className="pricing-features">
                  {plan.features.map(feature => (
                    <li key={feature}>
                      <CheckCircle size={16} color="var(--color-success)" style={{ flexShrink: 0, marginTop: 2 }} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className={`btn ${plan.featured ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%' }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="cta-band reveal">
        <h2>Know your vendor compliance before it becomes a problem.</h2>
        <p>Bring your projects, requirements, documents, and vendor status into one clear workspace.</p>
        <div className="flex-center gap-2" style={{ marginTop: 'var(--space-4)' }}>
          <Link to="/signup" className="btn btn-primary btn-lg">Start Free</Link>
          <Link to="/dashboard" className="btn btn-secondary btn-lg">Explore the Dashboard</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-grid">
            <div>
              <div className="landing-brand">
                <LogoMark size={20} />
                CoverageIQ
              </div>
              <p className="footer-desc">AI-assisted insurance compliance monitoring for contractors and property managers.</p>
            </div>
            <div className="footer-col">
              <h4>Product</h4>
              <a href="#how-it-works">Overview</a>
              <Link to="/projects">Projects</Link>
              <Link to="/vendors">Vendors</Link>
              <Link to="/documents">Documents</Link>
              <Link to="/alerts">Alerts</Link>
              <a href="#pricing">Pricing</a>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <a href="#how-it-works">How It Works</a>
              <a href="#faq">FAQ</a>
              <Link to="/help">Help Center</Link>
              <Link to="/help">Contact</Link>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <Link to="/about">About</Link>
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>© 2026 CoverageIQ. All rights reserved.</div>
            <p className="footer-disclaimer">CoverageIQ provides AI-assisted document analysis and compliance monitoring. It does not provide insurance, legal advice, or guarantee coverage.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
