import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { pushDispatcher } from '../services/pushDispatcher.js';

const simularPresencaSchema = z.object({
  pesCodAluno: z.coerce.number().int().positive(),
  tipo: z.enum(['entrada', 'saida']).default('entrada'),
});

/**
 * Endpoints de desenvolvimento. Disponíveis APENAS em NODE_ENV=development.
 * Plugin retorna sem registrar rotas em prod.
 */
const devRoutes: FastifyPluginAsync = async (app) => {
  if (config.NODE_ENV !== 'development') {
    app.log.info('dev routes desabilitadas (NODE_ENV != development)');
    return;
  }

  /**
   * POST /dev/simular-presenca
   * Body: { pesCodAluno, tipo }
   * Persiste evento e dispatcha notificação como se viesse do FR.
   * Útil pra testar fluxo sem ter leitor facial real disparando webhooks.
   */
  app.post('/simular-presenca', { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = simularPresencaSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'validation', details: parsed.error.errors });
    }

    const evento = await app.prisma.presencaEvento.create({
      data: {
        eventId: randomUUID(),
        alunoId: String(parsed.data.pesCodAluno),
        tipo: parsed.data.tipo,
        ocorridoEm: new Date(),
        leitorId: 'simulador-dev',
      },
    });

    // Dispatch sync pra retornar resultado completo no DEV (mais fácil debugar)
    await pushDispatcher.dispatch(evento.id);

    // Busca notificação criada (se houver) pra retornar ao caller
    const notificacao = await app.prisma.notificacao.findFirst({
      where: { eventoId: evento.id },
      orderBy: { criadaEm: 'desc' },
    });

    return reply.code(201).send({
      evento,
      notificacao,
      mensagem: notificacao
        ? 'Evento criado + notificação despachada'
        : 'Evento criado mas notificação não foi gerada (aluno sem responsável cadastrado no app?)',
    });
  });
};

export default devRoutes;
