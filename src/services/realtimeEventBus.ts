// =============================================================================
// MedMesh Real-Time Event Engine & WebSocket Simulation Bus
// Supports Cross-Tab Real-Time Sync via BroadcastChannel & In-Memory Pub/Sub
// =============================================================================

export type RealtimeEventType =
  | 'hospital:capacity:updated'
  | 'doctor:duty:toggled'
  | 'hospital:congestion:changed'
  | 'incident:created'
  | 'incident:dispatched'
  | 'incident:step:advanced'
  | 'surge:toggled'
  | 'ambulance:status:updated'
  | 'ambulance:dispatch:accepted'
  | 'incident:dispatch:rejected'
  | 'incident:reassigned'
  | 'ambulance:hospital:selected'
  | 'ambulance:location:updated'
  | 'hospital:reservation:confirmed'
  | 'hospital:intake:acknowledged'
  | 'assignment:created'
  | 'assignment:accepted'
  | 'assignment:rejected'
  | 'assignment:expired'
  | 'assignment:superseded';

export interface RealtimeEventEnvelope<T = any> {
  id: string;
  type: RealtimeEventType;
  room?: string; // e.g. "ambulance_amb-001", "dispatcher_district_dist-chennai", "*"
  timestamp: string; // ISO 8601
  hospitalId?: string;
  hospitalName?: string;
  districtId?: string;
  entityId?: string;
  payload: T;
  summary: string;
  severity: 'normal' | 'success' | 'warning' | 'critical';
}

type EventHandler<T = any> = (event: RealtimeEventEnvelope<T>) => void;

class RealtimeEventBusService {
  private channel: BroadcastChannel | null = null;
  private subscribers: Map<RealtimeEventType | '*', Set<EventHandler>> = new Map();
  private roomSubscribers: Map<string, Set<EventHandler>> = new Map();
  private recentEvents: RealtimeEventEnvelope[] = [];
  private readonly maxBufferedEvents = 30;
  private bufferListeners: Set<(events: RealtimeEventEnvelope[]) => void> = new Set();
  private isConnected = true;

  constructor() {
    // Check for browser BroadcastChannel support
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('medmesh_realtime_event_stream');
        this.channel.onmessage = (messageEvent: MessageEvent<RealtimeEventEnvelope>) => {
          this.dispatchLocal(messageEvent.data, false);
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported or restricted, falling back to in-memory bus', e);
      }
    }
  }

  /**
   * Subscribe to specific real-time event type or all events ('*')
   */
  public subscribe<T = any>(type: RealtimeEventType | '*', handler: EventHandler<T>): () => void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type)!.add(handler as EventHandler);

    return () => {
      const set = this.subscribers.get(type);
      if (set) {
        set.delete(handler as EventHandler);
      }
    };
  }

  /**
   * Room-Based Subscription (WebSocket Room Emulation)
   * Driver joins "ambulance_{ambulanceId}", Dispatcher joins "dispatcher_{districtId}", etc.
   */
  public subscribeRoom<T = any>(room: string, handler: EventHandler<T>): () => void {
    if (!this.roomSubscribers.has(room)) {
      this.roomSubscribers.set(room, new Set());
    }
    this.roomSubscribers.get(room)!.add(handler as EventHandler);

    return () => {
      const set = this.roomSubscribers.get(room);
      if (set) {
        set.delete(handler as EventHandler);
      }
    };
  }

  /**
   * Publish an event locally and broadcast across tabs via BroadcastChannel (WebSocket Simulation)
   */
  public publish<T = any>(
    type: RealtimeEventType,
    payload: T,
    meta: {
      room?: string;
      hospitalId?: string;
      hospitalName?: string;
      districtId?: string;
      entityId?: string;
      summary: string;
      severity?: 'normal' | 'success' | 'warning' | 'critical';
    }
  ): RealtimeEventEnvelope<T> {
    const envelope: RealtimeEventEnvelope<T> = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      room: meta.room,
      timestamp: new Date().toISOString(),
      hospitalId: meta.hospitalId,
      hospitalName: meta.hospitalName,
      districtId: meta.districtId,
      entityId: meta.entityId,
      payload,
      summary: meta.summary,
      severity: meta.severity || 'normal'
    };

    // Dispatch to local subscribers
    this.dispatchLocal(envelope, true);

    return envelope;
  }

  private dispatchLocal(event: RealtimeEventEnvelope, broadcastCrossTab: boolean): void {
    // Add to internal buffer
    this.recentEvents = [event, ...this.recentEvents.slice(0, this.maxBufferedEvents - 1)];

    // Notify buffer watchers
    this.bufferListeners.forEach(listener => listener(this.recentEvents));

    // Broadcast across tabs if origin
    if (broadcastCrossTab && this.channel) {
      try {
        this.channel.postMessage(event);
      } catch (err) {
        console.error('Failed to broadcast event via BroadcastChannel', err);
      }
    }

    // 1. Room-based dispatch (if event specifies a room)
    if (event.room) {
      const roomSubs = this.roomSubscribers.get(event.room);
      if (roomSubs) {
        roomSubs.forEach(handler => {
          try {
            handler(event);
          } catch (e) {
            console.error(`Error in room handler for [${event.room}]`, e);
          }
        });
      }

      // Also deliver to wildcard room subscribers (e.g. supervisors / superadmins)
      const wildcardRoomSubs = this.roomSubscribers.get('*');
      if (wildcardRoomSubs) {
        wildcardRoomSubs.forEach(handler => {
          try {
            handler(event);
          } catch (e) {
            console.error('Error in wildcard room handler', e);
          }
        });
      }
    }

    // 2. Type-based subscribers
    const typeSubs = this.subscribers.get(event.type);
    if (typeSubs) {
      typeSubs.forEach(handler => {
        try {
          handler(event);
        } catch (e) {
          console.error('Error in real-time event handler', e);
        }
      });
    }

    // 3. Notify wildcard type subscribers
    const wildcardSubs = this.subscribers.get('*');
    if (wildcardSubs) {
      wildcardSubs.forEach(handler => {
        try {
          handler(event);
        } catch (e) {
          console.error('Error in wildcard real-time handler', e);
        }
      });
    }
  }

  public getRecentEvents(): RealtimeEventEnvelope[] {
    return [...this.recentEvents];
  }

  public onBufferChange(listener: (events: RealtimeEventEnvelope[]) => void): () => void {
    this.bufferListeners.add(listener);
    return () => {
      this.bufferListeners.delete(listener);
    };
  }

  public getStatus(): { connected: boolean; transport: string } {
    return {
      connected: this.isConnected,
      transport: this.channel ? 'BroadcastChannel / WebSocket Gateway' : 'Memory EventBus'
    };
  }
}

export const realtimeEventBus = new RealtimeEventBusService();
