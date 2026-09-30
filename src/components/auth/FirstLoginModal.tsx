import React, { useState } from 'react';
import {
  ShieldAlert,
  Lock,
  KeyRound,
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Smartphone
} from 'lucide-react';
import { useMedMesh } from '../../store/useMedMeshStore';

export const FirstLoginModal: React.FC = () => {
  const { firstLoginPendingUser, completeFirstLogin, logout } = useMedMesh();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Force Password Change
  const [currentTempPass, setCurrentTempPass] = useState(firstLoginPendingUser?.temporaryPassword || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);

  // Step 2: Mandatory MFA Setup
  const [mfaSecret] = useState('JBSWY3DPEHPK3PXP');
  const [mfaCode, setMfaCode] = useState('');

  // Step 3: Terms Acceptance
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!firstLoginPendingUser) return null;

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirm password do not match.');
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!/^\d{6}$/.test(mfaCode.trim())) {
      setErrorMessage('Please enter a valid 6-digit TOTP code.');
      return;
    }
    setStep(3);
  };

  const handleFinalSubmit = () => {
    if (!acceptedTerms) {
      setErrorMessage('You must accept the statutory healthcare confidentiality terms to proceed.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      const res = completeFirstLogin(newPassword, mfaCode);
      setIsSubmitting(false);
      if (!res.success && res.error) {
        setErrorMessage(res.error);
      }
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">First-Time Login Security Setup</h3>
              <p className="text-[11px] text-slate-500">Role: [{firstLoginPendingUser.role}] • {firstLoginPendingUser.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
          >
            Cancel
          </button>
        </div>

        {/* Multi-Step Indicator (Requirement: Temporary Password -> Force Password Change -> Enable MFA -> Accept Terms -> Access Dashboard) */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
          <div className={`p-2 rounded-xl border ${step === 1 ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-400'}`}>
            1. Password
          </div>
          <div className={`p-2 rounded-xl border ${step === 2 ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-400'}`}>
            2. MFA Setup
          </div>
          <div className={`p-2 rounded-xl border ${step === 3 ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-400'}`}>
            3. NDA Terms
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Step 1: Force Password Change */}
        {step === 1 && (
          <form onSubmit={handleNextStep1} className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900">
              Your account was created by a Platform Administrator with a temporary password. You must establish a permanent strong password before gaining access.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Temporary Password</label>
              <input
                type="text"
                value={currentTempPass}
                readOnly
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">New Permanent Password *</label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters (Uppercase, lowercase, digit)"
                  className="w-full px-3 py-2 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-2.5 text-slate-400"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password *</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition shadow-md shadow-blue-600/20"
            >
              Next: Configure Two-Factor Authentication →
            </button>
          </form>
        )}

        {/* Step 2: Enable Mandatory MFA */}
        {step === 2 && (
          <form onSubmit={handleNextStep2} className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl text-xs text-purple-900 space-y-1">
              <div className="font-bold flex items-center space-x-1.5">
                <Smartphone className="w-4 h-4 text-purple-600" />
                <span>Mandatory MFA for Institutional Roles</span>
              </div>
              <p className="text-[11px] text-purple-800">
                All operational and administrative personnel must bind a TOTP Authenticator (Google Authenticator, Microsoft Authenticator, or Duo).
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-700">Simulated TOTP Secret Key:</div>
                <div className="font-mono text-xs text-purple-700 font-extrabold">{mfaSecret}</div>
              </div>
              <button
                type="button"
                onClick={() => setMfaCode('123456')}
                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-mono text-[10px] rounded-lg font-bold shadow-sm"
              >
                Auto-fill: 123456
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Enter 6-Digit Verification Token *</label>
              <input
                type="text"
                maxLength={6}
                required
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full text-center text-xl font-mono tracking-widest py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold"
              />
            </div>

            <div className="flex justify-between space-x-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
              >
                ← Back
              </button>
              <button
                type="submit"
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-md shadow-purple-600/20"
              >
                Next: Review & Accept Terms →
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Accept Terms & Access Dashboard */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="max-h-48 overflow-y-auto p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 space-y-2">
              <h4 className="font-bold text-slate-800 text-xs">Statutory Healthcare Data Compliance Agreement</h4>
              <p>
                As an authorized operator/administrator on MedMesh, you agree to comply with India's Digital Personal Data Protection (DPDP) Act 2023, the Ayushman Bharat Digital Mission (ABDM) standards, and statutory medical confidentiality rules.
              </p>
              <p>
                You acknowledge that all capacity adjustments, patient dispatches, and hospital updates are recorded in an immutable forensic audit ledger. Unauthorized falsification of clinical capacity is subject to penal action under the Clinical Establishments Act.
              </p>
            </div>

            <label className="flex items-start space-x-2 cursor-pointer p-2 rounded-xl bg-blue-50/50 border border-blue-100">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-700 font-medium leading-tight">
                I hereby certify that I am the authorized institutional personnel and accept all operational terms and clinical non-disclosure agreements.
              </span>
            </label>

            <div className="flex justify-between space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={!acceptedTerms || isSubmitting}
                onClick={handleFinalSubmit}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-md shadow-emerald-600/30 transition flex items-center justify-center space-x-1.5"
              >
                {isSubmitting ? <span>Finalizing Setup...</span> : <ShieldCheck className="w-4 h-4" />}
                <span>Accept Terms & Enter Dashboard</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
