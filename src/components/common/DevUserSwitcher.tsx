import React, { useState } from 'react';
import {
  Users,
  ChevronUp,
  ChevronDown,
  Ambulance as AmbulanceIcon,
  ShieldAlert,
  Building2,
  CheckCircle2,
  Lock,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { useMedMesh } from '../../store/useMedMeshStore';

export const DevUserSwitcher: React.FC = () => {
  // Strict Production Guard: Do NOT render anything in production mode!
  if (!import.meta.env.DEV) {
    return null;
  }

  const { currentUser, users, ambulances, devSwitchUser } = useMedMesh();
  const [isOpen, setIsOpen] = useState(false);

  // Filter 108 Emergency Pilots
  const pilotUsers = users.filter(u => u.role === 'AMBULANCE_DRIVER');
  const operatorUser = users.find(u => u.role === 'OPERATOR_108');

  const handleSelectUser = (userId: string) => {
    devSwitchUser(userId);
    setIsOpen(false);
  };

  return (
    <aside aria-label="Development Tools" className="fixed bottom-4 right-4 z-[9999] font-sans select-none text-xs">
      {/* Expanded Dev Switcher Dialog */}
      {isOpen && (
        <div className="mb-2 w-80 bg-slate-950/95 backdrop-blur-xl border border-amber-500/40 rounded-3xl p-4 shadow-2xl shadow-black/80 space-y-3 text-slate-200 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="font-mono font-black text-amber-400 uppercase tracking-wider text-[11px]">
                Dev Pilot Switcher
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
              TESTING ONLY
            </span>
          </div>

          {/* Current Authenticated Pilot Info */}
          <div className="bg-slate-900/90 rounded-2xl p-2.5 border border-slate-800 space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400">Current Session</div>
            <div className="font-extrabold text-white text-sm flex items-center space-x-1.5">
              <span>{currentUser?.name || 'Unauthenticated'}</span>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800/80">
                {currentUser?.role === 'AMBULANCE_DRIVER' ? 'PILOT' : currentUser?.role}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Badge: <strong className="text-slate-200 font-mono">{currentUser?.badgeNumber || currentUser?.id || '—'}</strong>
            </div>
          </div>

          {/* Registered Pilots List */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              108 Emergency Pilots
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {pilotUsers.map(pilot => {
                const isSelected = currentUser?.id === pilot.id;
                const assignedVehicle = ambulances.find(a => a.id === pilot.ambulanceId || a.driverUserId === pilot.id);

                return (
                  <button
                    key={pilot.id}
                    onClick={() => handleSelectUser(pilot.id)}
                    className={`w-full p-2 rounded-xl text-left transition flex items-center justify-between border cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500/60 text-white ring-1 ring-blue-500/40'
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/80 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        <AmbulanceIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-xs truncate">{pilot.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {assignedVehicle?.code || 'Patrol Unit'} • {assignedVehicle?.districtName || 'Sector'}
                        </div>
                      </div>
                    </div>

                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 ml-1.5" />
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono flex-shrink-0 ml-1.5">Switch →</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cross-Role Quick Test Option */}
          {operatorUser && (
            <div className="pt-1 border-t border-slate-800">
              <button
                onClick={() => handleSelectUser(operatorUser.id)}
                className="w-full p-2 rounded-xl text-left bg-slate-900/60 hover:bg-red-950/40 border border-slate-800 hover:border-red-900/60 text-slate-300 hover:text-red-200 transition flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center space-x-2 truncate">
                  <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <div className="truncate">
                    <div className="font-bold text-xs">Switch to 108 CAD Dispatcher</div>
                    <div className="text-[10px] text-slate-500 truncate">{operatorUser.name}</div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Dispatch →</span>
              </button>
            </div>
          )}

          {/* Security Notice */}
          <div className="text-[10px] text-slate-500 text-center flex items-center justify-center space-x-1 pt-0.5">
            <Lock className="w-3 h-3 text-slate-600" />
            <span>Strictly disabled in production builds.</span>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3.5 py-2 rounded-2xl bg-slate-900/90 hover:bg-slate-900 text-amber-300 border border-amber-500/40 shadow-xl shadow-black/60 transition active:scale-95 cursor-pointer backdrop-blur-md"
        title="Developer Identity Switcher (Testing Only)"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        <span className="font-mono font-bold text-[11px]">
          {currentUser?.role === 'AMBULANCE_DRIVER' ? `Pilot: ${currentUser.name.split(' ')[0]}` : 'Dev Switcher'}
        </span>
        {isOpen ? <ChevronDown className="w-3 h-3 text-amber-400" /> : <ChevronUp className="w-3 h-3 text-amber-400" />}
      </button>
    </aside>
  );
};
