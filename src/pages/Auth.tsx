import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { seedDatabase } from '../db';
import { LogoMark } from '../components/Logo';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      setError("We couldn't sign you in with those credentials. Check your email and password and try again.");
    }
  };

  const loadDemo = () => {
    seedDatabase();
    login('admin@example.com', 'demo12345').then(() => navigate('/dashboard')).catch(() => {
      setError("We couldn't sign you in with those credentials. Check your email and password and try again.");
    });
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-body)', padding: 'var(--space-4)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: 'var(--space-6) var(--space-4)' }}>
        <div className="flex-center" style={{ marginBottom: 'var(--space-3)' }}>
          <LogoMark size={40} />
        </div>
        <h2 style={{ textAlign: 'center', marginBottom: '4px' }}>Welcome back.</h2>
        <p className="text-muted" style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>Sign in to continue monitoring your vendor compliance.</p>
        {error && <div className="badge badge-danger" style={{ display: 'block', padding: '10px', marginBottom: '1rem', textAlign: 'center', whiteSpace: 'normal' }} role="alert">{error}</div>}
        {info && <div className="badge badge-neutral" style={{ display: 'block', padding: '10px', marginBottom: '1rem', textAlign: 'center', whiteSpace: 'normal' }} role="status">{info}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Work email</label>
            <input id="login-email" type="email" required className="form-input" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <input id="login-password" type="password" minLength={8} required className="form-input" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <div style={{ textAlign: 'right', marginBottom: 'var(--space-2)' }}>
            <button type="button" className="btn-ghost" style={{ fontSize: '0.8125rem', color: 'var(--color-brand)', padding: 0 }} onClick={() => { setError(''); setInfo("Password reset isn't available in this workspace. Contact your administrator for help."); }}>
              Forgot password?
            </button>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Sign In</button>
        </form>
        <div style={{ marginTop: 'var(--space-4)', textAlign: 'center', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
          <button type="button" className="btn btn-secondary" style={{ width: '100%', marginBottom: 'var(--space-1)' }} onClick={loadDemo}>Load Demo Workspace</button>
          <p style={{ fontSize: '0.75rem', margin: '0 0 var(--space-2)' }}>Demo: admin@example.com / demo12345</p>
          <p style={{ fontSize: '0.875rem' }}>New to CoverageIQ? <Link to="/signup" style={{ color: 'var(--color-brand)' }}>Create an account</Link></p>
        </div>
      </div>
    </div>
  );
}

export function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signup(name, email, company, password);
      navigate('/onboarding');
    } catch (err) {
      setError(err instanceof Error && err.message === 'Email already in use'
        ? 'An account with this email already exists. Try signing in instead.'
        : 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-body)', padding: 'var(--space-4)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: 'var(--space-6) var(--space-4)' }}>
        <div className="flex-center" style={{ marginBottom: 'var(--space-3)' }}>
          <LogoMark size={40} />
        </div>
        <h2 style={{ textAlign: 'center', marginBottom: '4px' }}>Start managing vendor compliance.</h2>
        <p className="text-muted" style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>Create your CoverageIQ workspace and set up your first project.</p>
        {error && <div className="badge badge-danger" style={{ display: 'block', padding: '10px', marginBottom: '1rem', textAlign: 'center', whiteSpace: 'normal' }} role="alert">{error}</div>}
        <form onSubmit={handleSignup}>
          <div className="form-group">
            <label className="form-label" htmlFor="signup-name">Full name</label>
            <input id="signup-name" type="text" required className="form-input" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="signup-email">Work email</label>
            <input id="signup-email" type="email" required className="form-input" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="signup-password">Password</label>
            <input id="signup-password" type="password" minLength={8} required className="form-input" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="signup-company">Company name</label>
            <input id="signup-company" type="text" required className="form-input" value={company} onChange={e => setCompany(e.target.value)} autoComplete="organization" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-2)' }}>Create Account</button>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', textAlign: 'center', marginTop: 'var(--space-2)' }}>
            By creating an account, you agree to the <Link to="/terms" style={{ color: 'var(--color-brand)' }}>Terms of Service</Link> and <Link to="/privacy" style={{ color: 'var(--color-brand)' }}>Privacy Policy</Link>.
          </p>
        </form>
        <div style={{ marginTop: 'var(--space-4)', textAlign: 'center', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
          <p style={{ fontSize: '0.875rem' }}>Already have an account? <Link to="/login" style={{ color: 'var(--color-brand)' }}>Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
