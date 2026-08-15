import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Landing from './pages/Landing';
import { Login, Signup } from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import PublicUpload from './pages/PublicUpload';
import Vendors from './pages/Vendors';
import Projects from './pages/Projects';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';

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
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          
          <Route path="/dashboard" element={<ProtectedRoute><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute><MainLayout><Projects /></MainLayout></ProtectedRoute>} />
          <Route path="/project/:projectId" element={<ProtectedRoute><MainLayout><ProjectDetail /></MainLayout></ProtectedRoute>} />
          <Route path="/vendors" element={<ProtectedRoute><MainLayout><Vendors /></MainLayout></ProtectedRoute>} />
          
          <Route path="/upload/:token" element={<PublicUpload />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
