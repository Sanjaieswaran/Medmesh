import { useQuery } from '@tanstack/react-query';
import { useMedMesh } from '../store/useMedMeshStore';
import { QUERY_KEYS } from '../services/reactQueryClient';
import { Hospital, Doctor, Incident, Ambulance, DistrictMetric } from '../types';

/**
 * useHospitalsQuery
 * React Query hook providing live hospital capacity data.
 * Automatically invalidated and re-synchronized when WebSocket
 * capacity change packets arrive.
 */
export const useHospitalsQuery = (districtId?: string) => {
  const { hospitals } = useMedMesh();

  return useQuery<Hospital[]>({
    queryKey: QUERY_KEYS.HOSPITALS,
    queryFn: async () => {
      // In production: return fetch(`/api/v1/hospitals?district=${districtId}`).then(r => r.json());
      // Local sync: returns the store state which is kept up-to-date by realtimeEventBus
      if (!districtId || districtId === 'all') return hospitals;
      return hospitals.filter(h => h.districtId === districtId);
    },
    initialData: districtId && districtId !== 'all' 
      ? hospitals.filter(h => h.districtId === districtId)
      : hospitals
  });
};

/**
 * useDoctorsQuery
 * React Query hook providing live on-duty doctor roster.
 * Automatically invalidated when duty toggled events arrive.
 */
export const useDoctorsQuery = () => {
  const { hospitals } = useMedMesh();

  return useQuery<Doctor[]>({
    queryKey: QUERY_KEYS.DOCTORS,
    queryFn: async () => {
      return hospitals.flatMap(h => h.doctors);
    },
    initialData: hospitals.flatMap(h => h.doctors)
  });
};

/**
 * useIncidentsQuery
 * React Query hook for 108 CAD live emergency queue.
 */
export const useIncidentsQuery = (districtId?: string) => {
  const { incidents } = useMedMesh();

  return useQuery<Incident[]>({
    queryKey: QUERY_KEYS.INCIDENTS,
    queryFn: async () => {
      if (!districtId || districtId === 'all') return incidents;
      return incidents.filter(i => !i.districtId || i.districtId === districtId);
    },
    initialData: districtId && districtId !== 'all'
      ? incidents.filter(i => !i.districtId || i.districtId === districtId)
      : incidents
  });
};

/**
 * useAmbulancesQuery
 * React Query hook for EMS vehicle telemetry.
 */
export const useAmbulancesQuery = () => {
  const { ambulances } = useMedMesh();

  return useQuery<Ambulance[]>({
    queryKey: QUERY_KEYS.AMBULANCES,
    queryFn: async () => ambulances,
    initialData: ambulances
  });
};
