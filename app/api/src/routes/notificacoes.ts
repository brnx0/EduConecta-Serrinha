import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { legacyAlunoRepository } from '../infra/legacyAlunoRepository.js';

const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
});

const notificacoesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'validation', details: parsed.error.errors });
    }
    const { cursor, limit, status } = parsed.data;
    const userId = req.user.usr_codigo;

    const where: Record<string, unknown> = { userId };
    if (status) {
      where.status = status;
    } else {
      // Default: mostra enviada, lida e falhou (falhou aparece no histórico
      // mesmo se push falhou — usuário ainda quer ver evento que ocorreu)
      where.status = { in: ['enviada', 'lida', 'falhou'] };
    }

    const items = await app.prisma.notificacao.findMany({
      where: where as any,
      orderBy: { criadaEm: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    // Carrega eventos relacionados em batch
    const eventoIds = items.map((it) => it.eventoId);
    const eventos = eventoIds.length
      ? await app.prisma.presencaEvento.findMany({
          where: { id: { in: eventoIds } },
          select: { id: true, alunoId: true, tipo: true, ocorridoEm: true },
        })
      : [];

    // Nome do aluno vem do banco LEGADO (GER_PESSOA_FISICA via PES_COD).
    // PresencaEvento.alunoId guarda PES_COD como string.
    const pesCods = [...new Set(eventos.map((e) => Number(e.alunoId)).filter((n) => Number.isFinite(n)))];
    const alunoNomeByPesCod = await legacyAlunoRepository.findNomesPorPesCods(pesCods);
    const eventoById = new Map(eventos.map((e) => [e.id, e]));

    const hasMore = items.length > limit;
    const sliced = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? sliced[sliced.length - 1]?.id ?? null : null;

    return reply.code(200).send({
      items: sliced.map((n) => {
        const ev = eventoById.get(n.eventoId);
        const pesCod = ev ? Number(ev.alunoId) : NaN;
        return {
          id: n.id,
          titulo: n.titulo,
          corpo: n.corpo,
          alunoNome: Number.isFinite(pesCod) ? alunoNomeByPesCod.get(pesCod) ?? null : null,
          tipo: ev?.tipo ?? null,
          ocorridoEm: ev?.ocorridoEm ?? null,
          lidaEm: n.lidaEm,
          criadaEm: n.criadaEm,
        };
      }),
      nextCursor,
    });
  });

  app.patch(
    '/lidas-todas',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      await app.prisma.notificacao.updateMany({
        where: { userId: req.user.usr_codigo, lidaEm: null },
        data: { lidaEm: new Date(), status: 'lida' },
      });
      return reply.code(204).send();
    }
  );

  /**
   * GET /notificacoes/nao-lidas/count
   * Retorna contagem de notificações não lidas pro tab badge.
   */
  app.get(
    '/nao-lidas/count',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const count = await app.prisma.notificacao.count({
        where: {
          userId: req.user.usr_codigo,
          lidaEm: null,
          status: { in: ['enviada', 'falhou'] }, // inclui falhou pra mostrar mesmo sem push
        },
      });
      return reply.code(200).send({ count });
    }
  );

  app.patch(
    '/:id/lida',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const userId = req.user.usr_codigo;
      const existing = await app.prisma.notificacao.findUnique({
        where: { id },
      });
      if (!existing || existing.userId !== userId) {
        return reply.code(404).send({ error: 'not_found' });
      }
      if (!existing.lidaEm) {
        await app.prisma.notificacao.update({
          where: { id },
          data: { lidaEm: new Date(), status: 'lida' },
        });
      }
      return reply.code(204).send();
    }
  );
};

export default notificacoesRoutes;
