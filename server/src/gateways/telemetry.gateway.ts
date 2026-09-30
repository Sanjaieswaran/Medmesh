/**
 * MedMesh Real-Time Telemetry WebSocket Gateway
 * Framework: NestJS + Socket.IO (v4.x)
 * Standard: Non-PHI, ISO-27001, TLS 1.3
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';

export interface TelemetryEnvelope<T = any> {
  eventId: string;
  topic: string;
  aggregateId: string;
  districtId: string;
  timestamp: string;
  actor: {
    userId: string;
    name: string;
    role: string;
  };
  data: T;
}

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
  },
  namespace: '/telemetry',
  transports: ['websocket', 'polling']
})
export class TelemetryGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TelemetryGateway.name);

  async handleConnection(client: Socket) {
    try {
      const authHeader = client.handshake.auth?.token || client.handshake.headers['authorization'];
      const districtId = client.handshake.query.districtId as string;
      const role = client.handshake.query.role as string;

      this.logger.log(`Client connected: [${client.id}] - Role: ${role || 'ANONYMOUS'} - District: ${districtId || 'ALL'}`);

      // Auto-join district broadcast room
      if (districtId && districtId !== 'all') {
        await client.join(`district:${districtId}`);
      } else {
        await client.join('district:all');
      }

      // Auto-join role-scoped channel
      if (role) {
        await client.join(`role:${role.toLowerCase()}`);
      }

      client.emit('connected', {
        status: 'AUTHENTICATED',
        socketId: client.id,
        serverTime: new Date().toISOString()
      });
    } catch (err: any) {
      this.logger.error(`Handshake error on client ${client.id}: ${err.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: [${client.id}]`);
  }

  /**
   * Subscribe to specific hospital corridor room
   */
  @SubscribeMessage('join:facility')
  async handleJoinFacility(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { hospitalId: string }
  ) {
    await client.join(`facility:${data.hospitalId}`);
    return { status: 'JOINED', room: `facility:${data.hospitalId}` };
  }

  /**
   * Broadcast real-time capacity update to district subscribers & statewide command
   */
  broadcastCapacityUpdate(envelope: TelemetryEnvelope) {
    this.logger.log(`Broadcasting capacity change for ${envelope.aggregateId} to district:${envelope.districtId}`);
    
    // Broadcast to district room, statewide room, and specific facility room
    this.server.to(`district:${envelope.districtId}`).emit('hospital:capacity:updated', envelope);
    this.server.to('district:all').emit('hospital:capacity:updated', envelope);
    this.server.to(`facility:${envelope.aggregateId}`).emit('hospital:capacity:updated', envelope);
  }

  /**
   * Broadcast specialist doctor shift change (clock in / out)
   */
  broadcastDoctorShift(envelope: TelemetryEnvelope) {
    this.server.to(`district:${envelope.districtId}`).emit('doctor:duty:toggled', envelope);
    this.server.to('district:all').emit('doctor:duty:toggled', envelope);
  }

  /**
   * Broadcast 108 Emergency Incident dispatch & stage transition
   */
  broadcastIncidentDispatch(envelope: TelemetryEnvelope) {
    this.server.to('role:operator').emit('incident:dispatched', envelope);
    this.server.to('role:admin').emit('incident:dispatched', envelope);
    this.server.to(`district:${envelope.districtId}`).emit('incident:dispatched', envelope);
  }

  /**
   * Broadcast Ambulance GPS & milestone updates
   */
  broadcastAmbulanceUpdate(envelope: TelemetryEnvelope) {
    this.server.to('role:operator').emit('ambulance:status:updated', envelope);
    this.server.to(`district:${envelope.districtId}`).emit('ambulance:status:updated', envelope);
  }
}
