import { FastifyInstance } from 'fastify';
import { TemplateService } from '../services/template.service.js';
import { z } from 'zod';

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.string(),
  type: z.enum(['SPOT', 'FUTURES', 'GRID', 'DCA', 'ARBITRAGE', 'CUSTOM']),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EXTREME']).optional(),
  config: z.record(z.any()),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
});

export async function templateRoutes(fastify: FastifyInstance, service: TemplateService) {
  fastify.post('/templates', async (request, reply) => {
    const userId = (request as any).user.id;
    const data = createTemplateSchema.parse(request.body);
    const template = await service.createTemplate(userId, data);
    return { success: true, data: template };
  });

  fastify.get('/templates', async (request, reply) => {
    const query = request.query as any;
    const result = await service.listTemplates(query);
    return { success: true, ...result };
  });

  fastify.get('/templates/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const template = await service.getTemplate(id);
    if (!template) {
      return reply.code(404).send({ success: false, error: 'Template not found' });
    }
    return { success: true, data: template };
  });

  fastify.delete('/templates/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.deleteTemplate(id);
    return { success: true };
  });
}
