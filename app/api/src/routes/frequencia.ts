import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { legacyFrequenciaRepository } from '../infra/legacyFrequenciaRepository.js';

const querySchema = z.object({
  pesCodAluno: z.coerce.number().int().positive(),
  ano: z.coerce.number().int().min(2000).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
});

/**
 * GET /frequencia?pesCodAluno=X&ano=2025&mes=3
 *
 * Frequência diária do aluno no mês. Substitui POST /getFrequencia.rule.
 *
 * Auth: JWT obrigatório.
 *
 * Retorna 1 row por dia do mês com status_dia (Presente/Ausente/Parcialmente
 * Presente/null) e cor (hex pra UI calendário).
 */
const frequenciaRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'validation', details: parsed.error.errors });
    }

    const dias = await legacyFrequenciaRepository.findFrequenciaMensal({
      pesCodAluno: parsed.data.pesCodAluno,
      ano: parsed.data.ano,
      mes: parsed.data.mes,
    });

    return reply.code(200).send(dias);
  });
};

export default frequenciaRoutes;
