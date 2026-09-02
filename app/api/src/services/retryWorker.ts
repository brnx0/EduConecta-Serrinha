import cron, { type ScheduledTask } from 'node-cron';
import { prisma } from '../db.js';
import { pushDispatcher } from './pushDispatcher.js';

const MAX_TENTATIVAS = 5;
const JANELA_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 100;

interface Logger {
  info: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

let task: ScheduledTask | null = null;

export const retryWorker = {
  start(logger: Logger): void {
    if (task) return;
    task = cron.schedule('*/5 * * * *', async () => {
      try {
        const corte = new Date(Date.now() - JANELA_MS);
        const falhadas = await prisma.notificacao.findMany({
          where: {
            status: 'falhou',
            tentativas: { lt: MAX_TENTATIVAS },
            criadaEm: { gt: corte },
          },
          take: BATCH_SIZE,
        });

        if (falhadas.length === 0) return;
        logger.info(
          { count: falhadas.length },
          'retry worker processando falhas'
        );

        for (const notif of falhadas) {
          try {
            await pushDispatcher.retry(notif.id);
          } catch (err) {
            logger.error(
              { err, notifId: notif.id },
              'falha em retry de notificação'
            );
          }
        }
      } catch (err) {
        logger.error({ err }, 'retry worker erro geral');
      }
    });
  },

  stop(): void {
    if (task) {
      task.stop();
      task = null;
    }
  },
};
