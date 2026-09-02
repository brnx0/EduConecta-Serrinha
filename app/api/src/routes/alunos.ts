import type { FastifyPluginAsync } from 'fastify';
import { legacyAlunoRepository } from '../infra/legacyAlunoRepository.js';

/**
 * GET /alunos
 *
 * Lista alunos vinculados ao responsável autenticado (via JWT).
 * Substitui POST /getAlunos.rule do Maker.
 *
 * Auth: JWT obrigatório. CPF do responsável vem do payload (claim `cpf`).
 *
 * Resposta: 200 OK + array de alunos com 25+ campos (ver AlunoCompleto).
 */
const alunosRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    const cpf = req.user.cpf;
    if (!cpf) {
      return reply.code(401).send({ error: 'unauthorized' });
    }

    const alunos = await legacyAlunoRepository.findAlunosCompletosPorCpfResponsavel(cpf);
    return reply.code(200).send(alunos);
  });
};

export default alunosRoutes;
