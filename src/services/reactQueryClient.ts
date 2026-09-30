import { QueryClient } from '@tanstack/react-query';
import { realtimeEventBus } from './realtimeEventBus';

/**
 * MedMesh Production Query Client
 * Configured with healthcare real-time telemetry caching SLA.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 15, // 15 seconds SLA freshness
      gcTime: 1000 * 60 * 10, // 10 minutes cache retention
      refetchOnWindowFocus: true,
      retry: 2
    }
  }
});

/**
 * Query Key Constants
 */
export const QUERY_KEYS = {
  HOSPITALS: ['hospitals'] as const,
  HOSPITAL_DETAIL: (id: string) => ['hospitals', id] as const,
  DOCTORS: ['doctors'] as const,
  INCIDENTS: ['incidents'] as const,
  AMBULANCES: ['ambulances'] as const,
  DISTRICT_METRICS: ['districtMetrics'] as const,
  AUDIT_LOGS: ['auditLogs'] as const
};

/**
 * Automatic Cache Invalidation Service
 * Subscribes to real-time telemetry WebSocket packets and invalidates
 * React Query cache keys instantly without requiring manual refetches.
 */
realtimeEventBus.subscribe('*', (packet) => {
  const { type, hospitalId, entityId } = packet;
  const targetId = hospitalId || entityId;

  switch (type) {
    case 'hospital:capacity:updated':
    case 'hospital:congestion:changed':
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOSPITALS });
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOSPITAL_DETAIL(targetId) });
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DISTRICT_METRICS });
      break;

    case 'doctor:duty:toggled':
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DOCTORS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOSPITALS });
      break;

    case 'incident:created':
    case 'incident:dispatched':
    case 'incident:step:advanced':
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INCIDENTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AMBULANCES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOSPITALS });
      break;

    case 'ambulance:status:updated':
    case 'ambulance:hospital:selected':
    case 'ambulance:location:updated':
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AMBULANCES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INCIDENTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOSPITALS });
      break;

    case 'surge:toggled':
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DISTRICT_METRICS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOSPITALS });
      break;

    default:
      break;
  }
});
