import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Compass } from 'lucide-react';

export default function NotFound() {
  const { user } = useAuth();
  const home = user ? '/dashboard' : '/';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)', background: 'var(--color-bg)' }}>
      <div className="error-state" style={{ maxWidth: 420, textAlign: 'center' }}>
        <Compass size={40} className="empty-icon" />
        <h1 style={{ marginBottom: 'var(--space-2)' }}>Page not found</h1>
        <p style={{ marginBottom: 'var(--space-3)' }}>The page you're looking for doesn't exist or may have moved.</p>
        <Link to={home} className="btn btn-primary">{user ? 'Back to Dashboard' : 'Back to Home'}</Link>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
