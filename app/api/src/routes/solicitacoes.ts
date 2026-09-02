import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { legacySolicitacaoRepository } from '../infra/legacySolicitacaoRepository.js';

const cpfRegex = /^\d{11}$/;

const listQuerySchema = z.object({
  tipo: z.coerce.number().int().positive(),
});

const portadorSchema = z.object({
  tipoSolicitacao: z.number().int().positive(),
  alunoPesCod: z.number().int().positive(),
  portador: z.object({
    nome: z.string().min(1).max(100),
    cpf: z.string().regex(cpfRegex, 'CPF deve ter 11 dígitos numéricos'),
    rg: z.string().min(1).max(20),
    telefone: z.string().min(8).max(20),
    parentesco: z.string().min(1).max(50),
  }),
});

const idParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const atualizarDadosSchema = z.object({
  dados: z.record(z.string(), z.unknown()),
});

const atualizacaoCadastralSchema = z.object({
  tipoSolicitacao: z.number().int().positive(),
  alunoPesCod: z.number().int().positive(),
  descricao: z.string().min(1).max(2000),
  arquivos: z
    .array(
      z.object({
        nome: z.string().min(1).max(255),
        formato: z.string().min(1).max(20),
        conteudo: z.string().min(1),
      })
    )
    .max(10),
});

function alunoPertenceAoResponsavel(
  user: { alunos: Array<{ pes_cod: number }> },
  alunoPesCod: number
): boolean {
  return user.alunos.some((a) => a.pes_cod === alunoPesCod);
}

