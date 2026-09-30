import React, { useState, useEffect } from 'react';
import { Navbar } from './components/common/Navbar';
import { CitizenPortal } from './components/citizen/CitizenPortal';
import { HospitalPortal } from './components/hospital/HospitalPortal';
import { OperatorPortal } from './components/operator/OperatorPortal';
import { AmbulancePortal } from './components/ambulance/AmbulancePortal';
import { GovernmentPortal } from './components/government/GovernmentPortal';
import { AdminPortal } from './components/admin/AdminPortal';
import { LoginPage } from './components/auth/LoginPage';
import { SignUpPage } from './components/auth/SignUpPage';
import { AccessDeniedPage } from './components/auth/AccessDeniedPage';
import { MfaModal } from './components/auth/MfaModal';
import { FirstLoginModal } from './components/auth/FirstLoginModal';
import { RealtimeStatusBar } from './components/common/RealtimeStatusBar';
import { useMedMesh, canAccessRoute, ROLE_ROUTE_MAP } from './store/useMedMeshStore';
import {
  Activity,
  CheckCircle2,
  ShieldCheck,
  Lock
} from 'lucide-react';

export const App: React.FC = () => {
  const {
    isAuthenticated,
    currentRole,
    currentUser,
    currentPath,
    navigate,
    mfaPendingUser,
    firstLoginPendingUser
  } = useMedMesh();

  // Keep browser history in sync with active path
  useEffect(() => {
    try {
      if (window.location.pathname !== currentPath) {
        if (!isAuthenticated) {
          window.history.replaceState(null, '', '/login');
        } else {
          window.history.pushState({}, '', currentPath);
        }
      }
    } catch (e) {
      // ignore
    }
  }, [currentPath, isAuthenticated]);

  // Handle browser back and forward button events
  useEffect(() => {
    const handlePopState = () => {
      // Strict auth guard: If unauthenticated, prevent entering any protected route via browser back
      if (!isAuthenticated) {
        window.history.replaceState(null, '', '/login');
        navigate('/login');
        return;
      }
      const path = window.location.pathname || (ROLE_ROUTE_MAP[currentRole] || '/login');
      if (!canAccessRoute(currentRole, path)) {
        const fallback = ROLE_ROUTE_MAP[currentRole] || '/login';
        window.history.replaceState(null, '', fallback);
        navigate(fallback);
        return;
      }
      navigate(path);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate, isAuthenticated, currentRole]);

  // Enterprise Route Guard & Dispatcher (Zero-Trust)
  const renderCurrentRoute = () => {
    // 0. Public Citizen Sign Up route
    if (currentPath === '/signup') {
      return <SignUpPage />;
    }

    // 1. Unauthenticated users can only see /login
    if (!isAuthenticated || currentPath === '/login') {
      return <LoginPage />;
    }

    // 2. Explicit 403 route
    if (currentPath === '/403') {
      return <AccessDeniedPage />;
    }

    // 3. Strict Permission Guard Check before rendering any content
    if (!canAccessRoute(currentRole, currentPath)) {
      return <AccessDeniedPage />;
    }

    // 4. Render strictly isolated role experience
    if (currentPath.startsWith('/user')) {
      return <CitizenPortal />;
    }
    if (currentPath.startsWith('/hospital')) {
      return <HospitalPortal />;
    }
    if (currentPath.startsWith('/operator')) {
      return <OperatorPortal />;
    }
    if (currentPath.startsWith('/driver')) {
      return <AmbulancePortal />;
    }
    if (currentPath.startsWith('/government')) {
      return <GovernmentPortal />;
    }
    if (currentPath.startsWith('/admin')) {
      return <AdminPortal />;
    }

    // Default fallback to 403
    return <AccessDeniedPage />;
  };

  const isDriverRoute = isAuthenticated && currentRole === 'AMBULANCE_DRIVER' && currentPath.startsWith('/driver');

  if (isDriverRoute) {
    return (
      <div className="w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
        {renderCurrentRoute()}
        {mfaPendingUser && <MfaModal />}
        {firstLoginPendingUser && <FirstLoginModal />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between font-sans text-slate-800">
      <div>
        {/* Top Navbar with Authenticated User Menu (No role switching) */}
        <Navbar />

        {/* Dynamic Role-Guarded Route View */}
        <main className="pb-12">
          {renderCurrentRoute()}
        </main>
      </div>

      {/* MFA Challenge Modal (Active during admin authentication) */}
      {mfaPendingUser && <MfaModal />}

      {/* First-Login Forced Reset & Compliance Modal */}
      {firstLoginPendingUser && <FirstLoginModal />}

      {/* Global Enterprise Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Activity className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-slate-800">MedMesh v1.0</span>
            <span>– Enterprise Healthcare Capacity Exchange</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-slate-400">
            <span>Zero-Trust RBAC Guards</span>
            <span>•</span>
            <span>Role-Isolated Experiences</span>
            <span>•</span>
            <span className="text-emerald-600 font-semibold flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              SLA 99.98% High Availability
            </span>
          </div>
        </div>
      </footer>

      {/* Global Real-Time Event Telemetry Status Bar & Event Stream Drawer */}
      <RealtimeStatusBar />
    </div>
  );
};
