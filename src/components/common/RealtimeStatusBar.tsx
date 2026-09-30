import React, { useState } from 'react';
import {
  Radio,
  Activity,
  Zap,
  ChevronUp,
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  X,
  RefreshCw
} from 'lucide-react';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { useMedMesh } from '../../store/useMedMeshStore';

export const RealtimeStatusBar: React.FC = () => {
  const { recentEvents, latestEvent, status } = useRealtimeSync();
  const { hospitals, incrementBed, toggleDoctorDuty } = useMedMesh();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Trigger brief toast when a new event arrives
  React.useEffect(() => {
    if (latestEvent) {
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [latestEvent?.id]);

  const handleSimulateRandomUpdate = () => {
    if (hospitals.length === 0) return;
    const randomIndex = Math.floor(Math.random() * hospitals.length);
    const targetHosp = hospitals[randomIndex];
    const deltas = [-2, -1, 1, 2, 3];
    const delta = deltas[Math.floor(Math.random() * deltas.length)];
    incrementBed(targetHosp.id, delta);
  };

  const handleSimulateDoctorShift = () => {
    if (hospitals.length === 0) return;
    const targetHosp = hospitals.find(h => h.doctors.length > 0) || hospitals[0];
    if (targetHosp && targetHosp.doctors.length > 0) {
      const doc = targetHosp.doctors[0];
      toggleDoctorDuty(targetHosp.id, doc.id);
    }
  };

  return (
    <>
      {/* Toast Notification for Real-Time Broadcasts */}
      {showToast && latestEvent && (
        <div className="fixed bottom-14 right-4 z-50 max-w-sm bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-start space-x-3 animate-in slide-in-from-bottom-3 duration-300">
          <div className="w-8 h-8 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                WebSocket Frame
              </span>
              <span className="text-[10px] text-slate-400">Just now</span>
            </div>
            <p className="text-xs font-bold text-slate-100 mt-1 truncate">
              {latestEvent.summary}
            </p>
            <p className="text-[10px] text-slate-400 font-mono">
              Topic: {latestEvent.type}
            </p>
          </div>
          <button
            onClick={() => setShowToast(false)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Bottom Status Pill */}
      <div className="fixed bottom-3 right-4 z-40">
        <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-2xl shadow-xl p-2 px-3 flex items-center space-x-3 text-xs">
          {/* Live indicator dot */}
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-extrabold text-slate-200 hidden sm:inline">
              Socket.IO Live Telemetry:
            </span>
            <span className="font-black text-emerald-400">Active</span>
          </div>

          <span className="text-slate-600 hidden sm:inline">•</span>

          {/* Simulate Action Button */}
          <button
            onClick={handleSimulateRandomUpdate}
            className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition flex items-center space-x-1 shadow-xs"
            title="Simulate a real-time capacity change event from a hospital"
          >
            <Zap className="w-3 h-3 text-amber-300" />
            <span>Simulate Event</span>
          </button>

          {/* Drawer Toggle */}
          <button
            onClick={() => setIsExpanded(prev => !prev)}
            className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-[11px] transition flex items-center space-x-1"
            title="Inspect incoming WebSocket packets"
          >
            <span>Events ({recentEvents.length})</span>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Expandable Live Event Feed Drawer */}
        {isExpanded && (
          <div className="absolute bottom-12 right-0 w-96 max-w-[95vw] bg-white rounded-3xl border border-slate-200 shadow-2xl p-4 text-slate-800 space-y-3 animate-in slide-in-from-bottom-5 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900">Real-Time Event Stream Log</h4>
                  <p className="text-[10px] text-slate-400">BroadcastChannel / Socket.IO PubSub</p>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={handleSimulateDoctorShift}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold"
                  title="Simulate doctor clock in / clock out"
                >
                  Doctor Shift
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Event List */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 text-xs">
              {recentEvents.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Awaiting live hospital telemetry events...
                </div>
              ) : (
                recentEvents.map(evt => (
                  <div key={evt.id} className="pt-2 first:pt-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold ${
                        evt.severity === 'critical' ? 'bg-rose-100 text-rose-800' :
                        evt.severity === 'warning' ? 'bg-amber-100 text-amber-800' :
                        evt.severity === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {evt.type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    <p className="font-bold text-slate-800 text-[11px] leading-tight">
                      {evt.summary}
                    </p>

                    {evt.hospitalName && (
                      <p className="text-[10px] text-slate-500">
                        Facility: <strong>{evt.hospitalName}</strong>
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
