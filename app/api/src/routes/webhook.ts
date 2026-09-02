import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { verifyHmac, isTimestampFresh } from '../lib/hmac.js';
import { isPrismaUniqueViolation } from '../lib/errors.js';
import { pushDispatcher } from '../services/pushDispatcher.js';
import { legacyAlunoRepository } from '../infra/legacyAlunoRepository.js';

const presencaSchema = z.object({
  eventId: z.string().uuid(),
  alunoMatricula: z.string().min(1),
  tipo: z.enum(['entrada', 'saida']),
  ocorridoEm: z.string().datetime(),
  leitorId: z.string().optional(),
});

const webhookRoutes: FastifyPluginAsync = async (app) => {
  // Content type parser custom — preserva rawBody pra HMAC
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_req, body, done) => {
      try {
        const json = JSON.parse(body as string);
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  app.post('/presenca', async (req, reply) => {
    const sig = req.headers['x-signature'] as string | undefined;
    const ts = req.headers['x-timestamp'] as string | undefined;

    // NOTE: rawBody reverify usa JSON.stringify do parsed body.
    // Funciona enquanto FR API enviar JSON.stringify direto sem espaços.
    // Migrar pra fastify-raw-body em follow-up se houver problema de skew.
    const rawBody =
      typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (!sig || !ts) {
      return reply.code(401).send({ error: 'invalid_signature' });
    }
    if (!isTimestampFresh(ts)) {
      return reply.code(401).send({ error: 'timestamp_expired' });
    }
    if (!verifyHmac(config.FR_WEBHOOK_SECRET, ts, rawBody, sig)) {
      return reply.code(401).send({ error: 'invalid_signature' });
    }

    const parsed = presencaSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'validation', details: parsed.error.errors });
    }
    const { eventId, alunoMatricula, tipo, ocorridoEm, leitorId } = parsed.data;

    // Resolve aluno via banco legado (matrícula → PES_COD)
    const aluno = await legacyAlunoRepository.findAlunoPorMatricula(alunoMatricula);
    if (!aluno) {
      return reply.code(404).send({ error: 'aluno_not_found' });
    }

    let evento: { id: string } | null = null;
    let duplicate = false;
    try {
      evento = await app.prisma.presencaEvento.create({
        data: {
          eventId,
          alunoId: String(aluno.pesCodAluno),
          tipo,
          ocorridoEm: new Date(ocorridoEm),
          leitorId,
        },
      });
    } catch (e) {
      if (isPrismaUniqueViolation(e)) {
        duplicate = true;
        evento = await app.prisma.presencaEvento.findUnique({
          where: { eventId },
        });
      } else {
        app.log.error({ err: e }, 'erro ao persistir evento de presença');
        return reply.code(500).send({ error: 'internal' });
      }
    }

    reply.code(200).send({ received: true, duplicate });

    if (!duplicate && evento) {
      const eventoId = evento.id;
      setImmediate(() => {
        pushDispatcher.dispatch(eventoId).catch((err) => {
          app.log.error({ err, eventoId }, 'falha ao despachar push');
        });
      });
    }
  });
};

export default webhookRoutes;
