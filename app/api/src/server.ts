import Fastify, { type FastifyServerOptions } from 'fastify';
import { config } from './config.js';
import prismaPlugin from './plugins/prisma.js';
import authPlugin from './plugins/auth.js';
import webhookRoutes from './routes/webhook.js';
import pushTokensRoutes from './routes/pushTokens.js';
import notificacoesRoutes from './routes/notificacoes.js';
import authRoutes from './routes/auth.js';
import passwordResetRoutes from './routes/passwordReset.js';
import alunosRoutes from './routes/alunos.js';
import muralRoutes from './routes/mural.js';
import boletimRoutes from './routes/boletim.js';
import horariosRoutes from './routes/horarios.js';
import frequenciaRoutes from './routes/frequencia.js';
import calendarioRoutes from './routes/calendario.js';
import ocorrenciasRoutes from './routes/ocorrencias.js';
import autorizacoesRoutes from './routes/autorizacoes.js';
import solicitacoesRoutes from './routes/solicitacoes.js';
import conteudosRoutes from './routes/conteudos.js';
import devRoutes from './routes/dev.js';
import { retryWorker } from './services/retryWorker.js';
import { closeLegacyPool } from './infra/legacyDb.js';

export async function buildApp(opts: FastifyServerOptions = {}) {
  const app = Fastify({
    logger:
      opts.logger ??
      ({
        level: config.LOG_LEVEL,
        transport:
          config.NODE_ENV === 'development'
            ? { target: 'pino-pretty' }
            : undefined,
      } as any),
    ...opts,
  });

  await app.register(prismaPlugin);
  await app.register(authPlugin);

  app.get('/health', async (_, reply) => {
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'ok' };
    } catch {
      reply.code(503);
      return { status: 'degraded', db: 'down' };
    }
  });

  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(passwordResetRoutes, { prefix: '/auth' });
  await app.register(alunosRoutes, { prefix: '/alunos' });
  await app.register(muralRoutes, { prefix: '/mural' });
  await app.register(boletimRoutes, { prefix: '/boletim' });
  await app.register(horariosRoutes, { prefix: '/horarios' });
  await app.register(frequenciaRoutes, { prefix: '/frequencia' });
  await app.register(calendarioRoutes, { prefix: '/calendario' });
  await app.register(ocorrenciasRoutes, { prefix: '/ocorrencias' });
  await app.register(autorizacoesRoutes, { prefix: '/autorizacoes' });
  await app.register(solicitacoesRoutes, { prefix: '/solicitacoes' });
  await app.register(conteudosRoutes, { prefix: '/conteudos' });
  await app.register(webhookRoutes, { prefix: '/webhook' });
  await app.register(pushTokensRoutes, { prefix: '/push-tokens' });
  await app.register(notificacoesRoutes, { prefix: '/notificacoes' });
  await app.register(devRoutes, { prefix: '/dev' });

  app.addHook('onClose', async () => {
    await closeLegacyPool();
  });

  if (config.NODE_ENV !== 'test') {
    retryWorker.start({
      info: (...args: unknown[]) => app.log.info(args[0] as object, args[1] as string),
      error: (...args: unknown[]) => app.log.error(args[0] as object, args[1] as string),
    });
    app.addHook('onClose', async () => {
      retryWorker.stop();
    });
  }

  return app;
}

async function bootstrap() {
  const app = await buildApp();
  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Em ambiente de test (vitest), NODE_ENV=test e o test importa buildApp direto.
// Fora de test, sempre faz bootstrap. Funciona em Windows + tsx watch.
if (config.NODE_ENV !== 'test') {
  bootstrap();
}
