import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ToastProvider } from './components/Toast';
import Landing from './pages/Landing';
import { Login, Signup } from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import PublicUpload from './pages/PublicUpload';
import Vendors from './pages/Vendors';
import VendorDetail from './pages/VendorDetail';
import Projects from './pages/Projects';
import Documents from './pages/Documents';
import Alerts from './pages/Alerts';
import Activity from './pages/Activity';
import Settings from './pages/Settings';
import Help from './pages/Help';
import NotFound from './pages/NotFound';
import { About, Privacy, Terms } from './pages/Legal';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import ChatWidget from './components/ChatWidget';
import { LogoMark } from './components/Logo';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopNav />
        <div className="content-area">
          {children}
        </div>
        <footer className="app-footer">
          <div className="app-footer-brand">
            <LogoMark size={18} />
            <span className="app-footer-logo">CoverageIQ</span>
            <span className="app-footer-tagline">AI-assisted insurance compliance monitoring</span>
          </div>
          <nav className="app-footer-links" aria-label="Footer">
            <Link to="/about">About</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/help">Help</Link>
          </nav>
          <div className="app-footer-copy">© {new Date().getFullYear()} CoverageIQ. All rights reserved.</div>
        </footer>
        <ChatWidget />
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

            <Route path="/dashboard" element={<ProtectedRoute><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><MainLayout><Projects /></MainLayout></ProtectedRoute>} />
            <Route path="/project/:projectId" element={<ProtectedRoute><MainLayout><ProjectDetail /></MainLayout></ProtectedRoute>} />
            <Route path="/vendors" element={<ProtectedRoute><MainLayout><Vendors /></MainLayout></ProtectedRoute>} />
            <Route path="/vendor/:vendorId" element={<ProtectedRoute><MainLayout><VendorDetail /></MainLayout></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><MainLayout><Documents /></MainLayout></ProtectedRoute>} />
            <Route path="/alerts" element={<ProtectedRoute><MainLayout><Alerts /></MainLayout></ProtectedRoute>} />
            <Route path="/activity" element={<ProtectedRoute><MainLayout><Activity /></MainLayout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><MainLayout><Settings /></MainLayout></ProtectedRoute>} />
            <Route path="/help" element={<ProtectedRoute><MainLayout><Help /></MainLayout></ProtectedRoute>} />

            <Route path="/upload/:token" element={<PublicUpload />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
