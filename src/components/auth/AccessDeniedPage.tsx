import React from 'react';
import {
  ShieldAlert,
  Lock,
  ArrowLeft,
  LayoutDashboard
} from 'lucide-react';
import { useMedMesh, ROLE_ROUTE_MAP } from '../../store/useMedMeshStore';

export const AccessDeniedPage: React.FC = () => {
  const {
    currentRole,
    navigate
  } = useMedMesh();

  const authorizedDashboard = ROLE_ROUTE_MAP[currentRole] || '/user/dashboard';

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate(authorizedDashboard);
    }
  };

  return (
    <div className="min-h-[85vh] bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-10 text-center space-y-6 animate-in fade-in zoom-in-95">
        {/* Security Shield Icon */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-rose-50 border-2 border-rose-200 text-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/10">
          <ShieldAlert className="w-10 h-10 animate-pulse stroke-[2.5]" />
          <div className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow">
            <Lock className="w-4 h-4" />
          </div>
        </div>

        {/* Title & Message (Exact Requirement) */}
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 tracking-wider uppercase">
            HTTP 403 • FORBIDDEN
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Access Denied
          </h1>
          <p className="text-sm text-slate-600 max-w-sm mx-auto font-medium">
            You do not have permission to access this resource.
          </p>
        </div>

        {/* Context Information Box */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 text-left space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Authenticated Role:</span>
            <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              [{currentRole}]
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Security Policy:</span>
            <span className="text-slate-700 font-semibold">Zero-Trust Role Boundary Enforcement</span>
          </div>
        </div>

        {/* Action Buttons (Requirement: Go Back & Return to Dashboard) */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleGoBack}
            className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-3 rounded-xl text-xs sm:text-sm transition flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>

          <button
            onClick={() => navigate(authorizedDashboard)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-3 rounded-xl text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center space-x-2 active:scale-95"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
