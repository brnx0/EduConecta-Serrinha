import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { legacyAvisoRepository } from '../infra/legacyAvisoRepository.js';

const querySchema = z.object({
  escolaCod: z.coerce.number().int().positive(),
  pesCodAluno: z.coerce.number().int().positive(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

/**
 * GET /mural/avisos?escolaCod=X&pesCodAluno=Y&limit=5
 *
 * Lista avisos publicados no mural escolar do aluno.
 * Substitui POST /getMuralAvisos.rule do Maker.
 *
 * Auth: JWT obrigatório.
 */
const muralRoutes: FastifyPluginAsync = async (app) => {
  app.get('/avisos', { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'validation', details: parsed.error.errors });
    }

    const avisos = await legacyAvisoRepository.findAvisosPorEscolaEAluno({
      escolaCod: parsed.data.escolaCod,
      pesCodAluno: parsed.data.pesCodAluno,
      limite: parsed.data.limit,
    });

    return reply.code(200).send(avisos);
  });
};

export default muralRoutes;
