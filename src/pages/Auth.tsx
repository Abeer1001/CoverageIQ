import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { ShieldAlert } from 'lucide-react';
import { seedDatabase } from '../db';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadDemo = () => {
    seedDatabase();
    login('admin@example.com', 'demo12345').then(() => navigate('/dashboard')).catch(err => setError(err.message));
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-body)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: 'var(--space-6) var(--space-4)' }}>
        <div className="flex-center" style={{ marginBottom: 'var(--space-4)', color: 'var(--color-brand)' }}>
          <ShieldAlert size={36} />
        </div>
        <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>Sign in to CoverageIQ</h2>
        {error && <div className="badge badge-danger" style={{ display: 'block', padding: '8px', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" required className="form-input" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" minLength={8} required className="form-input" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Sign In</button>
        </form>
        <div style={{ marginTop: 'var(--space-4)', textAlign: 'center', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
          <button type="button" className="btn btn-secondary" style={{ width: '100%', marginBottom: 'var(--space-2)' }} onClick={loadDemo}>Load Demo Workspace</button>
          <p style={{ fontSize: '0.75rem', margin: '0 0 var(--space-2)' }}>Demo password: demo12345</p>
          <p style={{ fontSize: '0.875rem' }}>Don't have an account? <Link to="/signup" style={{ color: 'var(--color-brand)' }}>Sign up</Link></p>
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
    try {
      await signup(name, email, company, password);
      navigate('/onboarding');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-body)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: 'var(--space-6) var(--space-4)' }}>
        <div className="flex-center" style={{ marginBottom: 'var(--space-4)', color: 'var(--color-brand)' }}>
          <ShieldAlert size={36} />
        </div>
        <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>Create your account</h2>
        {error && <div className="badge badge-danger" style={{ display: 'block', padding: '8px', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        <form onSubmit={handleSignup}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" required className="form-input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" minLength={8} required className="form-input" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" required className="form-input" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Company Name</label>
            <input type="text" required className="form-input" value={company} onChange={e => setCompany(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-2)' }}>Start Free</button>
        </form>
        <div style={{ marginTop: 'var(--space-4)', textAlign: 'center', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
          <p style={{ fontSize: '0.875rem' }}>Already have an account? <Link to="/login" style={{ color: 'var(--color-brand)' }}>Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
