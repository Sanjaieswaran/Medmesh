import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Ambulance as AmbulanceIcon,
  Navigation,
  MapPin,
  Clock,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Check,
  X,
  ArrowRight,
  Sparkles,
  Locate,
  Activity,
  Bed,
  HeartPulse,
  Compass,
  ShieldCheck,
  Zap,
  Power,
  Layers,
  ChevronRight,
  CheckCheck,
  FileCheck,
  User,
  Radio,
  LogOut
} from 'lucide-react';
import { useMedMesh } from '../../store/useMedMeshStore';
import { realtimeEventBus } from '../../services/realtimeEventBus';
import { Incident, Hospital, Ambulance, DriverWorkflowState } from '../../types';
import { AmbulanceMapView } from './AmbulanceMapView';
import { SmartHospitalSheet } from './SmartHospitalSheet';
import { AmbulanceHandoverModal } from './AmbulanceHandoverModal';
import { DevUserSwitcher } from '../common/DevUserSwitcher';

export const AmbulancePortal: React.FC = () => {
  const {
    ambulances,
    activeAmbulanceId,
    incidents,
    assignments,
    hospitals,
    currentUser,
    advanceIncidentStep,
    selectDestinationHospital,
    acceptAssignment,
    rejectAssignment,
    expireAssignment,
    setDriverOnlineStatus,
    arriveAtScene,
    confirmPatientOnboard,
    arriveAtHospital,
    completeIncidentCase,
    currentDistrict,
    logout,
    navigate
  } = useMedMesh();

  // Active ambulance unit locked to the authenticated driver session
  const currentAmbulance = useMemo(() => {
    if (currentUser?.ambulanceId) {
      const byAmbId = ambulances.find(a => a.id === currentUser.ambulanceId);
      if (byAmbId) return byAmbId;
    }
    if (currentUser?.id) {
      const byDriverUserId = ambulances.find(a => a.driverUserId === currentUser.id);
      if (byDriverUserId) return byDriverUserId;
    }
    if (activeAmbulanceId) {
      const byActiveId = ambulances.find(a => a.id === activeAmbulanceId);
      if (byActiveId) return byActiveId;
    }
    return ambulances[0];
  }, [ambulances, currentUser, activeAmbulanceId]);

  // Authenticated pilot dynamic identity from session
  const pilotName = currentUser?.name || currentAmbulance.driverName;
  const pilotBadge = currentUser?.badgeNumber || 'PILOT-108';
  const pilotLicense = currentUser?.licenseNumber || currentAmbulance.licenseNumber || 'TN-EMRI-108';

  // Active assignment strictly for this ambulance unit or authenticated pilot
  const activeAssignment = useMemo(() => {
    return assignments.find(
      a => (a.ambulanceId === currentAmbulance.id || (currentUser?.id && a.pilotId === currentUser.id)) &&
           (a.status === 'ASSIGNED' || a.status === 'ACCEPTED')
    ) || null;
  }, [assignments, currentAmbulance.id, currentUser?.id]);

  // Active incident strictly linked to this unit's assignment
  const activeIncident = useMemo(() => {
    if (!activeAssignment) return null;
    return incidents.find(
      i => i.id === activeAssignment.incidentId && i.status !== 'Completed' && i.status !== 'CLOSED' && i.status !== 'HANDOVER_COMPLETE'
    ) || null;
  }, [activeAssignment, incidents]);

  // Room-based realtime isolation subscription
  useEffect(() => {
    const room = `ambulance_${currentAmbulance.id}`;
    const unsubscribe = realtimeEventBus.subscribeRoom(room, (envelope) => {
      console.log(`[AmbulancePortal] Room event on ${room}:`, envelope.type);
    });
    return () => unsubscribe();
  }, [currentAmbulance.id]);

  // Driver Online / Offline Standby state
  const isOnline = currentAmbulance.status !== 'Offline';

  // Smart Hospital Selection Sheet state
  const [showSmartHospitalSheet, setShowSmartHospitalSheet] = useState(false);

  // GPS Loading state
  const [isAcquiringGps, setIsAcquiringGps] = useState(false);

  // 120-Second Auto-Timeout Countdown derived from server-authoritative expiresAt
  const [countdownSeconds, setCountdownSeconds] = useState(120);
  const countdownIntervalRef = useRef<any>(null);

  // Compute Linear Driver Workflow State (Strict 8 States)
  const driverWorkflowState = useMemo<DriverWorkflowState>(() => {
    if (!activeIncident || !activeAssignment) return 'Waiting';
    if (activeAssignment.status === 'ASSIGNED') return 'Assigned';
    switch (activeIncident.status) {
      case 'Assigned':
      case 'ASSIGNED':
        return 'Assigned';
      case 'En Route':
      case 'ACCEPTED':
      case 'EN_ROUTE_SCENE':
        return 'En Route';
      case 'On Scene':
      case 'AT_SCENE':
        return activeIncident.patientOnboardAt ? 'Patient Onboard' : 'Arrived At Scene';
      case 'PATIENT_ONBOARD':
        return 'Patient Onboard';
      case 'Transporting':
      case 'EN_ROUTE_HOSPITAL':
        return 'Transporting';
      case 'Arrived':
      case 'ARRIVED_HOSPITAL':
        return 'Arrived Hospital';
      default:
        return 'Waiting';
    }
  }, [activeIncident, activeAssignment]);

  // Receiving hospital is strictly null until patient pickup and hospital selection
  const isTransportingStage =
    driverWorkflowState === 'Transporting' || driverWorkflowState === 'Arrived Hospital';
  const receivingHospital = (isTransportingStage && activeIncident?.assignedHospitalId)
    ? hospitals.find(h => h.id === activeIncident.assignedHospitalId) || null
    : null;

  // Handle 120-Second Auto-Timeout for 'Assigned' state
  useEffect(() => {
    if (activeAssignment && activeAssignment.status === 'ASSIGNED') {
      const getRemaining = () => {
        return Math.max(0, Math.floor((new Date(activeAssignment.expiresAt).getTime() - Date.now()) / 1000));
      };
      setCountdownSeconds(getRemaining());

      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }

      countdownIntervalRef.current = setInterval(() => {
        const remaining = getRemaining();
        setCountdownSeconds(remaining);
        if (remaining <= 0) {
          clearInterval(countdownIntervalRef.current);
          expireAssignment(activeAssignment.id);
        }
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      setCountdownSeconds(120);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [activeAssignment?.id, activeAssignment?.status, activeAssignment?.expiresAt, expireAssignment]);

  // Action: Logout from Ambulance Driver Console
  const handleLogout = () => {
    logout();
    navigate('/login');
    try {
      window.history.replaceState(null, '', '/login');
    } catch (e) {
      // ignore
    }
  };

  // Action: Accept Emergency Dispatch Call (Stage 1 -> Stage 2)
  const handleAcceptDispatch = () => {
    if (!activeAssignment || !activeIncident) return;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    setIsAcquiringGps(true);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setIsAcquiringGps(false);
          acceptAssignment(activeAssignment.id, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        },
        err => {
          console.warn('Geolocation denied, using vehicle base coordinates:', err.message);
          setIsAcquiringGps(false);
          acceptAssignment(activeAssignment.id);
        },
        { enableHighAccuracy: true, timeout: 3000 }
      );
    } else {
      setIsAcquiringGps(false);
      acceptAssignment(activeAssignment.id);
    }
  };

  // Action: Decline / Reject Emergency Dispatch Call
  const handleDeclineDispatch = () => {
    if (!activeAssignment) return;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    rejectAssignment(activeAssignment.id, 'Driver declined assignment');
  };

  // Action: Arrived At Scene (Stage 2 -> Stage 3)
  const handleArrivedAtScene = () => {
    if (!activeIncident) return;
    arriveAtScene(activeIncident.id);
  };

  // Action: Confirm Patient Onboard (Stage 3 -> Stage 4)
  const handlePatientOnboard = () => {
    if (!activeIncident) return;
    confirmPatientOnboard(activeIncident.id);
    setShowSmartHospitalSheet(true);
  };

  // Action: Hospital Selected from Smart Recommendation Sheet (Stage 4 -> Stage 6)
  const handleHospitalSelected = (hospitalId: string, careUnit: string) => {
    if (!activeIncident) return;
    selectDestinationHospital(currentAmbulance.id, activeIncident.id, hospitalId, careUnit);
    setShowSmartHospitalSheet(false);
  };

  // Action: Reached Receiving Hospital (Stage 6 -> Stage 7)
  const handleReachedHospital = () => {
    if (!activeIncident) return;
    arriveAtHospital(activeIncident.id);
  };

  // Action: Complete Case Handover (Stage 7 -> Stage 8 / Complete)
  const handleCompleteHandover = () => {
    if (!activeIncident) return;
    completeIncidentCase(activeIncident.id);
  };

  // Calculate circular progress for 120s timer ring (SVG 2*pi*r)
  const circleCircumference = 2 * Math.PI * 46;
  const strokeDashoffset = circleCircumference - (countdownSeconds / 120) * circleCircumference;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none text-slate-100">
      {/* =========================================================================
          STATE 1: WAITING FOR ASSIGNMENT (NO MAP REQUIRED)
          Clean, calming, distraction-free standby console
         ========================================================================= */}
      {driverWorkflowState === 'Waiting' && (
        <div className="absolute inset-0 z-[10] flex flex-col justify-between p-6 bg-radial from-slate-900 to-slate-950">
          {/* Top Driver Bar: Ambulance ID, Driver, Standby Badge, Quick Switcher */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shadow-lg">
                <AmbulanceIcon className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-black text-white font-mono tracking-tight">
                    {currentAmbulance.code}
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {currentAmbulance.vehicleType.split(' ')[0]}
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center space-x-2">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Pilot: <strong className="text-slate-200">{pilotName}</strong></span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-700 font-bold">#{pilotBadge}</span>
                </div>
              </div>
            </div>

            {/* Right: Duty Standby Toggle & Unit Selector */}
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                <span>Unit: {currentAmbulance.code}</span>
              </div>

              <button
                onClick={() => setDriverOnlineStatus(currentAmbulance.id, !isOnline)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                  isOnline
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                <span>{isOnline ? 'ONLINE • STANDBY' : 'OFFLINE'}</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800 transition cursor-pointer"
                title="Logout Driver"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* Center: "Waiting For Emergency Assignment" High-Contrast Hero */}
          <div className="max-w-md w-full mx-auto text-center space-y-6 my-auto">
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping duration-1000" />
              <div className="w-24 h-24 rounded-full bg-slate-900 border-2 border-slate-800 flex items-center justify-center shadow-2xl text-emerald-400">
                <Radio className="w-12 h-12 stroke-[1.8] animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Status: Available for Turnout</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Waiting For Emergency Assignment
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                Unit is stationed on patrol corridor. When 108 CAD assigns an emergency call, a full-screen dispatch card will appear with priority details.
              </p>
            </div>

            {/* GPS & Hardware Status Box */}
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                <Locate className="w-4 h-4" />
                <span>GPS High-Accuracy Active</span>
              </div>
              <span className="font-mono text-slate-400 text-[11px]">
                Sector: {currentDistrict?.name || 'District Command'}
              </span>
            </div>
          </div>

          {/* Bottom Bar: System SLA & Pilot ID */}
          <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 pt-4">
            <span>Pilot: <strong className="text-slate-300">{pilotName}</strong> (Lic: {pilotLicense})</span>
            <span className="text-emerald-500 font-semibold">108 EMS CAD Connected</span>
          </div>
        </div>
      )}

      {/* =========================================================================
          STATE 2: NEW EMERGENCY ASSIGNMENT (FULL-SCREEN EMERGENCY ALERT)
          No navigation map yet. 30-Second circular countdown & large touch buttons.
         ========================================================================= */}
      {driverWorkflowState === 'Assigned' && activeIncident && (
        <div className="absolute inset-0 z-[600] bg-slate-950/95 backdrop-blur-xl flex flex-col justify-between p-6 animate-in fade-in duration-200">
          {/* Top Bar: Unit & Exit/Logout */}
          <div className="flex items-center justify-between max-w-md w-full mx-auto text-xs text-slate-400 pt-1">
            <span className="font-mono font-bold text-slate-300">{currentAmbulance.code} • Pilot: {pilotName}</span>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 text-slate-400 hover:text-rose-400 font-bold transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit / Logout</span>
            </button>
          </div>

          {/* Top Banner Alert */}
          <div className="max-w-md w-full mx-auto text-center pt-2 space-y-2">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-rose-600 text-white text-xs font-black tracking-wider uppercase shadow-xl shadow-rose-600/40 animate-pulse">
              <AlertTriangle className="w-4 h-4" />
              <span>🚨 CRITICAL EMERGENCY ASSIGNMENT</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight pt-1">
              {activeIncident.category}
            </h1>
            <p className="text-xs text-rose-300 font-bold">
              Immediate turnout mandated • High priority life response
            </p>
          </div>

          {/* Center: 30-Second Circular Countdown Ring */}
          <div className="flex flex-col items-center justify-center my-auto space-y-5">
            <div className="relative w-40 h-40 flex items-center justify-center">
              {/* Circular SVG Timer */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="46"
                  className="stroke-slate-800 stroke-[8] fill-none"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="46"
                  className="stroke-rose-500 stroke-[8] fill-none transition-all duration-1000 ease-linear"
                  style={{
                    strokeDasharray: circleCircumference,
                    strokeDashoffset: strokeDashoffset,
                    strokeLinecap: 'round'
                  }}
                />
              </svg>

              {/* Number in center */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-4xl font-black text-white font-mono tracking-tight">
                  {countdownSeconds}
                </span>
                <span className="text-[10px] font-extrabold uppercase text-rose-400 tracking-wider">
                  Seconds
                </span>
              </div>
            </div>

            {/* Incident Specification Details Card */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 max-w-sm w-full text-center space-y-2 shadow-2xl">
              <div className="text-xs font-black uppercase text-rose-400 tracking-wider">
                Priority: {activeIncident.urgency || 'High'}
              </div>
              <div className="flex items-center justify-center space-x-2 text-slate-200 text-sm font-black">
                <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span className="truncate">{activeIncident.locationName}</span>
              </div>
              <div className="text-xs text-slate-400">
                Patient: <strong className="text-white">{activeIncident.patientName || 'Emergency Patient'}</strong>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-center">
                <div>
                  <div className="text-[10px] uppercase text-slate-500 font-bold">Distance</div>
                  <div className="text-base font-black text-white">
                    {(
                      Math.sqrt(
                        Math.pow((currentAmbulance.latitude - activeIncident.latitude) * 111, 2) +
                        Math.pow((currentAmbulance.longitude - activeIncident.longitude) * 111, 2)
                      ).toFixed(1)
                    )} km
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-500 font-bold">Estimated ETA</div>
                  <div className="text-base font-black text-emerald-400">~{activeIncident.etaMinutes || 4} min</div>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 pt-1">
                Dispatched by: <strong className="text-slate-400">{activeAssignment?.dispatcherName || '108 CAD Operator'}</strong>
              </div>
            </div>
          </div>

          {/* Bottom Actions: Large Green Accept & Red Decline Buttons */}
          <div className="max-w-md w-full mx-auto space-y-3 pb-2">
            {/* 1-Tap Large Green Accept Button (Tap 1) */}
            <button
              onClick={handleAcceptDispatch}
              disabled={isAcquiringGps}
              className="w-full py-5 rounded-3xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-black text-xl flex items-center justify-center space-x-3 shadow-2xl shadow-emerald-500/40 transition cursor-pointer disabled:opacity-50"
            >
              {isAcquiringGps ? (
                <>
                  <div className="w-5 h-5 border-3 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>LOCKING GPS & ROUTE...</span>
                </>
              ) : (
                <>
                  <Check className="w-7 h-7 stroke-[3.5]" />
                  <span>ACCEPT EMERGENCY ({countdownSeconds}s)</span>
                </>
              )}
            </button>

            {/* Decline Button (Triggers auto-reassignment to next nearest ambulance in district) */}
            <button
              onClick={handleDeclineDispatch}
              className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 font-bold text-xs flex items-center justify-center space-x-2 border border-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>DECLINE (AUTO-REASSIGN TO NEXT NEAREST UNIT)</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          ACTIVE WORKFLOW: REAL GIS ROAD MAP LAYER (OCCUPIES >= 85% OF SCREEN)
          Only loaded after acceptance (State 3, 4, 6, 7)
         ========================================================================= */}
      {activeIncident && driverWorkflowState !== 'Assigned' && driverWorkflowState !== 'Waiting' && (
        <>
          {/* 1. Real GIS Map (Base layer, 100% height, >= 85% visible behind Uber sheet) */}
          <div className="absolute inset-0 z-[1]">
            <AmbulanceMapView
              ambulance={currentAmbulance}
              incident={activeIncident}
              destinationHospital={receivingHospital}
              journeyStage={activeIncident.status}
              fullScreen={true}
              hideBottomControls={true}
              onOpenHospitalSelection={() => setShowSmartHospitalSheet(true)}
            />
          </div>

          {/* 2. Sleek Floating Header Pill (Unit Code, Pilot, Standby/Emergency Status) */}
          <header className="absolute top-3 left-3 right-3 z-[450] flex items-center justify-between pointer-events-none">
            <div className="pointer-events-auto bg-slate-950/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-800 shadow-2xl flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-black text-white font-mono tracking-wide">
                {currentAmbulance.code} • {pilotName}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-600/30 text-rose-300 border border-rose-500/40">
                ACTIVE 108 MISSION
              </span>
            </div>

            {/* Right: 108 Dispatch Direct Call & Logout */}
            <div className="flex items-center space-x-2 pointer-events-auto">
              <a
                href="tel:108"
                className="bg-slate-950/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-800 shadow-2xl flex items-center space-x-1.5 text-xs font-bold text-slate-300 hover:text-white transition"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Call 108 CAD</span>
              </a>

              <button
                onClick={handleLogout}
                className="bg-slate-950/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-rose-900/60 hover:border-rose-700 shadow-2xl flex items-center space-x-1.5 text-xs font-bold text-rose-300 hover:text-white transition cursor-pointer"
                title="Logout Driver"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Logout</span>
              </button>
            </div>
          </header>

          {/* =========================================================================
              UBER-STYLE COLLAPSIBLE BOTTOM ACTION SHEET (OCCUPIES <= 25% OF MAP)
              One primary action per stage. Less than 5 taps overall!
             ========================================================================= */}
          <div className="absolute bottom-3 left-3 right-3 sm:left-6 sm:right-6 max-w-xl mx-auto z-[450] pointer-events-none">
            <div className="pointer-events-auto bg-slate-950/95 backdrop-blur-xl text-white rounded-3xl border border-slate-800 shadow-2xl p-4 space-y-3 animate-in slide-in-from-bottom-6 duration-300">
              {/* Emergency Stage Header & Objective Label */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-rose-400 font-mono">
                    {driverWorkflowState === 'En Route' && 'STAGE 2: EN ROUTE TO INCIDENT SCENE'}
                    {driverWorkflowState === 'Arrived At Scene' && 'STAGE 3: ARRIVED AT SCENE (PATIENT ASSESSMENT)'}
                    {driverWorkflowState === 'Patient Onboard' && 'STAGE 4: PATIENT ONBOARD (SELECT RECEIVING HOSPITAL)'}
                    {driverWorkflowState === 'Transporting' && 'STAGE 6: TRANSPORT TO RECEIVING HOSPITAL'}
                    {driverWorkflowState === 'Arrived Hospital' && 'STAGE 7: PATIENT HANDOVER'}
                  </span>
                </div>

                {/* Live ER Bay confirmation pill if transporting */}
                {driverWorkflowState === 'Transporting' && receivingHospital && (
                  <div>
                    {activeIncident.intakeAcknowledged ? (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black flex items-center space-x-1">
                        <CheckCheck className="w-3 h-3" />
                        <span>ER BAY HELD</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                        INTAKE TRANSMITTED
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* STAGE 4: PATIENT ONBOARD INFO */}
              {driverWorkflowState === 'Patient Onboard' ? (
                <div className="bg-slate-900/90 p-3 rounded-2xl border border-indigo-500/30 space-y-1.5 text-xs">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Patient Secured Onboard</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Patient: <strong className="text-white">{activeIncident.patientName || 'Emergency Patient'}</strong> • Ready for hospital turnout
                  </div>
                </div>
              ) : driverWorkflowState === 'Arrived At Scene' ? (
                /* STAGE 3: PATIENT ASSESSMENT PANEL */
                <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-white">Initial Patient Assessment</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      TRIAGE: {activeIncident.urgency.toUpperCase()}
                    </span>
                  </div>

                  {/* 3 Quick Clinical Checks */}
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold">
                    <div className="bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-emerald-400">
                      ✓ Airway / Breathing
                    </div>
                    <div className="bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-emerald-400">
                      ✓ Bleed Controlled
                    </div>
                    <div className="bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-emerald-400">
                      ✓ Spine Stabilized
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-0.5">
                    <span>Patient: <strong className="text-white">{activeIncident.patientName || 'Emergency Patient'}</strong></span>
                    <span>Scene: <strong className="text-slate-300">{activeIncident.locationName.split(',')[0]}</strong></span>
                  </div>
                </div>
              ) : (
                /* Patient & Location Card for Transit Stages */
                <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800/90 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs text-slate-400 font-semibold flex items-center space-x-1">
                      <span>{activeIncident.category}</span>
                      <span>•</span>
                      <span className="text-white font-bold">{activeIncident.patientName || 'Emergency Patient'}</span>
                    </div>
                    <div className="text-sm font-black text-white flex items-center space-x-1.5">
                      <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0" />
                      <span className="truncate">
                        {driverWorkflowState === 'Transporting' || driverWorkflowState === 'Arrived Hospital'
                          ? receivingHospital?.name || 'Selected Hospital'
                          : activeIncident.locationName}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      {driverWorkflowState === 'Transporting' ? 'Hospital ETA' : 'Scene ETA'}
                    </div>
                    <div className="text-sm font-black text-emerald-400">
                      ~{activeIncident.etaMinutes || 4} min
                    </div>
                  </div>
                </div>
              )}

              {/* PRIMARY ACTION BUTTON PER STAGE (EXACTLY ONE PRIMARY BUTTON) */}
              <div className="pt-0.5">
                {/* Stage 2: Case Accepted -> Heading to Incident */}
                {driverWorkflowState === 'En Route' && (
                  <button
                    onClick={handleArrivedAtScene}
                    className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-black text-base sm:text-lg flex items-center justify-center space-x-2.5 shadow-2xl shadow-blue-600/40 transition cursor-pointer"
                  >
                    <Navigation className="w-6 h-6 stroke-[2.5]" />
                    <span>ARRIVED AT SCENE</span>
                    <ArrowRight className="w-6 h-6 stroke-[2.5]" />
                  </button>
                )}

                {/* Stage 3: Arrived At Scene -> Patient Onboard */}
                {driverWorkflowState === 'Arrived At Scene' && (
                  <button
                    onClick={handlePatientOnboard}
                    className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-black text-base sm:text-lg flex items-center justify-center space-x-2.5 shadow-2xl shadow-emerald-600/40 transition cursor-pointer animate-pulse"
                  >
                    <Building2 className="w-6 h-6 stroke-[2.5]" />
                    <span>PATIENT ONBOARD</span>
                    <ArrowRight className="w-6 h-6 stroke-[2.5]" />
                  </button>
                )}

                {/* Stage 4: Patient Onboard -> Select Receiving Hospital */}
                {driverWorkflowState === 'Patient Onboard' && (
                  <button
                    onClick={() => setShowSmartHospitalSheet(true)}
                    className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-black text-base sm:text-lg flex items-center justify-center space-x-2.5 shadow-2xl shadow-indigo-600/40 transition cursor-pointer animate-pulse"
                  >
                    <Building2 className="w-6 h-6 stroke-[2.5]" />
                    <span>SELECT RECEIVING HOSPITAL</span>
                    <ArrowRight className="w-6 h-6 stroke-[2.5]" />
                  </button>
                )}

                {/* Stage 6: Transport To Hospital -> Reached Hospital */}
                {driverWorkflowState === 'Transporting' && (
                  <div className="space-y-2">
                    <button
                      onClick={handleReachedHospital}
                      className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-[0.99] text-white font-black text-base sm:text-lg flex items-center justify-center space-x-2.5 shadow-2xl shadow-rose-600/40 transition cursor-pointer"
                    >
                      <Building2 className="w-6 h-6 stroke-[2.5]" />
                      <span>REACHED HOSPITAL</span>
                      <ArrowRight className="w-6 h-6 stroke-[2.5]" />
                    </button>

                    <button
                      onClick={() => setShowSmartHospitalSheet(true)}
                      className="w-full py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold transition border border-slate-800 cursor-pointer"
                    >
                      Reroute: Choose Different Hospital
                    </button>
                  </div>
                )}

                {/* Stage 7/8: Reached Hospital -> Handover Case */}
                {driverWorkflowState === 'Arrived Hospital' && (
                  <button
                    onClick={handleCompleteHandover}
                    className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-black text-base sm:text-lg flex items-center justify-center space-x-2.5 shadow-2xl shadow-emerald-600/40 transition cursor-pointer"
                  >
                    <FileCheck className="w-6 h-6 stroke-[2.5]" />
                    <span>COMPLETE PATIENT HANDOVER</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          STATE 5: SMART HOSPITAL RECOMMENDATION BOTTOM SHEET (UBER STYLE)
          3-5 hospitals max, smart ranking, 1-tap select
         ========================================================================= */}
      {activeIncident && (
        <SmartHospitalSheet
          isOpen={showSmartHospitalSheet}
          onClose={() => setShowSmartHospitalSheet(false)}
          ambulance={currentAmbulance}
          incident={activeIncident}
          onSelectHospital={handleHospitalSelected}
        />
      )}

      {/* =========================================================================
          STATE 8: PATIENT HANDOVER & SUMMARY MODAL
          Turnaround time metrics (Response, Scene, Transit), [ COMPLETE CASE ] button
         ========================================================================= */}
      {activeIncident && driverWorkflowState === 'Arrived Hospital' && (
        <AmbulanceHandoverModal
          isOpen={true}
          incident={activeIncident}
          hospital={receivingHospital}
          ambulance={currentAmbulance}
          onCompleteCase={handleCompleteHandover}
        />
      )}

      {/* Development-Only Testing Identity Switcher (Excluded in Production) */}
      <DevUserSwitcher />
    </div>
  );
};
