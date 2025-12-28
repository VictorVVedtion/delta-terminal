import Redis from 'ioredis';
import { config } from '../../config/index.js';
import { FastifyBaseLogger } from 'fastify';
import { SpiritEvent, SpiritEventType, SpiritPriority, SpiritState } from '@delta/common-types';
import crypto from 'crypto';

export class SpiritEmitter {
  private pub: Redis;
  private logger: FastifyBaseLogger;
  private channel = 'spirit:events';

  constructor(logger: FastifyBaseLogger) {
    this.logger = logger;
    this.pub = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db
    });
  }

  public async publish(
    type: SpiritEventType,
    priority: SpiritPriority,
    spiritState: SpiritState,
    title: string,
    content: string,
    metadata?: Record<string, any>
  ) {
    const event: SpiritEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type,
      priority,
      spiritState,
      title,
      content,
      metadata
    };

    try {
      await this.pub.publish(this.channel, JSON.stringify(event));
      // Log critical events
      if (priority === 'p0' || priority === 'p1') {
        this.logger.info({ event }, 'Spirit high priority event published');
      }
    } catch (err) {
      this.logger.error({ err, event }, 'Failed to publish Spirit event');
    }
  }

  public async close() {
    this.pub.disconnect();
  }
}

