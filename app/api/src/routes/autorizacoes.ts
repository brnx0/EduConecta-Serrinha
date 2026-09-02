import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { legacyAutorizacaoRepository } from '../infra/legacyAutorizacaoRepository.js';
import { ACOES_POR_TIPO } from '../domain/autorizacao.js';

const listQuerySchema = z.object({
  alunoPesCod: z.coerce.number().int().positive(),
});

const responderParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const responderBodySchema = z.object({
  alunoPesCod: z.number().int().positive(),
  acao: z.enum(['aprovado', 'recusado', 'confirmada', 'nao_comparecera']),
});

/**
 * Verifica se o aluno informado está vinculado ao responsável logado.
 * Defesa contra IDOR: usuário não pode listar/responder por aluno alheio.
 */
function alunoPertenceAoResponsavel(
  user: { alunos: Array<{ pes_cod: number }> },
  alunoPesCod: number
): boolean {
  return user.alunos.some((a) => a.pes_cod === alunoPesCod);
}

const autorizacoesRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /autorizacoes?alunoPesCod=123
   *
   * Lista autorizações aplicáveis ao aluno (filtra por curso/escola/turma
   * do vínculo no ano letivo atual). Status `pendente` se ainda sem
   * resposta do responsável.
   *
   * Auth: JWT obrigatório. Aluno precisa pertencer ao responsável.
   *
   * Respostas:
   *   - 200 OK   array de itens (vazio se nada aplicável)
   *   - 400      validation
   *   - 403      aluno_nao_pertence
   */
  app.get('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'validation', details: parsed.error.errors });
    }

    if (!alunoPertenceAoResponsavel(req.user, parsed.data.alunoPesCod)) {
      return reply.code(403).send({
        error: 'aluno_nao_pertence',
        message: 'Aluno não está vinculado ao responsável autenticado.',
      });
    }

    const itens = await legacyAutorizacaoRepository.listarPorAluno(parsed.data.alunoPesCod);
    return reply.code(200).send(itens);
  });

  /**
   * POST /autorizacoes/:id/respostas
   *
   * Registra resposta do responsável. `tmh_cod` é resolvido no backend
   * via lookup no vínculo ativo do aluno (não confia em input).
   *
   * Respostas:
   *   - 201 Created     { ok: true }
   *   - 400             validation
   *   - 403             aluno_nao_pertence
   *   - 404             autorizacao_nao_encontrada / sem_vinculo_ativo
   *   - 409             ja_respondida
   *   - 422             acao_incompativel  (ex.: 'aprovado' em tipo 'P')
   */
  app.post('/:id/respostas', { onRequest: [app.authenticate] }, async (req, reply) => {
    const paramsParsed = responderParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return reply.code(400).send({ error: 'validation', details: paramsParsed.error.errors });
    }

    const bodyParsed = responderBodySchema.safeParse(req.body);
    if (!bodyParsed.success) {
      return reply.code(400).send({ error: 'validation', details: bodyParsed.error.errors });
    }

    const { id: autorizacaoId } = paramsParsed.data;
    const { alunoPesCod, acao } = bodyParsed.data;

    if (!alunoPertenceAoResponsavel(req.user, alunoPesCod)) {
      return reply.code(403).send({
        error: 'aluno_nao_pertence',
        message: 'Aluno não está vinculado ao responsável autenticado.',
      });
    }

    const tipo = await legacyAutorizacaoRepository.getTipo(autorizacaoId);
    if (!tipo) {
      return reply.code(404).send({
        error: 'autorizacao_nao_encontrada',
        message: 'Autorização não existe.',
      });
    }

    if (!ACOES_POR_TIPO[tipo].includes(acao)) {
      return reply.code(422).send({
        error: 'acao_incompativel',
        message: `Ação "${acao}" não é válida para autorização do tipo "${tipo}".`,
        acoesPermitidas: ACOES_POR_TIPO[tipo],
      });
    }

    const tmhCod = await legacyAutorizacaoRepository.getTmhCodAtivo(alunoPesCod);
    if (!tmhCod) {
      return reply.code(404).send({
        error: 'sem_vinculo_ativo',
        message: 'Aluno não possui matrícula ativa no ano letivo atual.',
      });
    }

    const resultado = await legacyAutorizacaoRepository.criarResposta({
      autorizacaoId,
      alunoPesCod,
      responsavelNome: req.user.responsavel_nome,
      acao,
      tmhCod,
    });

    if (resultado === 'ja_respondida') {
      return reply.code(409).send({
        error: 'ja_respondida',
        message: 'Esta autorização já foi respondida.',
      });
    }

    return reply.code(201).send({ ok: true });
  });
};

export default autorizacoesRoutes;
