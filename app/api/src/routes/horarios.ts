import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { legacyHorarioRepository } from '../infra/legacyHorarioRepository.js';

const querySchema = z.object({
  pesCodAluno: z.coerce.number().int().positive(),
  anoLetivo: z.coerce.number().int().min(2000).max(2100),
});

/**
 * GET /horarios?pesCodAluno=X&anoLetivo=2025
 *
 * Quadro de horários semanal do aluno. Substitui POST /getHorarios.rule.
 *
 * Auth: JWT obrigatório.
 */
const horariosRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'validation', details: parsed.error.errors });
    }

    const itens = await legacyHorarioRepository.findHorarios({
      pesCodAluno: parsed.data.pesCodAluno,
      anoLetivo: parsed.data.anoLetivo,
    });

    return reply.code(200).send(itens);
  });
};

export default horariosRoutes;
