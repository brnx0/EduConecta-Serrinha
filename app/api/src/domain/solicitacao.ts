/**
 * DTOs do domínio de solicitações.
 *
 * Tabelas legadas envolvidas (acesso via mssql raw, fora do schema Prisma):
 *   - EDC_TIPO_SOLICITACAO     — tipos disponíveis (catálogo)
 *   - EDC_SOLICITACAO          — solicitações abertas pelo responsável
 *   - EDC_ANEXO_SOLICITACAO    — anexos binários (atualização cadastral)
 *   - EDU_AUTORIZACAO_DE_SAIDA — legado Softwell, leitura pra validar CPF de portador
 */

export interface TipoSolicitacao {
  id: number;
  label: string;
}

/** Status interno legado: A=aprovado, R=reprovado, P=pendente. */
export type SolicitacaoStatus = 'pendente' | 'aprovado' | 'reprovado';

/**
 * Item retornado em GET /solicitacoes. `payload` é o JSON original do
 * formulário (parseado quando possível) — varia conforme `tipo`.
 */
export interface SolicitacaoItem {
  id: number;
  /** ISO YYYY-MM-DD */
  data: string;
  andamento: SolicitacaoStatus;
  payload: Record<string, unknown> | string;
  tipo: number;
}

/**
 * Dados do portador (tipoSolicitacao = 1 — CadastroPortadores).
 * Gravado em EDC_SOLICITACAO.SOL_DADOS como JSON.
 */
export interface PortadorPayload {
  nome: string;
  cpf: string;
  rg: string;
  telefone: string;
  parentesco: string;
}

/** Anexo enviado em base64 (JSON body). */
export interface AnexoBase64 {
  nome: string;
  formato: string;
  /** Base64 puro (sem prefixo data:...). */
  conteudo: string;
}

/**
 * Mapeia status do banco (1 char) pro enum legível.
 */
export function mapStatusDb(s: string | null): SolicitacaoStatus {
  switch ((s ?? '').toUpperCase()) {
    case 'A':
      return 'aprovado';
    case 'R':
      return 'reprovado';
    case 'P':
    default:
      return 'pendente';
  }
}
