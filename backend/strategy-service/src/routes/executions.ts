import { FastifyInstance } from 'fastify';
import { ExecutionService } from '../services/execution.service.js';
import { z } from 'zod';

const executeStrategySchema = z.object({
  strategyId: z.string().uuid(),
  executionType: z.enum(['BUY', 'SELL', 'CLOSE']),
  side: z.enum(['BUY', 'SELL']),
  type: z.enum(['MARKET', 'LIMIT']),
  amount: z.number().positive(),
  price: z.number().positive().optional(),
  signalData: z.record(z.any()).optional(),
});

export async function executionRoutes(fastify: FastifyInstance, service: ExecutionService) {
  fastify.post('/executions', async (request, reply) => {
    const data = executeStrategySchema.parse(request.body);
    const execution = await service.createExecution(data);
    return { success: true, data: execution };
  });

  fastify.get('/executions', async (request, reply) => {
    const query = request.query as any;
    const result = await service.listExecutions(query);
    return { success: true, ...result };
  });

  fastify.get('/executions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const execution = await service.getExecution(id);
    if (!execution) {
      return reply.code(404).send({ success: false, error: 'Execution not found' });
    }
    return { success: true, data: execution };
  });
}
