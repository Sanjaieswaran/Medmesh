import React, { useState, useEffect } from 'react';
import {
  Ambulance as AmbulanceIcon,
  Phone,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Radio,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Bed,
  HeartPulse
} from 'lucide-react';
import { Hospital, Ambulance, Incident } from '../../types';
import { useMedMesh } from '../../store/useMedMeshStore';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { LiveTimestamp } from '../common/LiveTimestamp';

interface IncomingAmbulancesWidgetProps {
  hospital: Hospital;
}

export const IncomingAmbulancesWidget: React.FC<IncomingAmbulancesWidgetProps> = ({ hospital }) => {
  const { ambulances, incidents, acknowledgeHospitalIntake } = useMedMesh();
  const { getFlashClass } = useRealtimeSync();

  const [acknowledgedAmbulanceIds, setAcknowledgedAmbulanceIds] = useState<string[]>([]);
  const [preparedBayIds, setPreparedBayIds] = useState<string[]>([]);

  // Filter incoming ambulances assigned to this hospital and still en route / transporting
  const incomingIncidents = incidents.filter(
    inc => inc.assignedHospitalId === hospital.id &&
           inc.status !== 'Completed' &&
           inc.status !== 'Pending'
  );

  const inboundAmbulances = incomingIncidents.map(inc => {
    const amb = ambulances.find(a => a.id === inc.assignedAmbulanceId || a.code === inc.assignedAmbulanceCode) || {
      id: inc.assignedAmbulanceId || 'amb-inbound',
      code: inc.assignedAmbulanceCode || 'AMB-108',
      driverName: 'K. Senthil Kumar',
      driverPhone: '9842100108',
      vehicleType: 'Advanced Life Support (ALS)',
      latitude: inc.latitude,
      longitude: inc.longitude
    } as Ambulance;

    return {
      incident: inc,
      ambulance: amb,
      eta: inc.etaMinutes || 5,
      priority: inc.urgency || 'Critical',
      condition: inc.patientName ? `${inc.category} — ${inc.patientName}` : inc.category,
      department: inc.category.includes('Cardiac') ? 'ICU / Critical CCU Bay' : 'Emergency Trauma Bay',
      location: inc.locationName,
      intakeAcknowledged: inc.intakeAcknowledged
    };
  });

  const toggleAcknowledge = (incidentId: string, ambId: string) => {
    setAcknowledgedAmbulanceIds(prev => 
      prev.includes(ambId) ? prev.filter(id => id !== ambId) : [...prev, ambId]
    );
    acknowledgeHospitalIntake(incidentId, hospital.id, 'Resuscitation Bay #01');
  };

  const togglePrepareBay = (incidentId: string, ambId: string) => {
    setPreparedBayIds(prev =>
      prev.includes(ambId) ? prev.filter(id => id !== ambId) : [...prev, ambId]
    );
    acknowledgeHospitalIntake(incidentId, hospital.id, 'Trauma Bay #01 (Ready)');
  };

  if (inboundAmbulances.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
              <AmbulanceIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Incoming Ambulances & Inbound Triage</h3>
              <p className="text-xs text-slate-500">Live EMS telemetry synchronized via 108 Emergency CAD</p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
            0 Inbound Transports
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      {/* Header Bar with Alert Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30 animate-pulse">
            <AmbulanceIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-black text-base text-slate-900">Incoming Ambulances (Inbound Triage)</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 animate-pulse">
                {inboundAmbulances.length} EN ROUTE
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Emergency bays reserved and monitored via real-time WebSocket stream
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Telemetry Active: Port 4001</span>
        </div>
      </div>

      {/* Inbound Ambulances Cards List */}
      <div className="space-y-3">
        {inboundAmbulances.map(({ incident: inc, ambulance: amb, eta, priority, condition, department, location }) => {
          const isAck = acknowledgedAmbulanceIds.includes(amb.id);
          const isBayReady = preparedBayIds.includes(amb.id);

          return (
            <div
              key={inc.id}
              className={`p-4 rounded-2xl border transition-all ${getFlashClass(inc.id)} ${
                priority === 'Critical'
                  ? 'bg-rose-50/40 border-rose-200 ring-1 ring-rose-200'
                  : 'bg-slate-50/80 border-slate-200'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left: Ambulance Code, Driver & Condition */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm border border-slate-800">
                    <AmbulanceIcon className="w-6 h-6" />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="font-mono text-sm font-black text-slate-900">{amb.code}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        priority === 'Critical' ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {priority} Triage Priority
                      </span>
                      <span className="text-xs font-bold text-slate-600">
                        Driver: {amb.driverName}
                      </span>
                    </div>

                    <div className="text-sm font-extrabold text-slate-900 mt-1">
                      {condition}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        From: {location}
                      </span>
                      <span className="flex items-center font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        <Bed className="w-3 h-3 mr-1" />
                        Target: {department}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: ETA Badge & Action Buttons */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200">
                  {/* Countdown ETA Badge */}
                  <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-center shadow-xs">
                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center space-x-1">
                      <Clock className="w-3 h-3 text-rose-500" />
                      <span>Inbound ETA</span>
                    </div>
                    <div className="text-xl font-black text-rose-600 animate-pulse">
                      {eta} mins
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <a
                      href={`tel:${amb.driverPhone}`}
                      className="p-2.5 bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-xl transition shadow-xs"
                      title={`Call driver (${amb.driverPhone})`}
                    >
                      <Phone className="w-4 h-4 text-emerald-600" />
                    </a>

                    <button
                      onClick={() => togglePrepareBay(inc.id, amb.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs ${
                        isBayReady
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isBayReady ? 'Bay Ready' : 'Prepare Bay'}</span>
                    </button>

                    <button
                      onClick={() => toggleAcknowledge(inc.id, amb.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center space-x-1.5 shadow-sm ${
                        isAck || inc.intakeAcknowledged
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
                      }`}
                    >
                      <span>{isAck || inc.intakeAcknowledged ? '✓ Acknowledged' : 'Acknowledge Intake'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
