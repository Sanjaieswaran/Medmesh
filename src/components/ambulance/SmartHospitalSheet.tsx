import React, { useState, useMemo } from 'react';
import {
  Building2,
  Phone,
  Bed,
  HeartPulse,
  Wind,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronUp,
  X,
  Zap
} from 'lucide-react';
import { Hospital, Ambulance, Incident } from '../../types';
import { useMedMesh } from '../../store/useMedMeshStore';
import { LiveTimestamp } from '../common/LiveTimestamp';

interface SmartHospitalSheetProps {
  isOpen: boolean;
  onClose: () => void;
  ambulance: Ambulance;
  incident: Incident;
  onSelectHospital: (hospitalId: string, careUnit: string) => void;
}

export const SmartHospitalSheet: React.FC<SmartHospitalSheetProps> = ({
  isOpen,
  onClose,
  ambulance,
  incident,
  onSelectHospital
}) => {
  const { hospitals, selectedDistrictId } = useMedMesh();
  const [selectedCareUnit, setSelectedCareUnit] = useState<string>('Emergency Resuscitation & Trauma Bay');
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);

  // Calculate Haversine distance from ambulance/scene coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  };

  // Smart Hospital Ranking Algorithm
  const rankedHospitals = useMemo(() => {
    const originLat = incident.latitude || ambulance.latitude;
    const originLng = incident.longitude || ambulance.longitude;

    const districtHospitals = hospitals.filter(
      h => !selectedDistrictId || selectedDistrictId === 'all' || h.districtId === selectedDistrictId || h.district === ambulance.districtName
    );

    const candidates = districtHospitals.length > 0 ? districtHospitals : hospitals;

    return candidates
      .map(h => {
        const distance = calculateDistance(originLat, originLng, h.latitude, h.longitude);
        // Estimated travel time in minutes (~35 km/h emergency speed)
        const etaMinutes = Math.max(2, Math.round(distance * 1.8 + 1));

        // Smart Match Score (0 - 100)
        let score = 50;

        // Proximity score (closer = up to +35 pts)
        score += Math.max(0, 35 - distance * 2.5);

        // Bed availability score (up to +20 pts)
        if (h.capacity.availableBeds > 10) score += 20;
        else if (h.capacity.availableBeds > 3) score += 12;
        else if (h.capacity.availableBeds > 0) score += 5;
        else score -= 30; // Diversion penalty

        // ICU availability score (vital for critical calls)
        if (h.capacity.availableIcu > 3) score += 15;
        else if (h.capacity.availableIcu > 0) score += 8;
        else score -= 25;

        // Ventilator bonus
        if (h.capacity.availableVentilators > 0) score += 5;

        // Congestion penalty
        if (h.capacity.congestion === 'Critical') score -= 40;
        else if (h.capacity.congestion === 'Moderate') score -= 10;

        // Category specialty matching
        const categoryLower = incident.category.toLowerCase();
        if (
          (categoryLower.includes('trauma') || categoryLower.includes('accident')) &&
          h.specialties.some(s => s.toLowerCase().includes('trauma') || s.toLowerCase().includes('ortho'))
        ) {
          score += 15;
        } else if (
          categoryLower.includes('cardiac') &&
          h.specialties.some(s => s.toLowerCase().includes('cardio') || s.toLowerCase().includes('cath'))
        ) {
          score += 15;
        }

        const isDiversion = h.capacity.availableBeds <= 1 || h.capacity.congestion === 'Critical';

        return {
          hospital: h,
          distance,
          etaMinutes,
          score: Math.max(0, Math.round(score)),
          isDiversion
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // 3-5 hospitals maximum as required
  }, [hospitals, incident, ambulance, selectedDistrictId]);

  // Reset selected hospital to null when sheet opens (NO PRESELECTION)
  React.useEffect(() => {
    if (isOpen) {
      setSelectedHospitalId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentSelection = rankedHospitals.find(r => r.hospital.id === selectedHospitalId) || null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex flex-col justify-end p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-950 text-white rounded-t-3xl sm:rounded-3xl border border-slate-800 shadow-2xl max-w-2xl w-full mx-auto max-h-[88vh] flex flex-col overflow-hidden">
        {/* Sheet Drag / Header */}
        <div className="p-4 pb-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                <span>Smart Hospital Matcher</span>
                <span>•</span>
                <span>Live Capacity Ranked</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">Choose Receiving Hospital</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Care Unit Selector Pills */}
        <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800 overflow-x-auto flex items-center space-x-2 scrollbar-none">
          {[
            'Emergency Resuscitation & Trauma Bay',
            'ICU / Critical Care Bay',
            'Cardiac Care Unit (CCU / Cath Lab)',
            'Pediatric Intensive Care (PICU)'
          ].map(unit => (
            <button
              key={unit}
              onClick={() => setSelectedCareUnit(unit)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCareUnit === unit
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {unit}
            </button>
          ))}
        </div>

        {/* Ranked Hospital Options List (Uber Ride Option Style) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {rankedHospitals.map((item, index) => {
            const h = item.hospital;
            const isSelected = selectedHospitalId === h.id;
            const isTopRanked = index === 0;

            return (
              <div
                key={h.id}
                onClick={() => setSelectedHospitalId(h.id)}
                className={`p-3.5 rounded-2xl border transition cursor-pointer relative ${
                  isSelected
                    ? 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/40'
                    : item.isDiversion
                    ? 'bg-rose-950/10 border-rose-900/50 hover:border-rose-700'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Top Smart Match Badge */}
                {isTopRanked && (
                  <div className="absolute -top-2.5 right-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-lg flex items-center space-x-1">
                    <span>⭐ Recommended Hospital</span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-sm sm:text-base text-white">{h.name}</span>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                        item.isDiversion
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : h.capacity.congestion === 'Moderate'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {item.isDiversion ? 'DIVERSION' : h.capacity.congestion === 'Moderate' ? 'BUSY' : 'NORMAL'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center space-x-3">
                      <span className="flex items-center space-x-1 text-slate-300 font-bold">
                        <MapPin className="w-3 h-3 text-rose-400" />
                        <span>{item.distance} km</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center space-x-1 text-emerald-400 font-black">
                        <Clock className="w-3 h-3" />
                        <span>~{item.etaMinutes} min ETA</span>
                      </span>
                      <span>•</span>
                      <span className="text-[10px] text-slate-500">
                        Updated <LiveTimestamp timestamp={h.capacity.updatedAt} />
                      </span>
                    </div>
                  </div>

                  {/* Right: Phone & Call Action */}
                  <a
                    href={`tel:${h.emergencyPhone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-emerald-950 hover:text-emerald-400 text-slate-300 transition"
                    title="Call Emergency Desk"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>

                {/* Live Capacity Indicators */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-800/80 text-center text-xs">
                  <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                    <div className="text-[10px] text-slate-400">Available Beds</div>
                    <div className="text-sm font-black text-emerald-400">{h.capacity.availableBeds}</div>
                  </div>
                  <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                    <div className="text-[10px] text-slate-400">ICU Beds</div>
                    <div className={`text-sm font-black ${h.capacity.availableIcu > 0 ? 'text-blue-400' : 'text-rose-400 font-extrabold'}`}>
                      {h.capacity.availableIcu}
                    </div>
                  </div>
                  <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                    <div className="text-[10px] text-slate-400">Ventilators</div>
                    <div className="text-sm font-black text-purple-400">{h.capacity.availableVentilators}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Action Area */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-2">
          {currentSelection ? (
            <>
              <button
                onClick={() => onSelectHospital(currentSelection.hospital.id, selectedCareUnit)}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-black text-sm sm:text-base flex items-center justify-center space-x-2.5 shadow-xl shadow-emerald-600/30 transition cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                <span>
                  CONFIRM & ROUTE TO {currentSelection.hospital.name.split(' ')[0].toUpperCase()} (~{currentSelection.etaMinutes}m)
                </span>
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </button>
              <div className="text-center text-[11px] text-slate-400">
                Holding <strong className="text-slate-200">{selectedCareUnit}</strong> • Emergency intake alert transmitted automatically
              </div>
            </>
          ) : (
            <div className="w-full py-3.5 rounded-2xl bg-slate-800/80 text-slate-400 font-bold text-xs sm:text-sm text-center border border-slate-700/80 flex items-center justify-center space-x-2">
              <span>👆 Tap a hospital card above to select receiving destination</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
