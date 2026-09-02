/**
 * DTOs do domínio de autorizações.
 *
 * Tabelas legadas envolvidas (mantidas fora do schema Prisma):
 *   - EDC_AUTORIZACOES            (criada pelo backoffice/admin)
 *   - EDC_RESPOSTAS_AUTORIZACAO   (gravada pelo app dos pais)
 *
 * Acessadas via mssql raw em `infra/legacyAutorizacaoRepository`.
 */

/** Tipo da solicitação. `A` = aprovação genérica, `P` = presença em evento. */
export type AutorizacaoTipo = 'A' | 'P';

/**
 * Status de uma autorização do ponto de vista do responsável.
 * `aprovado/recusado` aplicam a tipo `A`. `confirmada/nao_comparecera`
 * aplicam a tipo `P`.
 */
export type AutorizacaoStatus =
  | 'pendente'
  | 'aprovado'
  | 'recusado'
  | 'confirmada'
  | 'nao_comparecera';

/** Ações válidas pro endpoint de resposta. Exclui `pendente` (default). */
export type AutorizacaoAcao = Exclude<AutorizacaoStatus, 'pendente'>;

export interface AutorizacaoItem {
  id: number;
  titulo: string;
  detalhes: string;
  tipo: AutorizacaoTipo;
  status: AutorizacaoStatus;
  /** ISO YYYY-MM-DD */
  data: string;
}

/**
 * Mapeia ações válidas por tipo. Serve como guarda na rota:
 * tentar `aprovado` em tipo `P` → 422.
 */
export const ACOES_POR_TIPO: Record<AutorizacaoTipo, AutorizacaoAcao[]> = {
  A: ['aprovado', 'recusado'],
  P: ['confirmada', 'nao_comparecera'],
};
