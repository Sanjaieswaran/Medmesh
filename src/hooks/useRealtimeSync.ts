import { useState, useEffect, useCallback } from 'react';
import { realtimeEventBus, RealtimeEventEnvelope, RealtimeEventType } from '../services/realtimeEventBus';

export interface FlashState {
  type: 'green' | 'red';
  timestamp: number;
}

export function useRealtimeSync() {
  const [recentEvents, setRecentEvents] = useState<RealtimeEventEnvelope[]>(() => realtimeEventBus.getRecentEvents());
  const [flashingEntities, setFlashingEntities] = useState<Map<string, FlashState>>(new Map());
  const [latestEvent, setLatestEvent] = useState<RealtimeEventEnvelope | null>(null);

  useEffect(() => {
    // Listen to buffer changes
    const unsubBuffer = realtimeEventBus.onBufferChange((events) => {
      setRecentEvents(events);
    });

    // Listen to all real-time events for visual flash triggers
    const unsubEvents = realtimeEventBus.subscribe('*', (event) => {
      setLatestEvent(event);

      const targetId = event.hospitalId || event.entityId;
      if (targetId) {
        const isCritical =
          event.severity === 'critical' ||
          (event.payload && (event.payload.availableBeds === 0 || event.payload.availableIcu === 0 || event.payload.congestion === 'Critical'));

        const flashType: 'green' | 'red' = isCritical ? 'red' : 'green';

        setFlashingEntities(prev => {
          const next = new Map(prev);
          next.set(targetId, { type: flashType, timestamp: Date.now() });
          return next;
        });

        // Clear flash after 2500ms
        setTimeout(() => {
          setFlashingEntities(prev => {
            const next = new Map(prev);
            const current = next.get(targetId);
            if (current && Date.now() - current.timestamp >= 2400) {
              next.delete(targetId);
            }
            return next;
          });
        }, 2500);
      }
    });

    return () => {
      unsubBuffer();
      unsubEvents();
    };
  }, []);

  const getFlashClass = useCallback((id: string): string => {
    const flash = flashingEntities.get(id);
    if (!flash) return '';
    return flash.type === 'red' ? 'animate-pulse-critical-red' : 'animate-flash-green';
  }, [flashingEntities]);

  const isFlashing = useCallback((id: string): boolean => {
    return flashingEntities.has(id);
  }, [flashingEntities]);

  const getFlashType = useCallback((id: string): 'green' | 'red' | null => {
    return flashingEntities.get(id)?.type || null;
  }, [flashingEntities]);

  return {
    recentEvents,
    latestEvent,
    getFlashClass,
    isFlashing,
    getFlashType,
    status: realtimeEventBus.getStatus()
  };
}
