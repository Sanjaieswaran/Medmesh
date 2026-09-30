import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Smartphone
} from 'lucide-react';
import { useMedMesh } from '../../store/useMedMeshStore';

export const MfaModal: React.FC = () => {
  const {
    mfaPendingUser,
    verifyMfa,
    logout
  } = useMedMesh();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!mfaPendingUser) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    setTimeout(() => {
      const result = verifyMfa(code);
      setIsVerifying(false);
      if (!result.success && result.error) {
        setError(result.error);
      }
    }, 400);
  };

  const handleQuickFillCode = () => {
    setCode('123456');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto shadow-md shadow-purple-500/10">
            <KeyRound className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-black text-slate-900">
            Two-Factor Authentication (MFA)
          </h3>
          <p className="text-xs text-slate-500">
            Administrative role <strong>[{mfaPendingUser.role}]</strong> requires secondary TOTP hardware/app verification.
          </p>
        </div>

        {/* Demo Helper Banner */}
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3 text-xs text-purple-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <span>Simulated Authenticator Token:</span>
          </div>
          <button
            type="button"
            onClick={handleQuickFillCode}
            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-mono font-bold rounded-lg text-[11px] shadow-sm transition"
          >
            Auto-fill 123456
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-center">
              Enter 6-Digit Authenticator Code
            </label>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              autoFocus
              className="w-full text-center text-2xl font-mono tracking-widest py-3 px-4 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white font-bold text-purple-900"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={logout}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel Login
            </button>

            <button
              type="submit"
              disabled={isVerifying || code.length !== 6}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition flex items-center space-x-1.5"
            >
              {isVerifying ? <span>Verifying...</span> : <ShieldCheck className="w-4 h-4" />}
              <span>Verify & Access Console</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
