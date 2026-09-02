import { apiNotifications } from '../apiNotifications';

export type TipoEvento = 'entrada' | 'saida';

export interface NotificacaoDTO {
  id: string;
  titulo: string;
  corpo: string;
  alunoNome: string | null;
  tipo: TipoEvento | null;
  ocorridoEm: string | null;
  lidaEm: string | null;
  criadaEm: string;
}

export interface ListarNotificacoesParams {
  cursor?: string;
  limit?: number;
  status?: string;
}

export interface ListarNotificacoesResponse {
  items: NotificacaoDTO[];
  nextCursor: string | null;
}

export async function listarNotificacoes(
  params: ListarNotificacoesParams = {}
): Promise<ListarNotificacoesResponse> {
  const { data } = await apiNotifications.get<ListarNotificacoesResponse>(
    '/notificacoes',
    { params }
  );
  return data;
}

export async function marcarLida(id: string): Promise<void> {
  await apiNotifications.patch(`/notificacoes/${id}/lida`);
}

export async function marcarTodasLidas(): Promise<void> {
  await apiNotifications.patch('/notificacoes/lidas-todas');
}

export async function getNaoLidasCount(): Promise<number> {
  const { data } = await apiNotifications.get<{ count: number }>(
    '/notificacoes/nao-lidas/count'
  );
  return data.count;
}

/**
 * DEV-only: simula evento de presença no backend (cria PresencaEvento +
 * dispatcha notificação). Útil pra testar fluxo sem leitor facial real.
 */
export async function simularPresencaDev(input: {
  pesCodAluno: number;
  tipo?: 'entrada' | 'saida';
}): Promise<{ evento: any; notificacao: any; mensagem: string }> {
  const { data } = await apiNotifications.post('/dev/simular-presenca', {
    pesCodAluno: input.pesCodAluno,
    tipo: input.tipo ?? 'entrada',
  });
  return data;
}
