import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { legacyConteudoRepository } from '../infra/legacyConteudoRepository.js';

const querySchema = z.object({
  pesCodAluno: z.coerce.number().int().positive(),
  anoLetivo: z.coerce.number().int().min(2000).max(2100),
});

const conteudosRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /conteudos?pesCodAluno=X&anoLetivo=2025
   * Lista de planos de aula visíveis pro aluno.
   */
  app.get('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'validation', details: parsed.error.errors });
    }

    const itens = await legacyConteudoRepository.findConteudos(parsed.data);
    return reply.code(200).send(itens);
  });
};

export default conteudosRoutes;
