import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { legacyOcorrenciaRepository } from '../infra/legacyOcorrenciaRepository.js';

const listQuerySchema = z.object({
  pesCodAluno: z.coerce.number().int().positive(),
  anoLetivo: z.coerce.number().int().min(2000).max(2100),
});

const cienteParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const ocorrenciasRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /ocorrencias?pesCodAluno=X&anoLetivo=2025
   */
  app.get('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'validation', details: parsed.error.errors });
    }

    const itens = await legacyOcorrenciaRepository.findOcorrencias(parsed.data);
    return reply.code(200).send(itens);
  });

  /**
   * PATCH /ocorrencias/:id/ciente
   * Marca ocorrência como "responsável ciente". `usrCodigo` vem do JWT.
   */
  app.patch('/:id/ciente', { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = cienteParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'validation', details: parsed.error.errors });
    }

    await legacyOcorrenciaRepository.marcarCiente({
      ocorrenciaId: parsed.data.id,
      usrCodigo: req.user.usr_codigo,
    });

    return reply.code(204).send();
  });
};

export default ocorrenciasRoutes;
