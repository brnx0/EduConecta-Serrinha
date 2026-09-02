import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { legacyCalendarioRepository } from '../infra/legacyCalendarioRepository.js';

const calendarioQuerySchema = z.object({
  pesCodAluno: z.coerce.number().int().positive(),
  ano: z.coerce.number().int().min(2000).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
});

const diasLetivosQuerySchema = z.object({
  pesCodAluno: z.coerce.number().int().positive(),
  anoLetivo: z.coerce.number().int().min(2000).max(2100),
});

const calendarioRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /calendario?pesCodAluno=X&ano=2025&mes=3
   * Retorna { calendario: [], atividades: [] }
   */
  app.get('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = calendarioQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'validation', details: parsed.error.errors });
    }

    const [calendario, atividades] = await Promise.all([
      legacyCalendarioRepository.findCalendarioMensal(parsed.data),
      legacyCalendarioRepository.findAtividadesMensal(parsed.data),
    ]);

    return reply.code(200).send({ calendario, atividades });
  });

  /**
   * GET /calendario/dias-letivos?pesCodAluno=X&anoLetivo=2025
   */
  app.get('/dias-letivos', { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = diasLetivosQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'validation', details: parsed.error.errors });
    }

    const itens = await legacyCalendarioRepository.findDiasLetivosPorUnidade({
      pesCodAluno: parsed.data.pesCodAluno,
      anoLetivo: parsed.data.anoLetivo,
    });

    return reply.code(200).send(itens);
  });
};

export default calendarioRoutes;
