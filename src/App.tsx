import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ClientPortal } from './pages/ClientPortal';
import { ContractView } from './pages/ContractView';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { CreateContract } from './pages/admin/CreateContract';
import { AdminContractDetails } from './pages/admin/AdminContractDetails';
import { ShieldAlert } from 'lucide-react';
import { SystemLoader } from './components/SystemLoader';

function AppContent() {
  const { currentUser, isAdmin, loading } = useAuth();
  const [loaderFinished, setLoaderFinished] = useState(false);
  
  // Route state
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/');
  const [activeContractId, setActiveContractId] = useState<string | null>(null);

  // Sync with browser URL
  const navigate = (path: string, contractId?: string) => {
    if (contractId) {
      setActiveContractId(contractId);
    }
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      // Check if path is contract/:id or admin/contracts/:id
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts[0] === 'contract' && parts[1]) {
        setActiveContractId(parts[1]);
      } else if (parts[0] === 'admin' && parts[1] === 'contracts' && parts[2] && parts[2] !== 'new') {
        setActiveContractId(parts[2]);
      }
    };

    window.addEventListener('popstate', handlePopState);
    handlePopState();
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle redirects on login/logout
  useEffect(() => {
    if (!loading) {
      if (currentUser) {
        if (currentPath === '/login' || currentPath === '/register') {
          navigate(isAdmin ? '/admin' : '/account');
        }
      } else {
        // If logged out and on protected routes, redirect to login
        if (currentPath.startsWith('/account') || currentPath.startsWith('/admin') || currentPath.startsWith('/contract')) {
          navigate('/login');
        }
      }
    }
  }, [currentUser, isAdmin, loading]);

  if (loading || !loaderFinished) {
    return (
      <SystemLoader 
        isReady={!loading} 
        onComplete={() => setLoaderFinished(true)} 
      />
    );
  }

  // Parse path for routing
  const pathParts = currentPath.split('/').filter(Boolean);

  // ROUTE RENDERING
  const renderRoute = () => {
    // PUBLIC ROUTES:
    if (currentPath === '/' || currentPath === '') {
      return (
        <Home 
          setCurrentView={(view) => {
            if (view === 'login') navigate('/login');
            else if (view === 'register') navigate('/register');
            else if (view === 'admin') navigate('/admin');
            else navigate('/account');
          }} 
          onOpenContract={(cId) => navigate(`/contract/${cId}`, cId)}
        />
      );
    }

    if (currentPath === '/login') {
      return (
        <Login 
          setCurrentView={(view) => {
            if (view === 'home') navigate('/');
            else if (view === 'register') navigate('/register');
            else navigate('/account');
          }} 
        />
      );
    }

    if (currentPath === '/register') {
      return (
        <Register 
          setCurrentView={(view) => {
            if (view === 'home') navigate('/');
            else if (view === 'login') navigate('/login');
            else navigate('/account');
          }} 
        />
      );
    }

    // CLIENT ROUTES (Guarded):
    if (currentPath === '/account') {
      if (!currentUser) {
        return (
          <Login 
            setCurrentView={(view) => {
              if (view === 'home') navigate('/');
              else if (view === 'register') navigate('/register');
              else navigate('/account');
            }} 
          />
        );
      }
      return (
        <ClientPortal 
          onOpenContract={(cId) => navigate(`/contract/${cId}`, cId)} 
        />
      );
    }

    if (pathParts[0] === 'contract' && pathParts[1]) {
      const cId = activeContractId || pathParts[1];
      return (
        <ContractView 
          contractId={cId} 
          onBack={() => navigate(currentUser ? '/account' : '/')} 
        />
      );
    }

    // ADMIN ROUTES (Strictly guarded):
    if (currentPath.startsWith('/admin')) {
      if (!currentUser || !isAdmin) {
        // Access Denied screen for unauthorized users trying to access /admin
        return (
          <div className="py-20 max-w-md mx-auto px-4 text-center">
            <div className="bg-[#0c1328] rounded-2xl border border-red-900/50 p-8 shadow-xl">
              <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-white mb-2">منطقة محظورة</h2>
              <p className="text-xs text-red-300 mb-6">
                لا تملك صلاحيات الوصول إلى لوحة إدارة شركة Codexa. هذه الصفحة مخصصة لمدير النظام فقط.
              </p>
              <button
                onClick={() => navigate('/account')}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                العودة إلى حسابي
              </button>
            </div>
          </div>
        );
      }

      // /admin/contracts/new
      if (currentPath === '/admin/contracts/new') {
        return (
          <CreateContract 
            onBack={() => navigate('/admin')}
            onCreated={(cId) => navigate(`/admin/contracts/${cId}`, cId)}
          />
        );
      }

      // /admin/contracts/:contractId
      if (pathParts[0] === 'admin' && pathParts[1] === 'contracts' && pathParts[2] && pathParts[2] !== 'new') {
        const cId = activeContractId || pathParts[2];
        return (
          <AdminContractDetails 
            contractId={cId}
            onBack={() => navigate('/admin')}
          />
        );
      }

      // Default Admin Dashboard: /admin or /admin/contracts
      return (
        <AdminDashboard 
          onOpenContract={(cId) => navigate(`/admin/contracts/${cId}`, cId)}
          onNavigateNew={() => navigate('/admin/contracts/new')}
          onExit={() => navigate('/')}
        />
      );
    }

    // Fallback: 404 or redirect to home
    return (
      <Home 
        setCurrentView={(view) => {
          if (view === 'login') navigate('/login');
          else if (view === 'register') navigate('/register');
          else if (view === 'admin') navigate('/admin');
          else navigate('/account');
        }} 
      />
    );
  };

  const getCurrentViewName = () => {
    if (currentPath === '/') return 'home';
    if (currentPath === '/login') return 'login';
    if (currentPath === '/register') return 'register';
    if (currentPath === '/account') return 'account';
    if (currentPath.startsWith('/admin')) return 'admin';
    return 'home';
  };

  return (
    <div className="min-h-screen bg-[#070b19] flex flex-col text-slate-100 selection:bg-blue-600 selection:text-white">
      <Navbar 
        currentView={getCurrentViewName()}
        setCurrentView={(view) => {
          if (view === 'home') navigate('/');
          else if (view === 'login') navigate('/login');
          else if (view === 'register') navigate('/register');
          else if (view === 'account') navigate('/account');
          else if (view === 'admin') navigate('/admin');
          else if (view === 'admin-new-contract') navigate('/admin/contracts/new');
        }}
        onOpenContract={(cId) => {
          if (isAdmin) {
            navigate(`/admin/contracts/${cId}`, cId);
          } else {
            navigate(`/contract/${cId}`, cId);
          }
        }}
      />

      <main className="flex-1">
        {renderRoute()}
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
