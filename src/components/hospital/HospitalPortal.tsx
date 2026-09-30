import React, { useState } from 'react';
import {
  Building2,
  Bed,
  HeartPulse,
  Wind,
  Activity,
  Plus,
  Minus,
  AlertOctagon,
  Save,
  Send,
  UserCheck,
  Clock,
  CheckCircle2,
  TrendingUp,
  FileText,
  Bell,
  Settings,
  ShieldCheck,
  ChevronRight,
  LogIn,
  Radio,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { useMedMesh } from '../../store/useMedMeshStore';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { LiveTimestamp } from '../common/LiveTimestamp';
import { IncomingAmbulancesWidget } from './IncomingAmbulancesWidget';
import { CongestionLevel } from '../../types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

export const HospitalPortal: React.FC = () => {
  const {
    hospitals,
    activeHospitalId,
    setActiveHospital,
    incrementBed,
    setIcuFull,
    setVentilatorFull,
    setCongestion,
    updateCapacityFull,
    toggleDoctorDuty,
    auditLogs
  } = useMedMesh();

  const { getFlashClass, isFlashing, getFlashType } = useRealtimeSync();

  // Sidebar views: 'dashboard' | 'capacity' | 'doctors' | 'reports' | 'settings'
  const [currentView, setCurrentView] = useState<'dashboard' | 'capacity' | 'doctors' | 'reports' | 'settings'>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  // Form inputs for Capacity Management (Wireframe 2.3)
  const currentHospital = hospitals.find(h => h.id === activeHospitalId) || hospitals[0];
  const capacity = currentHospital.capacity;

  const [inputBeds, setInputBeds] = useState(capacity.availableBeds);
  const [inputIcu, setInputIcu] = useState(capacity.availableIcu);
  const [inputVents, setInputVents] = useState(capacity.availableVentilators);
  const [inputCongestion, setInputCongestion] = useState<CongestionLevel>(capacity.congestion);

  // Sync inputs when active hospital or capacity changes
  React.useEffect(() => {
    setInputBeds(capacity.availableBeds);
    setInputIcu(capacity.availableIcu);
    setInputVents(capacity.availableVentilators);
    setInputCongestion(capacity.congestion);
  }, [currentHospital.id, capacity.availableBeds, capacity.availableIcu, capacity.availableVentilators, capacity.congestion]);

  // Filter audit logs for this hospital
  const hospitalLogs = auditLogs.filter(
    l => l.entity.toLowerCase().includes(currentHospital.name.toLowerCase()) || l.entity.toLowerCase().includes(currentHospital.id)
  );

  // Mock login screen (Wireframe 2.1)
  if (!isLoggedIn) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-8 space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/30">
              <Building2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Hospital Portal</h2>
            <p className="text-xs text-slate-500 mt-1">Sign in to manage your facility's live capacity & triage</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setIsLoggedIn(true);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email / Username
              </label>
              <input
                type="email"
                defaultValue="hospital@apollo.com"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <a href="#forgot" className="text-xs text-blue-600 hover:underline">Forgot password?</a>
              </div>
              <input
                type="password"
                defaultValue="••••••••••••"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-blue-600/30 transition flex items-center justify-center space-x-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Login to Hospital Console</span>
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-xs text-slate-400">Or continue with</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              type="button"
              onClick={() => setIsLoggedIn(true)}
              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold py-2.5 px-4 rounded-xl border border-slate-200 transition text-sm flex items-center justify-center space-x-2"
            >
              <span>Google Workspace SSO</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Hospital Selector Switcher Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Logged In Facility</span>
                {currentHospital.districtName && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200/60">
                    📍 {currentHospital.districtName} Corridor
                  </span>
                )}
              </div>
              <h1 className="text-base font-extrabold text-slate-900">{currentHospital.name}</h1>
            </div>
          </div>

          <div className="flex items-center space-x-3 flex-wrap gap-2">
            <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>⚡ Live Broadcast Active (WS Synced)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 font-medium">Switch Hospital View:</span>
              <select
                value={activeHospitalId}
                onChange={(e) => setActiveHospital(e.target.value)}
                className="text-xs font-bold py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none cursor-pointer"
              >
                {hospitals.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.districtName ? `[${h.districtName}] ` : ''}{h.name} ({h.type})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Main Grid: Sidebar + Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar (Wireframe 2.2) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1">
              <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Hospital Menu
              </div>

              <button
                onClick={() => setCurrentView('dashboard')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
                  currentView === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>2.2 Dashboard</span>
              </button>

              <button
                onClick={() => setCurrentView('capacity')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
                  currentView === 'capacity'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Bed className="w-4 h-4" />
                <span>2.3 Capacity Management</span>
              </button>

              <button
                onClick={() => setCurrentView('doctors')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
                  currentView === 'doctors'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Doctor On-Duty Roster</span>
              </button>

              <button
                onClick={() => setCurrentView('reports')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
                  currentView === 'reports'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Facility Reports</span>
              </button>
            </div>

            {/* Shift Duty Status Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-sm">
              <div className="text-xs text-slate-400 uppercase tracking-wider">Signed-In Administrator</div>
              <div className="font-bold text-sm text-white mt-1">Dr. V. Reddy</div>
              <div className="text-xs text-blue-400">Chief Medical Superintendent</div>
              <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-between text-xs">
                <span className="text-slate-300">Freshness SLA:</span>
                <span className="text-emerald-400 font-bold">100% Compliant</span>
              </div>
            </div>
          </div>

          {/* Main Area */}
          <div className="lg:col-span-9 space-y-6">
            {/* =========================================================================
                2.2 HOSPITAL DASHBOARD (Wireframe 2.2)
               ========================================================================= */}
            {currentView === 'dashboard' && (
              <div className="space-y-6">
                {/* Live Telemetry Stream Banner */}
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                      <Radio className="w-5 h-5 animate-pulse text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-sm text-white">Event-Driven Telemetry Stream</span>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          WebSocket: Port 4001
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Updates broadcast instantly to 108 Emergency Dispatch CAD, EMS ambulances, and Citizen GIS.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                    <span className="text-slate-400">Telemetry Freshness:</span>
                    <LiveTimestamp timestamp={capacity.updatedAt} />
                  </div>
                </div>

                {/* Critical diversion alert if full */}
                {(capacity.availableBeds === 0 || capacity.availableIcu === 0 || capacity.congestion === 'Critical') && (
                  <div className="bg-red-600 text-white p-3.5 rounded-2xl flex items-center justify-between shadow-lg shadow-red-600/30 animate-pulse-critical-red">
                    <div className="flex items-center space-x-2.5">
                      <AlertTriangle className="w-5 h-5 text-amber-300 flex-shrink-0" />
                      <div>
                        <div className="font-black text-sm uppercase tracking-wider">CRITICAL DIVERSION STATUS ACTIVE</div>
                        <div className="text-xs text-red-100">Zero vacancies in vital units or critical triage queue. 108 CAD dispatcher is currently re-routing incoming EMS transports.</div>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-white/20 rounded-xl text-xs font-black uppercase whitespace-nowrap ml-2">Diverting</span>
                  </div>
                )}

                {/* Incoming Ambulances Triage Widget */}
                <IncomingAmbulancesWidget hospital={currentHospital} />

                {/* KPI Cards Row (Wireframe 2.2) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className={`bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm transition-all ${getFlashClass(currentHospital.id)}`}>
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider">Available Beds</span>
                      <Bed className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className={`text-2xl sm:text-3xl font-black ${capacity.availableBeds === 0 ? 'text-red-600' : 'text-blue-600'}`}>
                      {capacity.availableBeds} <span className="text-xs font-normal text-slate-400">/ {capacity.totalBeds}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {capacity.occupiedBeds} occupied ({Math.round((capacity.occupiedBeds / capacity.totalBeds) * 100)}% load)
                    </div>
                  </div>

                  <div className={`bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm transition-all ${getFlashClass(currentHospital.id)}`}>
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider">ICU Beds</span>
                      <HeartPulse className="w-4 h-4 text-teal-600" />
                    </div>
                    <div className={`text-2xl sm:text-3xl font-black ${capacity.availableIcu === 0 ? 'text-red-600' : 'text-teal-600'}`}>
                      {capacity.availableIcu} <span className="text-xs font-normal text-slate-400">/ {capacity.totalIcu}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {capacity.occupiedIcu} occupied in critical unit
                    </div>
                  </div>

                  <div className={`bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm transition-all ${getFlashClass(currentHospital.id)}`}>
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider">Ventilators</span>
                      <Wind className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-indigo-600">
                      {capacity.availableVentilators} <span className="text-xs font-normal text-slate-400">/ {capacity.totalVentilators}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {capacity.occupiedVentilators} in active deployment
                    </div>
                  </div>

                  <div className={`bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm transition-all ${getFlashClass(currentHospital.id)}`}>
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider">ED Congestion</span>
                      <Activity className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold ${
                        capacity.congestion === 'Low' ? 'bg-emerald-100 text-emerald-800' :
                        capacity.congestion === 'Moderate' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {capacity.congestion}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-2">
                      Queue: &lt; 15 mins wait
                    </div>
                  </div>
                </div>

                {/* Capacity Overview Trend Graph (Wireframe 2.2) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-base text-slate-900">Capacity Overview Trend (Last 24 Hours)</h3>
                      <p className="text-xs text-slate-500">Hourly vacancies across Regular Beds, ICU Units, and Ventilators</p>
                    </div>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-semibold">
                      Live Telemetry
                    </span>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={capacity.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="beds" stroke="#2563EB" strokeWidth={2.5} name="Available Beds" dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="icu" stroke="#14B8A6" strokeWidth={2.5} name="Available ICU" dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="ventilators" stroke="#6366F1" strokeWidth={2} name="Available Ventilators" dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Recent Updates Table (Wireframe 2.2) */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900">Recent Telemetry Updates</h3>
                    <span className="text-xs text-slate-400">Auto-logged to MedMesh State Audit Ledger</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-3">Time</th>
                          <th className="px-6 py-3">Action</th>
                          <th className="px-6 py-3">User / Actor</th>
                          <th className="px-6 py-3">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {hospitalLogs.length > 0 ? (
                          hospitalLogs.slice(0, 5).map(log => (
                            <tr key={log.id} className="hover:bg-slate-50 transition">
                              <td className="px-6 py-3 font-medium text-slate-500">{log.timestamp}</td>
                              <td className="px-6 py-3 font-bold text-slate-900">{log.action}</td>
                              <td className="px-6 py-3 text-blue-600 font-medium">{log.actorName}</td>
                              <td className="px-6 py-3 text-slate-600">{log.details || log.entity}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-6 text-center text-slate-400">
                              No recent updates recorded yet. Use the Capacity Manager tab to push updates.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                2.3 CAPACITY MANAGEMENT (Wireframe 2.3)
               ========================================================================= */}
            {currentView === 'capacity' && (
              <div className="space-y-6">
                {/* Statistics Cards (Wireframe 2.3) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Beds</div>
                    <div className="text-3xl font-black text-slate-900 mt-1">{capacity.totalBeds}</div>
                    <div className="text-xs text-slate-400 mt-1">Licensed capacity</div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Occupied Beds</div>
                    <div className="text-3xl font-black text-rose-600 mt-1">{capacity.occupiedBeds}</div>
                    <div className="text-xs text-slate-400 mt-1">Admitted in-patients</div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Free Beds</div>
                    <div className="text-3xl font-black text-emerald-600 mt-1">{capacity.availableBeds}</div>
                    <div className="text-xs text-emerald-600 font-medium mt-1">Ready for intake</div>
                  </div>
                </div>

                {/* Quick Update Buttons (Wireframe 2.3) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                    Quick Action Steppers (1-Click Update)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <button
                      onClick={() => incrementBed(currentHospital.id, 1)}
                      className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+1 Bed Released</span>
                    </button>

                    <button
                      onClick={() => incrementBed(currentHospital.id, -1)}
                      className="p-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl border border-amber-200 font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition"
                    >
                      <Minus className="w-4 h-4" />
                      <span>-1 Bed Occupied</span>
                    </button>

                    <button
                      onClick={() => setIcuFull(currentHospital.id)}
                      className="p-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition"
                    >
                      <AlertOctagon className="w-4 h-4" />
                      <span>ICU Full</span>
                    </button>

                    <button
                      onClick={() => setVentilatorFull(currentHospital.id)}
                      className="p-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl border border-purple-200 font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition"
                    >
                      <AlertOctagon className="w-4 h-4" />
                      <span>Ventilator Full</span>
                    </button>
                  </div>
                </div>

                {/* Detailed Capacity Form (Wireframe 2.3) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-bold text-base text-slate-900">Publish Capacity Update</h3>
                      <p className="text-xs text-slate-500">
                        Adjust numbers and push verified update to 108 Emergency Dispatch & Citizen Portal
                      </p>
                    </div>
                    <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-bold">
                      Freshness: 100%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Available General Beds</label>
                      <input
                        type="number"
                        min="0"
                        max={capacity.totalBeds}
                        value={inputBeds}
                        onChange={(e) => setInputBeds(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Available ICU Beds</label>
                      <input
                        type="number"
                        min="0"
                        max={capacity.totalIcu}
                        value={inputIcu}
                        onChange={(e) => setInputIcu(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Available Ventilators</label>
                      <input
                        type="number"
                        min="0"
                        max={capacity.totalVentilators}
                        value={inputVents}
                        onChange={(e) => setInputVents(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ED Congestion Level</label>
                      <select
                        value={inputCongestion}
                        onChange={(e) => setInputCongestion(e.target.value as CongestionLevel)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Low">Low (Queue &lt; 15m)</option>
                        <option value="Moderate">Moderate (Queue 15-45m)</option>
                        <option value="High">High (Queue &gt; 45m)</option>
                        <option value="Critical">Critical (Diversion)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                    <button
                      onClick={() => {
                        updateCapacityFull(currentHospital.id, inputBeds, inputIcu, inputVents, inputCongestion);
                      }}
                      className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center space-x-1.5"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Draft</span>
                    </button>

                    <button
                      onClick={() => {
                        updateCapacityFull(currentHospital.id, inputBeds, inputIcu, inputVents, inputCongestion);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition flex items-center space-x-1.5"
                    >
                      <Send className="w-4 h-4" />
                      <span>Save & Broadcast to 108</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Doctor On-Duty Roster */}
            {currentView === 'doctors' && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Doctor Shift & On-Duty Status</h3>
                    <p className="text-xs text-slate-500">Toggle specialist availability for real-time 108 triage routing</p>
                  </div>
                  <span className="text-xs text-blue-600 font-semibold">
                    {currentHospital.doctors.filter(d => d.onDuty).length} Active On Duty
                  </span>
                </div>

                <div className="space-y-3">
                  {currentHospital.doctors.map(doc => (
                    <div
                      key={doc.id}
                      className={`bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between transition-colors ${getFlashClass(doc.id)}`}
                    >
                      <div className="flex items-center space-x-4">
                        <img src={doc.avatar} alt={doc.name} className="w-12 h-12 rounded-xl object-cover" />
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">{doc.name}</h4>
                          <p className="text-xs text-blue-600 font-semibold">{doc.specialty}</p>
                          <p className="text-[11px] text-slate-500">{doc.shiftHours}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          doc.onDuty ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {doc.onDuty ? 'ON DUTY' : 'OFF DUTY'}
                        </span>

                        <button
                          onClick={() => toggleDoctorDuty(currentHospital.id, doc.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                            doc.onDuty
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                          }`}
                        >
                          {doc.onDuty ? 'Clock Out' : 'Clock In (On Duty)'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reports tab */}
            {currentView === 'reports' && (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
                <FileText className="w-12 h-12 text-blue-600 mx-auto" />
                <h3 className="font-bold text-lg text-slate-900">Hospital Compliance & Occupancy Ledger</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Audit report for {currentHospital.name} generated in compliance with State Health Data Exchange Act.
                </p>
                <div className="pt-4 flex justify-center space-x-3">
                  <button
                    onClick={() => alert(`Downloading occupancy ledger for ${currentHospital.name}...`)}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow"
                  >
                    Download PDF Report
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
