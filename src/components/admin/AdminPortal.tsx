import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Ambulance as AmbulanceIcon,
  Users,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Activity,
  History,
  Server,
  Settings,
  Shield,
  FileCheck,
  Search,
  Filter
} from 'lucide-react';
import { useMedMesh } from '../../store/useMedMeshStore';
import { Hospital, UserRole } from '../../types';
import { AdminUserManagement } from './AdminUserManagement';

export const AdminPortal: React.FC = () => {
  const {
    users,
    hospitals,
    ambulances,
    auditLogs,
    verifyHospital
  } = useMedMesh();

  // Admin sub-views: 'dashboard' | 'users' | 'verification' | 'logs' | 'monitoring'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'verification' | 'logs' | 'monitoring'>('dashboard');
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // Platform metrics (Wireframe 6.1)
  const totalUsersCount = '1,284';
  const totalHospitalsCount = '324';
  const totalAmbulancesCount = '186';
  const totalIncidentsCount = '48';

  const pendingHospitals = hospitals.filter(h => h.verificationStatus === 'pending');

  const filteredLogs = auditLogs.filter(l => {
    if (!logSearchQuery) return true;
    const q = logSearchQuery.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.actorName.toLowerCase().includes(q) ||
      l.entity.toLowerCase().includes(q) ||
      (l.details && l.details.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Admin Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-black text-slate-900">MedMesh Central Superadmin Portal</h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800">
                  ROOT PRIVILEGES
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Network governance, facility certification & immutable audit logging
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping-slow"></span>
            <span className="font-semibold text-slate-700">Cluster Status: All Microservices Healthy</span>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex space-x-3 text-xs sm:text-sm font-bold border-b border-slate-200 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>6.1 Admin Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'users' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Access Governance</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'users' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-700'}`}>
              {users.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`px-4 py-2 rounded-xl transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'verification' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Hospital Verification Queue</span>
            {pendingHospitals.length > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px]">
                {pendingHospitals.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-xl transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'logs' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Immutable Audit Logs ({auditLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`px-4 py-2 rounded-xl transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'monitoring' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>System SLA & Telemetry</span>
          </button>
        </div>

        {/* =========================================================================
            6.1 ADMIN DASHBOARD (Wireframe 6.1)
           ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Cards Row (Wireframe 6.1) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div
                onClick={() => setActiveTab('users')}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-400 hover:shadow-md transition group"
                title="Click to manage user identities and access control"
              >
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider group-hover:text-blue-600 transition">Total Users</span>
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-3xl font-black text-slate-900">{totalUsersCount}</div>
                <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                  {users.length} Active System Accounts • Manage →
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">Hospitals</span>
                  <Building2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-3xl font-black text-emerald-600">{totalHospitalsCount}</div>
                <div className="text-[11px] text-slate-500 mt-1">100% NABH/State certified</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">Ambulances</span>
                  <AmbulanceIcon className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-3xl font-black text-amber-600">{totalAmbulancesCount}</div>
                <div className="text-[11px] text-slate-500 mt-1">108 & private ALS/BLS fleet</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">Incidents (Today)</span>
                  <Activity className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-3xl font-black text-purple-600">{totalIncidentsCount}</div>
                <div className="text-[11px] text-slate-500 mt-1">Dispatched & routed</div>
              </div>
            </div>

            {/* Recent Activity Table (Wireframe 6.1) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Recent Platform Activity</h3>
                  <p className="text-xs text-slate-500">Real-time governance events logged to tamper-proof state</p>
                </div>
                <button
                  onClick={() => setActiveTab('logs')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  View All Logs →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Time</th>
                      <th className="px-6 py-3">Action</th>
                      <th className="px-6 py-3">Entity</th>
                      <th className="px-6 py-3">Actor Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.slice(0, 6).map(log => (
                      <tr key={log.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-3.5 font-medium text-slate-500">{log.timestamp}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-900">{log.action}</td>
                        <td className="px-6 py-3.5 text-blue-600">{log.entity}</td>
                        <td className="px-6 py-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                            {log.actorRole}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* User Access Governance & Account Provisioning */}
        {activeTab === 'users' && <AdminUserManagement />}

        {/* Hospital Verification Queue */}
        {activeTab === 'verification' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">Hospital Onboarding & Certification Queue</h3>
                <p className="text-xs text-slate-500">Verify state clinical establishment licenses before granting capacity publishing rights</p>
              </div>
            </div>

            <div className="space-y-3">
              {hospitals.map(h => (
                <div
                  key={h.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start space-x-3">
                    <img src={h.image} alt={h.name} className="w-14 h-14 rounded-xl object-cover" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-base text-slate-900">{h.name}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {h.type}
                        </span>
                        {h.districtName && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            📍 {h.districtName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{h.address}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Licensed Capacity: {h.capacity.totalBeds} Beds • {h.capacity.totalIcu} ICU • {h.capacity.totalVentilators} Ventilators
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                      h.verificationStatus === 'verified' ? 'bg-emerald-100 text-emerald-800' :
                      h.verificationStatus === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {h.verificationStatus.toUpperCase()}
                    </span>

                    {h.verificationStatus !== 'verified' ? (
                      <button
                        onClick={() => verifyHospital(h.id, 'verified')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center space-x-1"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve Facility</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => verifyHospital(h.id, 'rejected')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-xl text-xs font-medium transition"
                      >
                        Revoke Access
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Immutable Audit Logs View */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="w-full sm:w-80 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  placeholder="Search logs by action, actor, or entity..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <span className="text-xs text-slate-400">
                Displaying {filteredLogs.length} verified ledger events
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Timestamp</th>
                      <th className="px-6 py-3">Action</th>
                      <th className="px-6 py-3">Entity / Target</th>
                      <th className="px-6 py-3">Actor & Role</th>
                      <th className="px-6 py-3">Technical Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-3.5 font-mono text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-900">{log.action}</td>
                        <td className="px-6 py-3.5 font-semibold text-blue-600">{log.entity}</td>
                        <td className="px-6 py-3.5">
                          <div className="font-semibold text-slate-800">{log.actorName}</div>
                          <span className="text-[10px] text-slate-400 uppercase font-mono">{log.actorRole}</span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-600 max-w-xs truncate">{log.details || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* System Monitoring & SLA */}
        {activeTab === 'monitoring' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Availability</div>
                <div className="text-3xl font-black text-emerald-600 mt-1">99.98%</div>
                <div className="text-xs text-slate-500 mt-1">SLA Target: 99.90%</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">WebSocket Gateway Latency</div>
                <div className="text-3xl font-black text-blue-600 mt-1">18 ms</div>
                <div className="text-xs text-slate-500 mt-1">Pub/Sub push speed</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Connected Telemetry Nodes</div>
                <div className="text-3xl font-black text-indigo-600 mt-1">4,120</div>
                <div className="text-xs text-slate-500 mt-1">Hospitals, 108 CAD, Ambulances</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-base text-slate-900">Active Microservices Topology</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Capacity Gateway (HL7/FHIR Adapter)</span>
                  <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">HEALTHY</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">108 CAD Smart Matching Engine</span>
                  <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">HEALTHY</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Ambulance GPS Telemetry Stream</span>
                  <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">HEALTHY</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Government Analytics Warehouse</span>
                  <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">HEALTHY</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
