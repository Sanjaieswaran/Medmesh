import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Clock,
  Ambulance as AmbulanceIcon,
  Plus,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Navigation,
  Send,
  Sparkles,
  PhoneCall,
  Flame,
  Search,
  Check,
  ChevronRight,
  Filter,
  User,
  Radio,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { useMedMesh } from '../../store/useMedMeshStore';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { LiveTimestamp } from '../common/LiveTimestamp';
import { Incident, Hospital, Ambulance, AmbulanceAssignment } from '../../types';

// Live 120-second timer badge component for active assignments in Dispatcher Queue
const AssignmentTimerBadge: React.FC<{
  assignment: AmbulanceAssignment;
  onExpire: () => void;
}> = ({ assignment, onExpire }) => {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    return Math.max(0, Math.floor((new Date(assignment.expiresAt).getTime() - Date.now()) / 1000));
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(assignment.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [assignment.expiresAt, onExpire]);

  if (secondsLeft <= 0) {
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
        <AlertTriangle className="w-3 h-3 text-rose-600" />
        <span>120s SLA EXPIRED</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
      <Clock className="w-3 h-3 text-amber-600 animate-spin" />
      <span>Awaiting Pilot ({secondsLeft}s)</span>
    </span>
  );
};

export const OperatorPortal: React.FC = () => {
  const {
    incidents,
    hospitals,
    ambulances,
    assignments,
    districts,
    selectedDistrictId,
    setSelectedDistrict,
    currentDistrict,
    createIncident,
    createAmbulanceAssignment,
    expireAssignment,
    autoReassignIncident,
    advanceIncidentStep
  } = useMedMesh();

  const { getFlashClass, isFlashing, getFlashType } = useRealtimeSync();

  // Selected incident for explicit ambulance dispatch modal
  const [selectedIncidentForDispatch, setSelectedIncidentForDispatch] = useState<Incident | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New incident form state
  const [newDistrictId, setNewDistrictId] = useState(selectedDistrictId !== 'all' ? selectedDistrictId : 'dist-karur');
  const [newCategory, setNewCategory] = useState<Incident['category']>('Cardiac Arrest');
  const [newLocation, setNewLocation] = useState('Kovai Road, Karur');
  const [newPatient, setNewPatient] = useState('Male, 54 yrs (Acute chest pain)');
  const [newNotes, setNewNotes] = useState('Caller reports shortness of breath and diaphoresis.');

  // District-scoped collections
  const displayedIncidents = selectedDistrictId === 'all'
    ? incidents
    : incidents.filter(i => !i.districtId || i.districtId === selectedDistrictId);

  const displayedAmbulances = selectedDistrictId === 'all'
    ? ambulances
    : ambulances.filter(a => !a.districtId || a.districtId === selectedDistrictId);

  // Metrics
  const activeIncidents = displayedIncidents.filter(i => i.status !== 'Completed' && i.status !== 'CLOSED');
  const availableAmbulances = displayedAmbulances.filter(a => a.status === 'Available');

  // Sorted ambulances for an incident based on real distance
  const getAmbulancesForIncident = (inc: Incident) => {
    const pool = selectedDistrictId === 'all'
      ? ambulances
      : ambulances.filter(a => !a.districtId || a.districtId === (inc.districtId || selectedDistrictId));

    return (pool.length > 0 ? pool : ambulances).map(a => {
      const dist = Math.sqrt(Math.pow((a.latitude - inc.latitude) * 111, 2) + Math.pow((a.longitude - inc.longitude) * 111, 2));
      const eta = Math.max(3, Math.round(dist * 2.2 + 2));
      return { ambulance: a, distanceKm: dist.toFixed(1), etaMinutes: eta };
    }).sort((a, b) => {
      // Available units first
      if (a.ambulance.status === 'Available' && b.ambulance.status !== 'Available') return -1;
      if (a.ambulance.status !== 'Available' && b.ambulance.status === 'Available') return 1;
      return parseFloat(a.distanceKm) - parseFloat(b.distanceKm);
    });
  };

  const handleCreateIncidentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = createIncident(newCategory, newLocation, newNotes, newPatient, newDistrictId);
    setShowCreateModal(false);
    const targetDist = districts.find(d => d.id === newDistrictId);
    const newlyCreated = incidents.find(i => i.id === id) || {
      id,
      category: newCategory,
      locationName: newLocation,
      patientName: newPatient,
      latitude: targetDist?.latitude || 10.9601,
      longitude: targetDist?.longitude || 78.0766,
      districtId: targetDist?.id,
      districtName: targetDist?.name,
      urgency: 'Critical',
      status: 'PENDING_DISPATCH',
      etaMinutes: 10,
      reportedAt: 'Just now',
      bedReserved: false,
      notes: newNotes
    };
    // Automatically open the Ambulance Selector dialog (NOT hospital!)
    setSelectedIncidentForDispatch(newlyCreated as Incident);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shadow-md shadow-red-500/20">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-black text-slate-900">108 Emergency CAD Dispatch Console</h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>108 CAD WebSocket Live</span>
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Operator Station #08 • Tamil Nadu Central Emergency Command
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* 108 Dispatch District Scope Selector */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <select
                value={selectedDistrictId}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  if (e.target.value !== 'all') {
                    setNewDistrictId(e.target.value);
                  }
                }}
                className="text-xs font-black bg-transparent focus:outline-none text-slate-800 cursor-pointer"
                title="Filter 108 CAD Console by District"
              >
                <option value="all">🌐 All Districts (Statewide CAD)</option>
                {districts.map(d => (
                  <option key={d.id} value={d.id}>📍 {d.name} District</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center space-x-2 shadow-md shadow-red-600/30 transition active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>New Emergency Incident (Call Intake)</span>
            </button>
          </div>
        </div>

        {/* Top Metric Cards (Wireframe 3.2) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Incidents</span>
              <div className="text-3xl font-black text-slate-900 mt-1">{activeIncidents.length}</div>
              <div className="text-xs text-rose-600 font-semibold mt-1">
                {incidents.filter(i => i.status === 'Pending' || i.status === 'PENDING_DISPATCH').length} Pending Dispatch
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg. Response Time</span>
              <div className="text-3xl font-black text-blue-600 mt-1">7.2 min</div>
              <div className="text-xs text-emerald-600 font-semibold mt-1">Target: &lt; 10 min SLA</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available Ambulances</span>
              <div className="text-3xl font-black text-emerald-600 mt-1">
                {availableAmbulances.length} <span className="text-xs text-slate-400 font-normal">/ {ambulances.length}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">Ready for immediate CAD dispatch</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <AmbulanceIcon className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Live Incidents Queue Table (Wireframe 3.2) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-base text-slate-900">Live Incident Queue & Dispatch Queue</h2>
              <p className="text-xs text-slate-500">Real-time incoming emergency triage tickets</p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-medium">
              {displayedIncidents.length} incidents in {selectedDistrictId === 'all' ? 'Statewide Network' : (currentDistrict?.name || 'District')}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Incident ID & Type</th>
                  <th className="px-6 py-3">Location & Patient</th>
                  <th className="px-6 py-3">Assigned Hospital</th>
                  <th className="px-6 py-3">Ambulance</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">ETA</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedIncidents.map(inc => (
                  <tr key={inc.id} className={`hover:bg-slate-50 transition-colors ${getFlashClass(inc.id)}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-[11px] text-slate-400">#{inc.id}</span>
                        {inc.districtName && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60">
                            📍 {inc.districtName}
                          </span>
                        )}
                      </div>
                      <div className="font-extrabold text-sm text-slate-900 flex items-center space-x-1.5 mt-0.5">
                        <span>{inc.category}</span>
                      </div>
                      <div className="mt-1">
                        <LiveTimestamp timestamp={inc.reportedAt} showStatus={false} />
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{inc.locationName}</div>
                      <div className="text-[11px] text-slate-500">{inc.patientName}</div>
                      {inc.notes && <div className="text-[10px] text-slate-400 italic">{inc.notes}</div>}
                    </td>

                    <td className="px-6 py-4">
                      {inc.assignedHospitalName ? (
                        <div>
                          <div className="font-bold text-blue-600 flex items-center space-x-1">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>{inc.assignedHospitalName}</span>
                          </div>
                          {inc.bedReserved && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">
                              Bed Reserved
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded">
                          Unassigned
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {(() => {
                        const activeAsg = assignments.find(a => a.incidentId === inc.id && (a.status === 'ASSIGNED' || a.status === 'ACCEPTED'));
                        const ambCode = inc.assignedAmbulanceCode || activeAsg?.ambulanceCode;
                        return ambCode ? (
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                            {ambCode}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        );
                      })()}
                    </td>

                    <td className="px-6 py-4">
                      {(() => {
                        const activeAsg = assignments.find(a => a.incidentId === inc.id && (a.status === 'ASSIGNED' || a.status === 'ACCEPTED'));
                        if (inc.status === 'Pending' || inc.status === 'PENDING_DISPATCH') {
                          return (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center space-x-1.5 bg-amber-100 text-amber-900 border border-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                              <span>PENDING DISPATCH</span>
                            </span>
                          );
                        }
                        if (inc.status === 'Assigned' || inc.status === 'ASSIGNED') {
                          if (activeAsg && activeAsg.status === 'ASSIGNED') {
                            return <AssignmentTimerBadge assignment={activeAsg} onExpire={() => expireAssignment(activeAsg.id)} />;
                          }
                          return (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center space-x-1 bg-amber-100 text-amber-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              <span>ASSIGNED</span>
                            </span>
                          );
                        }
                        if (inc.status === 'En Route' || inc.status === 'ACCEPTED' || inc.status === 'EN_ROUTE_SCENE') {
                          return (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center space-x-1 bg-blue-100 text-blue-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                              <span>EN ROUTE SCENE</span>
                            </span>
                          );
                        }
                        if (inc.status === 'On Scene' || inc.status === 'AT_SCENE') {
                          return (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center space-x-1 bg-indigo-100 text-indigo-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                              <span>AT SCENE</span>
                            </span>
                          );
                        }
                        if (inc.status === 'PATIENT_ONBOARD') {
                          return (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center space-x-1 bg-purple-100 text-purple-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                              <span>PATIENT ONBOARD</span>
                            </span>
                          );
                        }
                        if (inc.status === 'Transporting' || inc.status === 'EN_ROUTE_HOSPITAL') {
                          return (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center space-x-1 bg-purple-100 text-purple-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                              <span>TRANSPORTING</span>
                            </span>
                          );
                        }
                        if (inc.status === 'Arrived' || inc.status === 'ARRIVED_HOSPITAL') {
                          return (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center space-x-1 bg-teal-100 text-teal-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                              <span>ARRIVED ER BAY</span>
                            </span>
                          );
                        }
                        return (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center space-x-1 bg-slate-100 text-slate-600">
                            <span>{inc.status}</span>
                          </span>
                        );
                      })()}
                    </td>

                    <td className="px-6 py-4 font-bold text-slate-800">
                      {inc.status === 'Completed' || inc.status === 'CLOSED' || inc.status === 'HANDOVER_COMPLETE' ? '—' : `${inc.etaMinutes || 4} min`}
                    </td>

                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      {inc.status === 'Pending' || inc.status === 'PENDING_DISPATCH' ? (
                        <button
                          onClick={() => setSelectedIncidentForDispatch(inc)}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center space-x-1.5 ml-auto shadow-sm shadow-red-600/20 active:scale-95 cursor-pointer"
                        >
                          <AmbulanceIcon className="w-3.5 h-3.5" />
                          <span>Dispatch Ambulance</span>
                        </button>
                      ) : inc.status === 'Assigned' || inc.status === 'ASSIGNED' ? (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setSelectedIncidentForDispatch(inc)}
                            className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold px-2.5 py-1.5 rounded-lg text-xs transition flex items-center space-x-1 cursor-pointer"
                            title="Reassign to another unit"
                          >
                            <RefreshCw className="w-3 h-3 text-amber-700" />
                            <span>Reassign</span>
                          </button>
                          <button
                            onClick={() => advanceIncidentStep(inc.id)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer"
                            title="Simulate step transition"
                          >
                            Simulate →
                          </button>
                        </div>
                      ) : inc.status !== 'Completed' && inc.status !== 'CLOSED' && inc.status !== 'HANDOVER_COMPLETE' ? (
                        <button
                          onClick={() => advanceIncidentStep(inc.id)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
                          title="Simulate step transition for testing"
                        >
                          Simulate Next Step →
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-bold text-xs flex items-center justify-end space-x-1">
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Handover Done</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3.4 AMBULANCE DISPATCH SELECTOR MODAL (120s Timer SLA)
         ========================================================================= */}
      {selectedIncidentForDispatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-200">
                    🚨 Incident #{selectedIncidentForDispatch.id}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    📍 {selectedIncidentForDispatch.districtName || 'District Corridor'}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Dispatch 108 Emergency Ambulance
                </h3>
                <p className="text-xs text-slate-500">
                  Select nearest available response unit for <strong>{selectedIncidentForDispatch.category}</strong> at {selectedIncidentForDispatch.locationName}
                </p>
              </div>

              <button
                onClick={() => setSelectedIncidentForDispatch(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Incident Mini Spec Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-400 uppercase font-bold text-[10px] block">Location</span>
                <span className="font-bold text-slate-800">{selectedIncidentForDispatch.locationName}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-bold text-[10px] block">Patient / Condition</span>
                <span className="font-bold text-slate-800">{selectedIncidentForDispatch.patientName || 'Emergency Patient'}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-bold text-[10px] block">Turnout SLA</span>
                <span className="font-extrabold text-red-600">CRITICAL (120s Acceptance Timer)</span>
              </div>
            </div>

            {/* Ambulance Candidate List */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Fleet Units (Ranked by GPS Distance & Turnout ETA)</span>
                <span className="text-slate-500 font-semibold">{getAmbulancesForIncident(selectedIncidentForDispatch).length} Units in Sector</span>
              </div>

              {getAmbulancesForIncident(selectedIncidentForDispatch).map((item, rank) => {
                const amb = item.ambulance;
                const isTopPick = rank === 0 && amb.status === 'Available';
                const isAvailable = amb.status === 'Available';

                return (
                  <div
                    key={amb.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isTopPick
                        ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-md'
                        : isAvailable
                        ? 'border-slate-200 bg-white hover:border-slate-300'
                        : 'border-slate-200 bg-slate-50/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-start space-x-3.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                        isTopPick ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <AmbulanceIcon className="w-5 h-5" />
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-mono font-black text-base text-slate-900">{amb.code}</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {amb.vehicleType}
                          </span>
                          {isTopPick && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white">
                              FASTEST RESPONSE
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {amb.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                          <span>Pilot: <strong className="text-slate-800">{amb.driverName}</strong> ({amb.driverPhone})</span>
                          <span>EMT: <strong className="text-slate-800">{amb.paramedicName || 'On Duty'}</strong></span>
                        </div>

                        <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                          <span>GPS Distance: <strong className="text-slate-800 font-mono">{item.distanceKm} km</strong></span>
                          <span>Estimated Turnout ETA: <strong className="text-blue-600 font-bold">{item.etaMinutes} mins</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
                      <button
                        disabled={!isAvailable}
                        onClick={() => {
                          createAmbulanceAssignment(selectedIncidentForDispatch.id, amb.id, 'usr-op-1');
                          setSelectedIncidentForDispatch(null);
                        }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow cursor-pointer ${
                          isTopPick
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
                            : isAvailable
                            ? 'bg-slate-900 hover:bg-slate-800 text-white'
                            : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Dispatch Unit (120s SLA)</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Incident Intake Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-lg text-slate-900">108 Emergency Call Intake</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 text-2xl font-bold">×</button>
            </div>

            <form onSubmit={handleCreateIncidentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Emergency District Corridor</label>
                <select
                  value={newDistrictId}
                  onChange={(e) => {
                    const dId = e.target.value;
                    setNewDistrictId(dId);
                    if (dId === 'dist-karur') setNewLocation('Kovai Road, Karur');
                    else if (dId === 'dist-trichy') setNewLocation('Cantonment / Collectorate, Tiruchirappalli');
                    else if (dId === 'dist-chennai') setNewLocation('Anna Salai, Chennai');
                    else if (dId === 'dist-coimbatore') setNewLocation('Avinashi Road, Coimbatore');
                    else if (dId === 'dist-salem') setNewLocation('Fairlands, Salem');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {districts.map(d => (
                    <option key={d.id} value={d.id}>📍 {d.name} ({d.state})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Road Accident</option>
                  <option>Cardiac Arrest</option>
                  <option>Trauma</option>
                  <option>Respiratory Distress</option>
                  <option>Maternal Emergency</option>
                  <option>Stroke</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Caller / Incident Location</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g. Near Gemini Flyover, Anna Salai, Chennai"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Patient Info / Condition</label>
                <input
                  type="text"
                  value={newPatient}
                  onChange={(e) => setNewPatient(e.target.value)}
                  placeholder="e.g. Male 42 yrs, unresponsive"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Notes for Triage</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/30 transition flex items-center space-x-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Log Incident & Start Smart Match</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
