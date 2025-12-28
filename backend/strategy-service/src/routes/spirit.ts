import { FastifyPluginAsync } from 'fastify';
import Redis from 'ioredis';
import { config } from '../config/index.js';
import { SpiritEvent } from '@delta/common-types';

// Store for connected WebSocket clients
const clients = new Set<WebSocket>();

// Store for recent events (in-memory cache)
const eventHistory: SpiritEvent[] = [];
const MAX_HISTORY = 100;

// Current Spirit state
let currentState = {
  status: 'dormant' as string,
  lastHeartbeat: 0,
  lastEvent: null as SpiritEvent | null
};

export const spiritRoutes: FastifyPluginAsync = async (fastify) => {
  // Subscribe to Redis Spirit events channel
  const sub = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db
  });

  sub.subscribe('spirit:events', (err) => {
    if (err) {
      fastify.log.error({ err }, 'Failed to subscribe to spirit:events');
    } else {
      fastify.log.info('Subscribed to spirit:events Redis channel');
    }
  });

  sub.on('message', (channel, message) => {
    if (channel === 'spirit:events') {
      try {
        const event = JSON.parse(message) as SpiritEvent;

        // Update current state
        currentState = {
          status: event.spiritState || currentState.status,
          lastHeartbeat: Date.now(),
          lastEvent: event
        };

        // Add to history
        eventHistory.unshift(event);
        if (eventHistory.length > MAX_HISTORY) {
          eventHistory.pop();
        }

        // Broadcast to all connected WebSocket clients
        const payload = JSON.stringify({
          type: 'spirit_event',
          data: event
        });

        clients.forEach((client) => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(payload);
          }
        });

        // Log high priority events
        if (event.priority === 'p0' || event.priority === 'p1') {
          fastify.log.info({ event: event.title }, 'Spirit high priority event');
        }
      } catch (err) {
        fastify.log.error({ err, message }, 'Failed to parse spirit event');
      }
    }
  });

  // Cleanup on server close
  fastify.addHook('onClose', async () => {
    sub.disconnect();
    clients.clear();
  });

  // GET /spirit/status - Get current Spirit status
  fastify.get('/spirit/status', async () => {
    const now = Date.now();
    const isOnline = now - currentState.lastHeartbeat < 15000; // 15 second timeout

    return {
      status: isOnline ? currentState.status : 'offline',
      lastHeartbeat: currentState.lastHeartbeat,
      lastEvent: currentState.lastEvent,
      uptime: isOnline ? now - (eventHistory[eventHistory.length - 1]?.timestamp || now) : 0,
      connectedClients: clients.size
    };
  });

  // GET /spirit/history - Get event history
  fastify.get('/spirit/history', async (request) => {
    const { limit = 50 } = request.query as { limit?: number };
    return {
      events: eventHistory.slice(0, Math.min(limit, MAX_HISTORY)),
      total: eventHistory.length
    };
  });

  // WebSocket endpoint for real-time Spirit events
  fastify.get('/spirit/ws', { websocket: true }, (socket, req) => {
    fastify.log.info('Spirit WebSocket client connected');
    clients.add(socket as unknown as WebSocket);

    // Send current state on connect
    socket.send(JSON.stringify({
      type: 'init',
      data: {
        status: currentState.status,
        lastHeartbeat: currentState.lastHeartbeat,
        recentEvents: eventHistory.slice(0, 10)
      }
    }));

    socket.on('close', () => {
      fastify.log.info('Spirit WebSocket client disconnected');
      clients.delete(socket as unknown as WebSocket);
    });

    socket.on('error', (err) => {
      fastify.log.error({ err }, 'Spirit WebSocket error');
      clients.delete(socket as unknown as WebSocket);
    });
  });
};
