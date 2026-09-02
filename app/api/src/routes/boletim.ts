import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { legacyBoletimRepository } from '../infra/legacyBoletimRepository.js';

const querySchema = z.object({
  pesCodAluno: z.coerce.number().int().positive(),
  anoLetivo: z.coerce.number().int().min(2000).max(2100),
});

/**
 * GET /boletim?pesCodAluno=X&anoLetivo=2025
 *
 * Boletim escolar do aluno no ano letivo. Substitui POST /getBoletimEscolar.rule.
 *
 * Auth: JWT obrigatório.
 *
 * NOTA: idealmente o backend valida que o aluno pertence ao responsável
 * autenticado (JWT.cpf → GER_PESSOA_FISICA.PFI_CPF_RESP). Por agora confia
 * no `pesCodAluno` enviado — adicionar verificação como follow-up de
 * autorização.
 */
const boletimRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'validation', details: parsed.error.errors });
    }

    const itens = await legacyBoletimRepository.findBoletim({
      pesCodAluno: parsed.data.pesCodAluno,
      anoLetivo: parsed.data.anoLetivo,
    });

    return reply.code(200).send(itens);
  });
};

export default boletimRoutes;
