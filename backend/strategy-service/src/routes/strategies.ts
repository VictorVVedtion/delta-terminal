import { FastifyInstance } from 'fastify';
import { StrategyService } from '../services/strategy.service.js';
import { z } from 'zod';

const createStrategySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.enum(['SPOT', 'FUTURES', 'GRID', 'DCA', 'ARBITRAGE', 'CUSTOM']),
  exchange: z.string(),
  symbol: z.string(),
  initialCapital: z.number().positive(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EXTREME']).optional(),
  config: z.record(z.any()),
  templateId: z.string().uuid().optional(),
  autoStart: z.boolean().optional(),
});

export async function strategyRoutes(fastify: FastifyInstance, service: StrategyService) {
  fastify.post('/strategies', async (request, _reply) => {
    const userId = (request as any).user.id;
    const data = createStrategySchema.parse(request.body);
    const strategy = await service.createStrategy(userId, data as any);
    return { success: true, data: strategy };
  });

  fastify.get('/strategies', async (request, _reply) => {
    const userId = (request as any).user.id;
    const query = request.query as any;
    const result = await service.getUserStrategies(userId, query);
    return { success: true, ...result };
  });

  fastify.get('/strategies/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const strategy = await service.getStrategy(id);
    if (!strategy) {
      return reply.code(404).send({ success: false, error: 'Strategy not found' });
    }
    return { success: true, data: strategy };
  });

  fastify.put('/strategies/:id', async (request, _reply) => {
    const { id } = request.params as { id: string };
    const strategy = await service.updateStrategy(id, request.body as any);
    return { success: true, data: strategy };
  });

  fastify.delete('/strategies/:id', async (request, _reply) => {
    const { id } = request.params as { id: string };
    await service.deleteStrategy(id);
    return { success: true };
  });

  fastify.post('/strategies/:id/start', async (request, _reply) => {
    const { id } = request.params as { id: string };
    const strategy = await service.startStrategy(id);
    return { success: true, data: strategy };
  });

  fastify.post('/strategies/:id/pause', async (request, _reply) => {
    const { id } = request.params as { id: string };
    const strategy = await service.pauseStrategy(id);
    return { success: true, data: strategy };
  });

  fastify.post('/strategies/:id/stop', async (request, _reply) => {
    const { id } = request.params as { id: string };
    const strategy = await service.stopStrategy(id);
    return { success: true, data: strategy };
  });

  fastify.post('/strategies/:id/share', async (request, _reply) => {
    const { id } = request.params as { id: string };
    const strategy = await service.shareStrategy(id);
    return { success: true, data: { shareCode: strategy.shareCode } };
  });
}
