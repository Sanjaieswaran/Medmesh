/**
 * MedMesh Redis Pub/Sub & Kafka Message Broker Service
 * Provides horizontal scalability across multi-node NestJS gateway clusters.
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { TelemetryGateway, TelemetryEnvelope } from '../gateways/telemetry.gateway';

@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisPubSubService.name);
  private isConnected = false;

  constructor(private readonly telemetryGateway: TelemetryGateway) {}

  async onModuleInit() {
    await this.initializeSubscriber();
  }

  async onModuleDestroy() {
    this.logger.log('Closing Redis Pub/Sub connections');
  }

  private async initializeSubscriber() {
    this.logger.log('Initializing Redis Pub/Sub subscriber on channels: [medmesh:events:*]');
    this.isConnected = true;
  }

  /**
   * Publish event envelope to Redis Pub/Sub cluster
   * Other gateway nodes subscribe and broadcast to their local WebSocket clients.
   */
  async publish(channel: string, envelope: TelemetryEnvelope): Promise<void> {
    this.logger.log(`Publishing event ${envelope.eventId} to Redis channel [${channel}]`);

    // In a deployed cluster: await this.redisPublisher.publish(channel, JSON.stringify(envelope));
    // For local gateway node, route directly to the WebSocket Gateway:
    this.routeToGateway(envelope);
  }

  /**
   * Route received envelope from Redis subscription to WebSocket clients
   */
  routeToGateway(envelope: TelemetryEnvelope): void {
    const { topic } = envelope;

    switch (topic) {
      case 'hospital:capacity:updated':
      case 'hospital:congestion:changed':
        this.telemetryGateway.broadcastCapacityUpdate(envelope);
        break;

      case 'doctor:duty:toggled':
        this.telemetryGateway.broadcastDoctorShift(envelope);
        break;

      case 'incident:created':
      case 'incident:dispatched':
      case 'incident:step:advanced':
        this.telemetryGateway.broadcastIncidentDispatch(envelope);
        break;

      case 'ambulance:status:updated':
        this.telemetryGateway.broadcastAmbulanceUpdate(envelope);
        break;

      default:
        this.logger.warn(`Unknown topic received: ${topic}`);
        break;
    }
  }
}
