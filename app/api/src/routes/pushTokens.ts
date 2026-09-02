import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const createSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(['ios', 'android']),
  deviceId: z.string().optional(),
});

const pushTokensRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'validation', details: parsed.error.errors });
    }
    const { token, platform, deviceId } = parsed.data;
    const userId = req.user.usr_codigo;

    const row = await app.prisma.pushToken.upsert({
      where: { token },
      create: { token, platform, deviceId, userId },
      update: { lastUsedAt: new Date(), userId, platform, deviceId },
    });

    return reply.code(200).send({ id: row.id });
  });

  app.delete('/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = req.user.usr_codigo;

    const existing = await app.prisma.pushToken.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return reply.code(404).send({ error: 'not_found' });
    }

    await app.prisma.pushToken.delete({ where: { id } });
    return reply.code(204).send();
  });
};

export default pushTokensRoutes;
