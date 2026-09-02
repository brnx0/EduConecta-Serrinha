import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { solicitar, confirmar } from '../services/passwordResetService.js';

const cpfRegex = /^\d{11}$/;
const codigoRegex = /^\d{6}$/;

const solicitarSchema = z.object({
  cpf: z.string().regex(cpfRegex, 'CPF deve ter 11 dígitos numéricos'),
});

const confirmarSchema = z.object({
  resetToken: z.string().uuid('Token inválido'),
  codigo: z.string().regex(codigoRegex, 'Código deve ter 6 dígitos'),
  novaSenha: z.string().min(6, 'Senha mínima 6 caracteres').max(128),
});

const passwordResetRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /auth/recuperar-senha
   *
   * Body: { cpf }
   * Sempre retorna 200 com { emailMascarado, resetToken } — anti-enumeração.
   * Se CPF não cadastrado: token retornado não corresponde a nenhuma sessão
   * válida (qualquer `confirmar` falhará com `token_invalido`).
   *
   * Respostas:
   *  - 200 OK         { emailMascarado, resetToken }
   *  - 400 Bad Req.   { error: "validation", details }
   */
  app.post('/recuperar-senha', async (req, reply) => {
    const parsed = solicitarSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'validation',
        details: parsed.error.errors,
      });
    }

    try {
      const resultado = await solicitar(parsed.data.cpf);
      if (resultado.tipo === 'ok') {
        return reply.code(200).send({
          emailMascarado: resultado.emailMascarado,
          resetToken: resultado.resetId,
        });
      }
      // sem_efeito — devolve token fake (uuid aleatório que não existe no DB)
      return reply.code(200).send({
        emailMascarado: resultado.emailMascarado,
        resetToken: crypto.randomUUID(),
      });
    } catch (err) {
      app.log.error({ err }, 'Falha ao solicitar recuperação de senha');
      return reply
        .code(500)
        .send({ error: 'erro_envio', message: 'Não foi possível enviar o e-mail. Tente novamente.' });
    }
  });

  /**
   * POST /auth/recuperar-senha/confirmar
   *
   * Body: { resetToken, codigo, novaSenha }
   * Respostas:
   *  - 200 OK             { ok: true }
   *  - 400 Bad Req.       { error: "validation", details }
   *  - 401 Unauthorized   { error: "token_invalido" }
   *  - 401 Unauthorized   { error: "codigo_invalido", tentativasRestantes }
   *  - 401 Unauthorized   { error: "tentativas_excedidas" }
   *  - 410 Gone           { error: "expirado" }
   */
  app.post('/recuperar-senha/confirmar', async (req, reply) => {
    const parsed = confirmarSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'validation',
        details: parsed.error.errors,
      });
    }

    const resultado = await confirmar(
      parsed.data.resetToken,
      parsed.data.codigo,
      parsed.data.novaSenha
    );

    switch (resultado.tipo) {
      case 'ok':
        return reply.code(200).send({ ok: true });
      case 'token_invalido':
        return reply.code(401).send({
          error: 'token_invalido',
          message: 'Solicitação inválida. Refaça o pedido de recuperação.',
        });
      case 'codigo_invalido':
        return reply.code(401).send({
          error: 'codigo_invalido',
          message: 'Código incorreto.',
          tentativasRestantes: resultado.tentativasRestantes,
        });
      case 'tentativas_excedidas':
        return reply.code(401).send({
          error: 'tentativas_excedidas',
          message: 'Limite de tentativas atingido. Solicite um novo código.',
        });
      case 'expirado':
        return reply.code(410).send({
          error: 'expirado',
          message: 'Código expirado. Solicite um novo.',
        });
    }
  });
};

export default passwordResetRoutes;
