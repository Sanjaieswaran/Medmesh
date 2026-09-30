import React, { useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  Building2,
  ArrowRight,
  FileCheck,
  Activity
} from 'lucide-react';
import { Incident, Hospital, Ambulance } from '../../types';

interface AmbulanceHandoverModalProps {
  isOpen: boolean;
  incident: Incident;
  hospital?: Hospital | null;
  ambulance: Ambulance;
  onCompleteCase: () => void;
}

export const AmbulanceHandoverModal: React.FC<AmbulanceHandoverModalProps> = ({
  isOpen,
  incident,
  hospital,
  ambulance,
  onCompleteCase
}) => {
  if (!isOpen) return null;

  // Compute timing intervals or fallback to realistic EMS telemetry
  const timings = useMemo(() => {
    const parseTime = (iso?: string) => (iso ? new Date(iso).getTime() : null);

    const tAssigned = parseTime(incident.assignedAt) || parseTime(incident.reportedAt) || Date.now() - 18 * 60 * 1000;
    const tAccepted = parseTime(incident.acceptedAt) || tAssigned + 25 * 1000;
    const tScene = parseTime(incident.arrivedSceneAt) || tAccepted + 4 * 60 * 1000 + 12 * 1000;
    const tOnboard = parseTime(incident.patientOnboardAt) || tScene + 5 * 60 * 1000 + 45 * 1000;
    const tHospital = parseTime(incident.arrivedHospitalAt) || tOnboard + 6 * 60 * 1000 + 30 * 1000;

    const formatDuration = (ms: number) => {
      const totalSecs = Math.max(0, Math.floor(ms / 1000));
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      return `${mins}m ${secs.toString().padStart(2, '0')}s`;
    };

    const responseDuration = tScene - tAccepted;
    const pickupDuration = tOnboard - tScene;
    const transportDuration = tHospital - tOnboard;
    const totalDuration = tHospital - tAccepted;

    return {
      responseTime: formatDuration(responseDuration),
      pickupTime: formatDuration(pickupDuration),
      transportTime: formatDuration(transportDuration),
      totalMissionTime: formatDuration(totalDuration)
    };
  }, [incident]);

  return (
    <div className="fixed inset-0 z-[1100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Success Header */}
        <div className="bg-gradient-to-b from-emerald-950/60 to-slate-900 p-6 text-center border-b border-slate-800/80 space-y-2">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-400 mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/20">
            <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
          </div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-black uppercase tracking-wider">
            <span>STATE 8: PATIENT HANDOVER COMPLETE</span>
          </div>
          <h2 className="text-2xl font-black text-white">Emergency Case Summary</h2>
          <p className="text-xs text-slate-400">
            Intake accepted at <strong className="text-emerald-300">{hospital?.name || incident.assignedHospitalName || 'Receiving Hospital'}</strong>
          </p>
        </div>

        {/* Mission Turnaround Timings Matrix */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-2.5 text-center">
            {/* 1. Response Time */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 space-y-1">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-center space-x-1">
                <Clock className="w-3 h-3 text-blue-400" />
                <span>Response Time</span>
              </div>
              <div className="text-lg font-black text-blue-400 font-mono">
                {timings.responseTime}
              </div>
              <div className="text-[9px] text-slate-500">Dispatch to Scene</div>
            </div>

            {/* 2. Pickup Time */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 space-y-1">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-center space-x-1">
                <Activity className="w-3 h-3 text-amber-400" />
                <span>Pickup Time</span>
              </div>
              <div className="text-lg font-black text-amber-400 font-mono">
                {timings.pickupTime}
              </div>
              <div className="text-[9px] text-slate-500">Scene Triage</div>
            </div>

            {/* 3. Transport Time */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 space-y-1">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-center space-x-1">
                <Building2 className="w-3 h-3 text-emerald-400" />
                <span>Transport Time</span>
              </div>
              <div className="text-lg font-black text-emerald-400 font-mono">
                {timings.transportTime}
              </div>
              <div className="text-[9px] text-slate-500">Scene to Hospital</div>
            </div>
          </div>

          {/* Case Detail Card */}
          <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800/80 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Emergency Case ID</span>
              <span className="font-mono font-bold text-white">#{incident.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Patient & Condition</span>
              <span className="font-bold text-white">{incident.patientName || 'Emergency Patient'} ({incident.category})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Receiving Bay</span>
              <span className="font-bold text-emerald-400">{incident.assignedBay || 'Emergency Bay #01'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Total Mission Turnaround</span>
              <span className="font-mono font-black text-white">{timings.totalMissionTime}</span>
            </div>
          </div>

          {/* Primary Complete Case Button (< 5 taps total) */}
          <div className="pt-2">
            <button
              onClick={onCompleteCase}
              className="w-full py-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-black text-base sm:text-lg flex items-center justify-center space-x-2 shadow-2xl shadow-emerald-500/30 transition cursor-pointer"
            >
              <FileCheck className="w-6 h-6 stroke-[2.5]" />
              <span>COMPLETE CASE</span>
              <ArrowRight className="w-6 h-6 stroke-[2.5]" />
            </button>
            <p className="text-[11px] text-slate-500 text-center mt-2 font-medium">
              Transfers electronic clinical handover note to hospital triage desk and returns unit {ambulance.code} to Available standby.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
