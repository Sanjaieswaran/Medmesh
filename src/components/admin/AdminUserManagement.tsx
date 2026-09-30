import React, { useState } from 'react';
import {
  Users,
  Building2,
  Ambulance,
  PhoneCall,
  Landmark,
  ShieldCheck,
  UserX,
  UserCheck,
  KeyRound,
  LogOut,
  Plus,
  Search,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  ShieldAlert,
  Calendar,
  Lock,
  Smartphone,
  Info
} from 'lucide-react';
import { useMedMesh } from '../../store/useMedMeshStore';
import {
  User,
  UserRole,
  AdminCreateHospitalPayload,
  AdminCreateDriverPayload,
  AdminCreateGovtPayload,
  AdminCreateOperatorPayload
} from '../../types';

type UserTab = 'CITIZENS' | 'HOSPITALS' | 'DRIVERS' | 'OPERATORS' | 'GOVT' | 'ADMINS';

export const AdminUserManagement: React.FC = () => {
  const {
    users,
    adminCreateHospital,
    adminCreateDriver,
    adminCreateGovt,
    adminCreateOperator,
    adminSuspendUser,
    adminActivateUser,
    adminResetUserPassword,
    adminForceLogout
  } = useMedMesh();

  const [activeTab, setActiveTab] = useState<UserTab>('CITIZENS');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  // Modals for Provisioning
  const [showHospitalModal, setShowHospitalModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showGovtModal, setShowGovtModal] = useState(false);
  const [showOperatorModal, setShowOperatorModal] = useState(false);

  // Credential Revelation Modal
  const [createdCredential, setCreatedCredential] = useState<{
    roleName: string;
    username: string;
    tempPassword?: string;
    emailOrIdentifier: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Suspension Reason Prompt Modal
  const [suspensionTarget, setSuspensionTarget] = useState<User | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('Administrative compliance review');

  // Reset Password Notification Modal
  const [resetResult, setResetResult] = useState<{ user: User; tempPass: string } | null>(null);

  // --- Hospital Form State ---
  const [hospForm, setHospForm] = useState<AdminCreateHospitalPayload>({
    hospitalName: '',
    hospitalCode: '',
    hospitalEmail: '',
    contactNumber: '',
    address: '',
    licenseNumber: '',
    initialBeds: 50,
    initialIcu: 12,
    initialVentilators: 6
  });

  // --- Driver Form State ---
  const [driverForm, setDriverForm] = useState<AdminCreateDriverPayload>({
    driverName: '',
    driverId: '',
    licenseNumber: '',
    ambulanceNumber: '',
    contactNumber: '',
    operatorType: '108 Emergency (EMRI)',
    vehicleType: 'Advanced Life Support (ALS)'
  });

  // --- Govt Form State ---
  const [govtForm, setGovtForm] = useState<AdminCreateGovtPayload>({
    officerName: '',
    department: 'Directorate of Medical and Rural Health Services (DMS)',
    designation: 'District Medical Officer (DMO)',
    officialEmail: '',
    contactNumber: ''
  });

  // --- Operator Form State ---
  const [operatorForm, setOperatorForm] = useState<AdminCreateOperatorPayload>({
    operatorName: '',
    controlRoom: '108 State Central Triage CAD',
    employeeId: '',
    officialEmail: '',
    stationDesk: 'Desk 04 - Priority Dispatch'
  });

  // Filter users by role tab
  const getRoleForTab = (tab: UserTab): UserRole => {
    switch (tab) {
      case 'CITIZENS': return 'USER';
      case 'HOSPITALS': return 'HOSPITAL_ADMIN';
      case 'DRIVERS': return 'AMBULANCE_DRIVER';
      case 'OPERATORS': return 'OPERATOR_108';
      case 'GOVT': return 'GOVERNMENT_OFFICIAL';
      case 'ADMINS': return 'PLATFORM_ADMIN';
    }
  };

  const currentTabRole = getRoleForTab(activeTab);

  const filteredUsers = users.filter(u => {
    if (u.role !== currentTabRole) return false;
    if (filterStatus === 'ACTIVE' && u.isSuspended) return false;
    if (filterStatus === 'SUSPENDED' && !u.isSuspended) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.mobileNumber && u.mobileNumber.includes(q))
    );
  });

  // Action handlers
  const handleCopyCredentials = () => {
    if (!createdCredential) return;
    const text = `MedMesh Institutional Credentials:
Username: ${createdCredential.username}
Temporary Password: ${createdCredential.tempPassword}
Identifier: ${createdCredential.emailOrIdentifier}
Role: ${createdCredential.roleName}
Portal Login: https://medmesh.health.gov.in/login

NOTE: You will be required to change your password and configure 2FA on initial sign-in.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateHospitalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = adminCreateHospital(hospForm);
    setShowHospitalModal(false);
    setCreatedCredential({
      roleName: 'Hospital Administrator',
      username: res.username,
      tempPassword: res.tempPassword,
      emailOrIdentifier: hospForm.hospitalEmail
    });
    setHospForm({
      hospitalName: '',
      hospitalCode: '',
      hospitalEmail: '',
      contactNumber: '',
      address: '',
      licenseNumber: '',
      initialBeds: 50,
      initialIcu: 12,
      initialVentilators: 6
    });
  };

  const handleCreateDriverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = adminCreateDriver(driverForm);
    setShowDriverModal(false);
    setCreatedCredential({
      roleName: 'Ambulance Emergency Driver',
      username: res.username,
      tempPassword: res.tempPassword,
      emailOrIdentifier: `${driverForm.driverName} (${driverForm.ambulanceNumber})`
    });
    setDriverForm({
      driverName: '',
      driverId: '',
      licenseNumber: '',
      ambulanceNumber: '',
      contactNumber: '',
      operatorType: '108 Emergency (EMRI)',
      vehicleType: 'Advanced Life Support (ALS)'
    });
  };

  const handleCreateGovtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = adminCreateGovt(govtForm);
    setShowGovtModal(false);
    setCreatedCredential({
      roleName: 'Government Health Official',
      username: res.username,
      tempPassword: res.tempPassword,
      emailOrIdentifier: govtForm.officialEmail
    });
    setGovtForm({
      officerName: '',
      department: 'Directorate of Medical and Rural Health Services (DMS)',
      designation: 'District Medical Officer (DMO)',
      officialEmail: '',
      contactNumber: ''
    });
  };

  const handleCreateOperatorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = adminCreateOperator(operatorForm);
    setShowOperatorModal(false);
    setCreatedCredential({
      roleName: '108 CAD Emergency Operator',
      username: res.username,
      tempPassword: res.tempPassword,
      emailOrIdentifier: operatorForm.officialEmail
    });
    setOperatorForm({
      operatorName: '',
      controlRoom: '108 State Central Triage CAD',
      employeeId: '',
      officialEmail: '',
      stationDesk: 'Desk 04 - Priority Dispatch'
    });
  };

  const handleTriggerSuspend = (user: User) => {
    setSuspensionTarget(user);
    setSuspensionReason('Administrative compliance review');
  };

  const handleConfirmSuspend = () => {
    if (!suspensionTarget) return;
    adminSuspendUser(suspensionTarget.id, suspensionReason);
    setSuspensionTarget(null);
  };

  const handleResetPassword = (user: User) => {
    const temp = adminResetUserPassword(user.id);
    setResetResult({ user, tempPass: temp });
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-black text-slate-900">User Access & Identity Governance</h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">
              STRICT RBAC POLICY
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Role-isolated account provisioning, suspension, credential rotation, and session invalidation.
          </p>
        </div>

        {/* Action Button depending on current active tab */}
        <div>
          {activeTab === 'CITIZENS' && (
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>Citizens self-register via public <strong className="text-slate-800">/signup</strong>. Self-registration restricted for all other roles.</span>
            </div>
          )}

          {activeTab === 'HOSPITALS' && (
            <button
              onClick={() => setShowHospitalModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition shadow-md shadow-blue-600/20 flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Provision Hospital Admin</span>
            </button>
          )}

          {activeTab === 'DRIVERS' && (
            <button
              onClick={() => setShowDriverModal(true)}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold transition shadow-md shadow-amber-600/20 flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Provision Ambulance Driver</span>
            </button>
          )}

          {activeTab === 'OPERATORS' && (
            <button
              onClick={() => setShowOperatorModal(true)}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold transition shadow-md shadow-red-600/20 flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Provision 108 CAD Operator</span>
            </button>
          )}

          {activeTab === 'GOVT' && (
            <button
              onClick={() => setShowGovtModal(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition shadow-md shadow-emerald-600/20 flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Provision Health Official</span>
            </button>
          )}

          {activeTab === 'ADMINS' && (
            <div className="flex items-center space-x-1.5 text-xs text-purple-700 bg-purple-50 px-3 py-2 rounded-xl border border-purple-200 font-bold">
              <ShieldCheck className="w-4 h-4 text-purple-600 flex-shrink-0" />
              <span>Root Superadmin cluster accounts are locked by enterprise DevOps key vault.</span>
            </div>
          )}
        </div>
      </div>

      {/* 6 Category Tabs (Requirement: Citizens, Hospitals, Drivers, Operators, Government Officials, Platform Admins) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <button
          onClick={() => setActiveTab('CITIZENS')}
          className={`p-3 rounded-2xl border text-left transition flex items-center space-x-2.5 ${
            activeTab === 'CITIZENS'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
          }`}
        >
          <Users className="w-4 h-4 flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-extrabold text-xs truncate">Citizens</div>
            <div className={`text-[10px] ${activeTab === 'CITIZENS' ? 'text-blue-100' : 'text-slate-400'}`}>
              {users.filter(u => u.role === 'USER').length} Registered
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('HOSPITALS')}
          className={`p-3 rounded-2xl border text-left transition flex items-center space-x-2.5 ${
            activeTab === 'HOSPITALS'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
          }`}
        >
          <Building2 className="w-4 h-4 flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-extrabold text-xs truncate">Hospitals</div>
            <div className={`text-[10px] ${activeTab === 'HOSPITALS' ? 'text-blue-100' : 'text-slate-400'}`}>
              {users.filter(u => u.role === 'HOSPITAL_ADMIN').length} Admins
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('DRIVERS')}
          className={`p-3 rounded-2xl border text-left transition flex items-center space-x-2.5 ${
            activeTab === 'DRIVERS'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
          }`}
        >
          <Ambulance className="w-4 h-4 flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-extrabold text-xs truncate">Ambulances</div>
            <div className={`text-[10px] ${activeTab === 'DRIVERS' ? 'text-blue-100' : 'text-slate-400'}`}>
              {users.filter(u => u.role === 'AMBULANCE_DRIVER').length} Drivers
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('OPERATORS')}
          className={`p-3 rounded-2xl border text-left transition flex items-center space-x-2.5 ${
            activeTab === 'OPERATORS'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
          }`}
        >
          <PhoneCall className="w-4 h-4 flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-extrabold text-xs truncate">108 CAD</div>
            <div className={`text-[10px] ${activeTab === 'OPERATORS' ? 'text-blue-100' : 'text-slate-400'}`}>
              {users.filter(u => u.role === 'OPERATOR_108').length} Dispatchers
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('GOVT')}
          className={`p-3 rounded-2xl border text-left transition flex items-center space-x-2.5 ${
            activeTab === 'GOVT'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
          }`}
        >
          <Landmark className="w-4 h-4 flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-extrabold text-xs truncate">Government</div>
            <div className={`text-[10px] ${activeTab === 'GOVT' ? 'text-blue-100' : 'text-slate-400'}`}>
              {users.filter(u => u.role === 'GOVERNMENT_OFFICIAL').length} Officials
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('ADMINS')}
          className={`p-3 rounded-2xl border text-left transition flex items-center space-x-2.5 ${
            activeTab === 'ADMINS'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
          }`}
        >
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-extrabold text-xs truncate">Superadmins</div>
            <div className={`text-[10px] ${activeTab === 'ADMINS' ? 'text-blue-100' : 'text-slate-400'}`}>
              {users.filter(u => u.role === 'PLATFORM_ADMIN').length} Superusers
            </div>
          </div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab.toLowerCase()} by name, username, email...`}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center space-x-1 text-xs">
            <span className="text-slate-400 font-semibold mr-1">Status:</span>
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                filterStatus === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('ACTIVE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                filterStatus === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterStatus('SUSPENDED')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                filterStatus === 'SUSPENDED' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Suspended
            </button>
          </div>

          <span className="text-xs text-slate-400">
            {filteredUsers.length} records
          </span>
        </div>
      </div>

      {/* Users Data Table with Full Lifecycle Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">User / Identity</th>
                <th className="px-5 py-3.5">Role & Category</th>
                <th className="px-5 py-3.5">Account Status</th>
                <th className="px-5 py-3.5">Security / 2FA</th>
                <th className="px-5 py-3.5">Created</th>
                <th className="px-5 py-3.5 text-right">Lifecycle Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    No users matching criteria found in this role partition.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-3">
                        <img
                          src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                          alt={user.name}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                        />
                        <div>
                          <div className="font-extrabold text-slate-900 flex items-center space-x-1.5">
                            <span>{user.name}</span>
                            {user.isCitizenSelfRegistered && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-50 text-blue-600 font-bold">
                                Public Signup
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            @{user.username} • {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                        {user.role}
                      </span>
                      {user.title && (
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[200px]">
                          {user.title}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      {user.isSuspended ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">
                          <UserX className="w-3 h-3 mr-1" />
                          SUSPENDED
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          ACTIVE
                        </span>
                      )}
                      {user.suspensionReason && (
                        <div className="text-[10px] text-rose-600 mt-0.5 max-w-[150px] truncate">
                          Reason: {user.suspensionReason}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1">
                          {user.mfaEnabled ? (
                            <span className="text-[10px] text-purple-700 font-bold flex items-center">
                              <Smartphone className="w-3 h-3 mr-0.5 text-purple-600" />
                              2FA Enforced
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              No MFA
                            </span>
                          )}
                        </div>
                        {user.mustChangePassword && (
                          <div className="text-[9px] text-amber-600 font-bold">
                            Pending First Login Reset
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                      {user.createdAt || 'System Seed'}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      {user.role === 'PLATFORM_ADMIN' ? (
                        <span className="text-[10px] text-slate-400 font-semibold italic">
                          Protected Root
                        </span>
                      ) : (
                        <div className="flex items-center justify-end space-x-1">
                          {/* Suspend / Activate Toggle */}
                          {user.isSuspended ? (
                            <button
                              onClick={() => adminActivateUser(user.id)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold text-[11px] transition flex items-center space-x-1"
                              title="Re-activate suspended account"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Activate</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleTriggerSuspend(user)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] transition flex items-center space-x-1"
                              title="Suspend account access"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Suspend</span>
                            </button>
                          )}

                          {/* Reset Password */}
                          <button
                            onClick={() => handleResetPassword(user)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] transition flex items-center space-x-1"
                            title="Generate new temporary password and force reset on login"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                            <span>Reset</span>
                          </button>

                          {/* Force Logout */}
                          <button
                            onClick={() => adminForceLogout(user.id)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] transition flex items-center space-x-1"
                            title="Invalidate all active JWT tokens and sessions"
                          >
                            <LogOut className="w-3.5 h-3.5 text-purple-600" />
                            <span>Logout</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODAL: PROVISION HOSPITAL ADMIN
         ========================================================================= */}
      {showHospitalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Provision Hospital Facility</h3>
                  <p className="text-[11px] text-slate-500">Creates institutional node & administrator login</p>
                </div>
              </div>
              <button
                onClick={() => setShowHospitalModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateHospitalSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hospital Name *</label>
                <input
                  type="text"
                  required
                  value={hospForm.hospitalName}
                  onChange={(e) => setHospForm({ ...hospForm, hospitalName: e.target.value })}
                  placeholder="e.g. Fortis Malar Hospital"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hospital Code *</label>
                  <input
                    type="text"
                    required
                    value={hospForm.hospitalCode}
                    onChange={(e) => setHospForm({ ...hospForm, hospitalCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. FOR01"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">NABH / State License *</label>
                  <input
                    type="text"
                    required
                    value={hospForm.licenseNumber}
                    onChange={(e) => setHospForm({ ...hospForm, licenseNumber: e.target.value })}
                    placeholder="e.g. CEA-TN-2024-8841"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Administrator Email *</label>
                  <input
                    type="email"
                    required
                    value={hospForm.hospitalEmail}
                    onChange={(e) => setHospForm({ ...hospForm, hospitalEmail: e.target.value })}
                    placeholder="superintendent@fortis.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Official Contact (+91) *</label>
                  <input
                    type="tel"
                    required
                    value={hospForm.contactNumber}
                    onChange={(e) => setHospForm({ ...hospForm, contactNumber: e.target.value })}
                    placeholder="044-24914023"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Physical Address *</label>
                <input
                  type="text"
                  required
                  value={hospForm.address}
                  onChange={(e) => setHospForm({ ...hospForm, address: e.target.value })}
                  placeholder="52, 1st Main Rd, Gandhi Nagar, Adyar, Chennai, TN"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-800">Licensed Baseline Capacity</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Total Beds</label>
                    <input
                      type="number"
                      min={1}
                      value={hospForm.initialBeds}
                      onChange={(e) => setHospForm({ ...hospForm, initialBeds: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Total ICU</label>
                    <input
                      type="number"
                      min={0}
                      value={hospForm.initialIcu}
                      onChange={(e) => setHospForm({ ...hospForm, initialIcu: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Ventilators</label>
                    <input
                      type="number"
                      min={0}
                      value={hospForm.initialVentilators}
                      onChange={(e) => setHospForm({ ...hospForm, initialVentilators: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-blue-50 rounded-xl text-[11px] text-blue-800 flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>Account will be issued with a temporary password and must complete mandatory MFA on initial sign-in.</span>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHospitalModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold shadow-md shadow-blue-600/20"
                >
                  Create & Issue Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: PROVISION AMBULANCE DRIVER
         ========================================================================= */}
      {showDriverModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                  <Ambulance className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Provision Ambulance Driver</h3>
                  <p className="text-[11px] text-slate-500">Fleet telemetry credentials & emergency vehicle pairing</p>
                </div>
              </div>
              <button
                onClick={() => setShowDriverModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateDriverSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Driver Full Name *</label>
                <input
                  type="text"
                  required
                  value={driverForm.driverName}
                  onChange={(e) => setDriverForm({ ...driverForm, driverName: e.target.value })}
                  placeholder="e.g. Senthil Nathan"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Driver ID / Badge No *</label>
                  <input
                    type="text"
                    required
                    value={driverForm.driverId}
                    onChange={(e) => setDriverForm({ ...driverForm, driverId: e.target.value })}
                    placeholder="e.g. DRV-108-984"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Commercial Driver License *</label>
                  <input
                    type="text"
                    required
                    value={driverForm.licenseNumber}
                    onChange={(e) => setDriverForm({ ...driverForm, licenseNumber: e.target.value })}
                    placeholder="TN-02-20180004921"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vehicle Plate Number *</label>
                  <input
                    type="text"
                    required
                    value={driverForm.ambulanceNumber}
                    onChange={(e) => setDriverForm({ ...driverForm, ambulanceNumber: e.target.value.toUpperCase() })}
                    placeholder="TN-09-G-1108"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Emergency Mobile (+91) *</label>
                  <input
                    type="tel"
                    required
                    value={driverForm.contactNumber}
                    onChange={(e) => setDriverForm({ ...driverForm, contactNumber: e.target.value })}
                    placeholder="9840123999"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Operator Fleet *</label>
                  <select
                    value={driverForm.operatorType}
                    onChange={(e) => setDriverForm({ ...driverForm, operatorType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option>108 Emergency (EMRI)</option>
                    <option>State Health Transport</option>
                    <option>Apollo Fleet</option>
                    <option>RedCross</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vehicle Specification *</label>
                  <select
                    value={driverForm.vehicleType}
                    onChange={(e) => setDriverForm({ ...driverForm, vehicleType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option>Advanced Life Support (ALS)</option>
                    <option>Basic Life Support (BLS)</option>
                    <option>Patient Transport</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDriverModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-extrabold shadow-md shadow-amber-600/20"
                >
                  Provision Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: PROVISION 108 OPERATOR
         ========================================================================= */}
      {showOperatorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Provision 108 CAD Operator</h3>
                  <p className="text-[11px] text-slate-500">Emergency dispatch console credentialing</p>
                </div>
              </div>
              <button
                onClick={() => setShowOperatorModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateOperatorSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Operator Full Name *</label>
                <input
                  type="text"
                  required
                  value={operatorForm.operatorName}
                  onChange={(e) => setOperatorForm({ ...operatorForm, operatorName: e.target.value })}
                  placeholder="e.g. Radhika Sundaram"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Operator Employee ID *</label>
                  <input
                    type="text"
                    required
                    value={operatorForm.employeeId}
                    onChange={(e) => setOperatorForm({ ...operatorForm, employeeId: e.target.value })}
                    placeholder="EMRI-OP-4421"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={operatorForm.officialEmail}
                    onChange={(e) => setOperatorForm({ ...operatorForm, officialEmail: e.target.value })}
                    placeholder="radhika.op@108cad.gov.in"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Control Room Facility *</label>
                  <input
                    type="text"
                    required
                    value={operatorForm.controlRoom}
                    onChange={(e) => setOperatorForm({ ...operatorForm, controlRoom: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigned Station Desk *</label>
                  <input
                    type="text"
                    required
                    value={operatorForm.stationDesk}
                    onChange={(e) => setOperatorForm({ ...operatorForm, stationDesk: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOperatorModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-extrabold shadow-md shadow-red-600/20"
                >
                  Provision CAD Operator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: PROVISION GOVERNMENT OFFICIAL
         ========================================================================= */}
      {showGovtModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Provision Government Official</h3>
                  <p className="text-[11px] text-slate-500">Public health oversight and surge executive credentials</p>
                </div>
              </div>
              <button
                onClick={() => setShowGovtModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateGovtSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Officer Legal Name *</label>
                <input
                  type="text"
                  required
                  value={govtForm.officerName}
                  onChange={(e) => setGovtForm({ ...govtForm, officerName: e.target.value })}
                  placeholder="e.g. Dr. P. Senthilkumar, IAS"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Government Department *</label>
                  <input
                    type="text"
                    required
                    value={govtForm.department}
                    onChange={(e) => setGovtForm({ ...govtForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Official Designation *</label>
                  <input
                    type="text"
                    required
                    value={govtForm.designation}
                    onChange={(e) => setGovtForm({ ...govtForm, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Government Email (.gov.in / .nic.in) *</label>
                  <input
                    type="email"
                    required
                    value={govtForm.officialEmail}
                    onChange={(e) => setGovtForm({ ...govtForm, officialEmail: e.target.value })}
                    placeholder="healthsec@tn.gov.in"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Official Mobile (+91) *</label>
                  <input
                    type="tel"
                    required
                    value={govtForm.contactNumber}
                    onChange={(e) => setGovtForm({ ...govtForm, contactNumber: e.target.value })}
                    placeholder="9444012345"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGovtModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold shadow-md shadow-emerald-600/20"
                >
                  Provision Health Official
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CREDENTIALS GENERATED / TEMPORARY PASSWORD DISPLAY
         ========================================================================= */}
      {createdCredential && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 border-2 border-emerald-500">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Credentials Provisioned</h3>
                <p className="text-xs text-slate-500">{createdCredential.roleName}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Username:</span>
                <span className="font-mono font-bold text-slate-900">{createdCredential.username}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Temporary Password:</span>
                <span className="font-mono font-extrabold text-blue-600 text-sm">{createdCredential.tempPassword}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Target Entity:</span>
                <span className="font-medium text-slate-800">{createdCredential.emailOrIdentifier}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
              <div className="font-bold flex items-center space-x-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>First-Login Security Policy Enforced</span>
              </div>
              <p>
                This institutional user will be redirected through the mandatory 3-step security verification (Password change → TOTP MFA registration → Statutory compliance terms acceptance) prior to accessing any operational portal.
              </p>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={handleCopyCredentials}
                className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
              </button>
              <button
                onClick={() => setCreatedCredential(null)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: SUSPENSION REASON PROMPT
         ========================================================================= */}
      {suspensionTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3 text-rose-600">
              <UserX className="w-6 h-6 flex-shrink-0" />
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Suspend Account Access</h3>
                <p className="text-xs text-slate-500">{suspensionTarget.name} ({suspensionTarget.email})</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                Suspending this user will immediately revoke all active JWT sessions and prevent future authentication attempts. An immutable entry will be recorded in the audit ledger.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Suspension *</label>
                <select
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option>Administrative compliance review</option>
                  <option>Suspicious login activity / brute force detection</option>
                  <option>Clinical Establishment License expired or revoked</option>
                  <option>Breach of patient confidentiality or data tampering</option>
                  <option>Separation of employment / staff decommission</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setSuspensionTarget(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSuspend}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-rose-600/20"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: RESET PASSWORD NOTIFICATION
         ========================================================================= */}
      {resetResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3 text-amber-600">
              <KeyRound className="w-6 h-6 flex-shrink-0" />
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Password Reset Generated</h3>
                <p className="text-xs text-slate-500">{resetResult.user.name}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="font-mono text-slate-800">{resetResult.user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">New Temporary Password:</span>
                <span className="font-mono font-extrabold text-blue-600 text-sm">{resetResult.tempPass}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              The user has been flagged with <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">mustChangePassword = true</code>. When they next log in, they will be required to configure a new password before gaining access.
            </p>

            <div className="flex justify-end">
              <button
                onClick={() => setResetResult(null)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