const solicitacoesRoutes: FastifyPluginAsync = async (app) => {
  /** GET /solicitacoes/tipos */
  app.get('/tipos', { onRequest: [app.authenticate] }, async (_req, reply) => {
    const tipos = await legacySolicitacaoRepository.listarTipos();
    return reply.code(200).send(tipos);
  });

  /** GET /solicitacoes?tipo=N */
  app.get('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'validation', details: parsed.error.errors });
    }

    const itens = await legacySolicitacaoRepository.listarPorUsuarioETipo(
      req.user.usr_codigo,
      parsed.data.tipo
    );
    return reply.code(200).send(itens);
  });

  /**
   * POST /solicitacoes/portador
   *
   * Cria solicitação de cadastro de portador (autorização de saída).
   * Valida CPF não cadastrado em EDU_AUTORIZACAO_DE_SAIDA nem com
   * solicitação pendente em EDC_SOLICITACAO.
   *
   * Respostas:
   *  - 201 { id }
   *  - 400 validation
   *  - 403 aluno_nao_pertence
   *  - 409 cpf_duplicado (com `motivo`)
   */
  app.post('/portador', { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = portadorSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'validation', details: parsed.error.errors });
    }
    const { tipoSolicitacao, alunoPesCod, portador } = parsed.data;

    if (!alunoPertenceAoResponsavel(req.user, alunoPesCod)) {
      return reply.code(403).send({
        error: 'aluno_nao_pertence',
        message: 'Aluno não está vinculado ao responsável autenticado.',
      });
    }

    const dup = await legacySolicitacaoRepository.checarPortadorDuplicado(
      portador.cpf,
      tipoSolicitacao
    );
    if (dup.duplicado) {
      return reply.code(409).send({
        error: 'cpf_duplicado',
        message: dup.motivo,
      });
    }

    const id = await legacySolicitacaoRepository.criar({
      usrCodigo: req.user.usr_codigo,
      tipoSolicitacao,
      alunoPesCod,
      dadosJson: JSON.stringify(portador),
    });

    return reply.code(201).send({ id });
  });

  /**
   * PATCH /solicitacoes/:id
   *
   * Atualiza `SOL_DADOS` de uma solicitação existente. Só permite ao
   * dono e enquanto status = 'pendente'.
   *
   * Body: { dados }
   *
   * Respostas:
   *  - 200 { ok: true }
   *  - 400 validation
   *  - 403 nao_e_dono | nao_editavel (status != pendente)
   *  - 404 nao_encontrada
   */
  app.patch('/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const params = idParamsSchema.safeParse(req.params);
    if (!params.success) {
      return reply.code(400).send({ error: 'validation', details: params.error.errors });
    }
    const body = atualizarDadosSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'validation', details: body.error.errors });
    }

    const dono = await legacySolicitacaoRepository.getDono(params.data.id);
    if (!dono) {
      return reply.code(404).send({ error: 'nao_encontrada' });
    }
    if (dono.usrCodigo !== req.user.usr_codigo) {
      return reply.code(403).send({ error: 'nao_e_dono' });
    }
    if ((dono.status ?? '').toUpperCase() !== 'P') {
      return reply.code(403).send({
        error: 'nao_editavel',
        message: 'Solicitação já foi avaliada e não pode ser editada.',
      });
    }

    await legacySolicitacaoRepository.atualizarDados({
      solicitacaoId: params.data.id,
      dadosJson: JSON.stringify(body.data.dados),
    });

    return reply.code(200).send({ ok: true });
  });

  /**
   * DELETE /solicitacoes/:id
   *
   * Remove solicitação + anexos. Só dono. Idempotente do ponto de
   * vista do cliente (404 se já removida).
   */
  app.delete('/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const params = idParamsSchema.safeParse(req.params);
    if (!params.success) {
      return reply.code(400).send({ error: 'validation', details: params.error.errors });
    }

    const dono = await legacySolicitacaoRepository.getDono(params.data.id);
    if (!dono) {
      return reply.code(404).send({ error: 'nao_encontrada' });
    }
    if (dono.usrCodigo !== req.user.usr_codigo) {
      return reply.code(403).send({ error: 'nao_e_dono' });
    }

    await legacySolicitacaoRepository.excluir(params.data.id);
    return reply.code(204).send();
  });

  /**
   * POST /solicitacoes/atualizacao-cadastral
   *
   * Cria solicitação tipo "atualização cadastral" com anexos em base64.
   * Limite 10 arquivos por requisição. Mantido base64 conforme legado.
   *
   * Body: { tipoSolicitacao, alunoPesCod, descricao, arquivos[] }
   *
   * Respostas:
   *  - 201 { id }
   *  - 400 validation
   *  - 403 aluno_nao_pertence
   */
  app.post(
    '/atualizacao-cadastral',
    { onRequest: [app.authenticate], bodyLimit: 50 * 1024 * 1024 }, // 50 MB
    async (req, reply) => {
      const parsed = atualizacaoCadastralSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'validation', details: parsed.error.errors });
      }
      const { tipoSolicitacao, alunoPesCod, descricao, arquivos } = parsed.data;

      if (!alunoPertenceAoResponsavel(req.user, alunoPesCod)) {
        return reply.code(403).send({
          error: 'aluno_nao_pertence',
          message: 'Aluno não está vinculado ao responsável autenticado.',
        });
      }

      const id = await legacySolicitacaoRepository.criar({
        usrCodigo: req.user.usr_codigo,
        tipoSolicitacao,
        alunoPesCod,
        dadosJson: JSON.stringify({ descricao }),
      });

      if (arquivos.length) {
        await legacySolicitacaoRepository.inserirAnexos({
          solicitacaoId: id,
          anexos: arquivos,
        });
      }

      return reply.code(201).send({ id });
    }
  );

  /**
   * PUT /solicitacoes/:id/atualizacao-cadastral
   *
   * Atualiza descrição + substitui anexos (remove antigos e insere novos).
   * Mantido shape compatível com mobile que envia arquivos a cada edição.
   */
  app.put(
    '/:id/atualizacao-cadastral',
    { onRequest: [app.authenticate], bodyLimit: 50 * 1024 * 1024 },
    async (req, reply) => {
      const params = idParamsSchema.safeParse(req.params);
      if (!params.success) {
        return reply.code(400).send({ error: 'validation', details: params.error.errors });
      }
      const body = z
        .object({
          descricao: z.string().min(1).max(2000),
          arquivos: z
            .array(
              z.object({
                nome: z.string().min(1).max(255),
                formato: z.string().min(1).max(20),
                conteudo: z.string().min(1),
              })
            )
            .max(10),
        })
        .safeParse(req.body);
      if (!body.success) {
        return reply.code(400).send({ error: 'validation', details: body.error.errors });
      }

      const dono = await legacySolicitacaoRepository.getDono(params.data.id);
      if (!dono) {
        return reply.code(404).send({ error: 'nao_encontrada' });
      }
      if (dono.usrCodigo !== req.user.usr_codigo) {
        return reply.code(403).send({ error: 'nao_e_dono' });
      }
      if ((dono.status ?? '').toUpperCase() !== 'P') {
        return reply.code(403).send({
          error: 'nao_editavel',
          message: 'Solicitação já foi avaliada e não pode ser editada.',
        });
      }

      await legacySolicitacaoRepository.atualizarDados({
        solicitacaoId: params.data.id,
        dadosJson: JSON.stringify({ descricao: body.data.descricao }),
      });
      await legacySolicitacaoRepository.removerAnexos(params.data.id);
      if (body.data.arquivos.length) {
        await legacySolicitacaoRepository.inserirAnexos({
          solicitacaoId: params.data.id,
          anexos: body.data.arquivos,
        });
      }

      return reply.code(200).send({ ok: true });
    }
  );
};

export default solicitacoesRoutes;
