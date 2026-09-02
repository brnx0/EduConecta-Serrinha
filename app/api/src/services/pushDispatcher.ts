import { prisma } from '../db.js';
import { expoClient, type ExpoPushMessage } from '../lib/expoClient.js';
import { formatHora, capitalize } from '../lib/time.js';
import { legacyAlunoRepository } from '../infra/legacyAlunoRepository.js';

/**
 * Dispatcher de notificações push.
 *
 * Fluxo:
 *  1. Lê PresencaEvento (Prisma — tabela própria)
 *  2. Busca contexto no banco legado (nome aluno + cpf do responsável via
 *     GER_PESSOA_FISICA)
 *  3. Acha Responsavel no Prisma por cpf
 *  4. Cria Notificacao SEMPRE (mesmo sem push token — histórico in-app
 *     funciona)
 *  5. Se houver push tokens, envia via Expo Push
 *
 * Em Expo Go, push notifications estão bloqueadas — fluxo termina em (4)
 * e notificação aparece só no histórico in-app.
 */

function buildMensagem(input: { tipo: string; nomeAluno: string; ocorridoEm: Date }) {
  const titulo = `${input.nomeAluno} ${
    input.tipo === 'entrada' ? 'chegou' : 'saiu'
  }`;
  const corpo = `${capitalize(input.tipo)} registrada às ${formatHora(input.ocorridoEm)}`;
  return { titulo, corpo };
}

async function processEvento(eventoId: string): Promise<void> {
  const evento = await prisma.presencaEvento.findUnique({
    where: { id: eventoId },
  });
  if (!evento) return;

  // Lê contexto do banco legado
  const pesCodAluno = Number(evento.alunoId);
  if (!Number.isFinite(pesCodAluno)) return;

  const contexto = await legacyAlunoRepository.findContextoNotificacao(pesCodAluno);
  if (!contexto) return; // aluno não tem responsável legal cadastrado

  const { nomeAluno, cpfResponsavel } = contexto;

  // Encontra Responsavel no app (cadastrado no app)
  const responsavel = await prisma.responsavel.findUnique({
    where: { cpf: cpfResponsavel },
  });
  if (!responsavel) {
    // Responsável existe na escola mas não tem login no app ainda — sem destino
    return;
  }

  const { titulo, corpo } = buildMensagem({
    tipo: evento.tipo,
    nomeAluno,
    ocorridoEm: evento.ocorridoEm,
  });

  // Busca push tokens
  const tokens = await prisma.pushToken.findMany({
    where: { userId: responsavel.id },
  });

  // Cria notificação no histórico SEMPRE (mesmo sem tokens)
  const notificacao = await prisma.notificacao.create({
    data: {
      userId: responsavel.id,
      eventoId: evento.id,
      titulo,
      corpo,
      status: tokens.length === 0 ? 'falhou' : 'pendente',
      ultimoErro: tokens.length === 0 ? 'no_push_tokens' : null,
      tentativas: tokens.length === 0 ? 1 : 0,
    },
  });

  // Sem tokens — histórico in-app é suficiente
  if (tokens.length === 0) return;

  // Envia push
  const messages: ExpoPushMessage[] = tokens.map((t) => ({
    to: t.token,
    title: titulo,
    body: corpo,
    data: {
      eventoId: evento.id,
      alunoPesCod: pesCodAluno,
      tipo: evento.tipo,
      notificacaoId: notificacao.id,
    },
    sound: 'default',
    priority: 'high',
  }));

  let sucesso = false;
  const erros: string[] = [];
  try {
    const tickets = await expoClient.sendPushNotificationsAsync(messages);
    for (let i = 0; i < tokens.length; i++) {
      const ticket = tickets[i];
      const tk = tokens[i];
      if (!ticket || !tk) continue;
      if (ticket.status === 'ok') {
        sucesso = true;
      } else {
        const errType = (ticket.details as { error?: string } | undefined)?.error;
        erros.push(ticket.message ?? errType ?? 'unknown');
        if (errType === 'DeviceNotRegistered') {
          await prisma.pushToken.delete({ where: { id: tk.id } }).catch(() => {});
        }
      }
    }
  } catch (err: any) {
    erros.push(err?.message ?? 'expo_error');
  }

  await prisma.notificacao.update({
    where: { id: notificacao.id },
    data: {
      status: sucesso ? 'enviada' : 'falhou',
      enviadaEm: sucesso ? new Date() : undefined,
      ultimoErro: sucesso ? null : erros.join(', '),
      tentativas: { increment: 1 },
    },
  });
}

async function processRetry(notificacaoId: string): Promise<void> {
  const notif = await prisma.notificacao.findUnique({
    where: { id: notificacaoId },
    include: { evento: true },
  });
  if (!notif || !notif.evento) return;

  const pesCodAluno = Number(notif.evento.alunoId);
  if (!Number.isFinite(pesCodAluno)) return;

  const contexto = await legacyAlunoRepository.findContextoNotificacao(pesCodAluno);
  if (!contexto) return;

  const tokens = await prisma.pushToken.findMany({
    where: { userId: notif.userId },
  });
  if (tokens.length === 0) {
    await prisma.notificacao.update({
      where: { id: notif.id },
      data: {
        status: 'falhou',
        tentativas: { increment: 1 },
        ultimoErro: 'no_push_tokens',
      },
    });
    return;
  }

  const { titulo, corpo } = buildMensagem({
    tipo: notif.evento.tipo,
    nomeAluno: contexto.nomeAluno,
    ocorridoEm: notif.evento.ocorridoEm,
  });
  const messages: ExpoPushMessage[] = tokens.map((t) => ({
    to: t.token,
    title: titulo,
    body: corpo,
    data: {
      eventoId: notif.evento!.id,
      alunoPesCod: pesCodAluno,
      tipo: notif.evento!.tipo,
      notificacaoId: notif.id,
    },
    sound: 'default',
    priority: 'high',
  }));

  let sucesso = false;
  const erros: string[] = [];
  try {
    const tickets = await expoClient.sendPushNotificationsAsync(messages);
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const tk = tokens[i];
      if (!ticket || !tk) continue;
      if (ticket.status === 'ok') {
        sucesso = true;
      } else {
        const errType = (ticket.details as { error?: string } | undefined)?.error;
        erros.push(ticket.message ?? errType ?? 'unknown');
        if (errType === 'DeviceNotRegistered') {
          await prisma.pushToken.delete({ where: { id: tk.id } }).catch(() => {});
        }
      }
    }
  } catch (err: any) {
    erros.push(err?.message ?? 'expo_error');
  }

  await prisma.notificacao.update({
    where: { id: notif.id },
    data: {
      status: sucesso ? 'enviada' : 'falhou',
      enviadaEm: sucesso ? new Date() : undefined,
      tentativas: { increment: 1 },
      ultimoErro: sucesso ? null : erros.join(', '),
    },
  });
}

export const pushDispatcher = {
  async dispatch(eventoId: string): Promise<void> {
    await processEvento(eventoId);
  },
  async retry(notificacaoId: string): Promise<void> {
    await processRetry(notificacaoId);
  },
};
