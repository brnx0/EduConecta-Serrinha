import sql from 'mssql';
import { getLegacyPool } from './legacyDb.js';
import type {
  AutorizacaoItem,
  AutorizacaoStatus,
  AutorizacaoTipo,
  AutorizacaoAcao,
} from '../domain/autorizacao.js';

interface QueryRow {
  id: number;
  titulo: string;
  detalhes: string;
  tipo: string;
  status: string | null;
  data: Date | string | null;
}

/**
 * Normaliza `RA_RESPOSTA` (texto livre no DB legado) pro enum do app.
 * Aceita variantes legadas (com acento/espaço) gravadas pelo Maker.
 */
function normalizarStatus(raw: string | null): AutorizacaoStatus {
  if (!raw) return 'pendente';
  const v = raw.trim().toLowerCase();
  switch (v) {
    case 'pendente':
      return 'pendente';
    case 'aprovado':
      return 'aprovado';
    case 'recusado':
      return 'recusado';
    case 'confirmada':
      return 'confirmada';
    case 'nao_comparecera':
    case 'nao comparecera':
    case 'não comparecera':
    case 'naocomparecera':
      return 'nao_comparecera';
    default:
      return 'pendente';
  }
}

function toIsoDate(d: Date | string | null): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export const legacyAutorizacaoRepository = {
  /**
   * Lista autorizações aplicáveis ao aluno no ano letivo atual.
   * Replica filtros da rule getAutorizacoes (53):
   *   - matrícula habilitada e situação fora de ('K','T','E')
   *   - autorização compatível com curso/escola/turma do vínculo
   *   - LEFT JOIN com respostas → status `pendente` se sem resposta
   */
  async listarPorAluno(alunoPesCod: number): Promise<AutorizacaoItem[]> {
    const pool = await getLegacyPool();
    const result = await pool
      .request()
      .input('pesCod', sql.Int, alunoPesCod)
      .query<QueryRow>(`
        SELECT
          AUT.AUT_COD AS id,
          AUT.AUT_TITULO AS titulo,
          AUT.AUT_DESCRICAO AS detalhes,
          AUT.AUT_TIPO_SOLICITACAO AS tipo,
          CASE
            WHEN RA.RA_ID IS NULL THEN 'pendente'
            ELSE RA.RA_RESPOSTA
          END AS [status],
          AUT.AUT_DT AS [data]
        FROM EDC_AUTORIZACOES AUT WITH(NOLOCK)
          INNER JOIN EDU_TURMA_ALUNO TA WITH(NOLOCK) ON 1 = 1
          INNER JOIN GER_PESSOA P WITH(NOLOCK) ON TA.PES_COD_ALUNO = P.PES_COD
          INNER JOIN EDU_ALUNO A WITH(NOLOCK) ON TA.PES_COD_ALUNO = A.PES_COD_ALUNO
          INNER JOIN EDU_ESCOLA E WITH(NOLOCK) ON TA.ESC_COD = E.ESC_COD
          INNER JOIN EDU_CURSO C WITH(NOLOCK) ON TA.CUR_COD = C.CUR_COD
          INNER JOIN EDU_TURMA T WITH(NOLOCK) ON TA.TMA_COD = T.TMA_COD
          LEFT JOIN EDC_RESPOSTAS_AUTORIZACAO RA WITH(NOLOCK)
            ON RA.RA_AUT_COD = AUT.AUT_COD
           AND RA.RA_PES_COD_ALUNO = @pesCod
        WHERE
          TA.TMH_ANO_LETIVO = YEAR(GETDATE())
          AND TA.TMH_HABILITADO = 'S'
          AND TA.TMH_SITUACAO NOT IN ('K', 'T', 'E')
          AND P.PES_COD = @pesCod
          AND (
            (AUT.CUR_COD IS NULL OR LTRIM(RTRIM(AUT.CUR_COD)) = '')
            OR AUT.CUR_COD LIKE CONCAT('%', TA.CUR_COD, '%')
          )
          AND (
            (AUT.AUT_ESC_COD IS NULL OR LTRIM(RTRIM(AUT.AUT_ESC_COD)) = '')
            OR TA.ESC_COD = TRY_CAST(AUT.AUT_ESC_COD AS INT)
            OR AUT.AUT_ESC_COD = -1
          )
          AND (
            AUT.AUT_TMA_COD IS NULL
            OR TA.TMA_COD = AUT.AUT_TMA_COD
          )
        ORDER BY AUT.AUT_COD DESC
      `);

    return result.recordset.map((row) => ({
      id: row.id,
      titulo: row.titulo,
      detalhes: row.detalhes,
      tipo: (row.tipo === 'P' ? 'P' : 'A') as AutorizacaoTipo,
      status: normalizarStatus(row.status),
      data: toIsoDate(row.data),
    }));
  },

  /**
   * Busca o tipo da autorização. Usado pra validar coerência com `acao`
   * antes do INSERT (ex.: rejeita `aprovado` em tipo `P`).
   */
  async getTipo(autorizacaoId: number): Promise<AutorizacaoTipo | null> {
    const pool = await getLegacyPool();
    const result = await pool
      .request()
      .input('autCod', sql.Int, autorizacaoId)
      .query<{ tipo: string }>(`
        SELECT AUT_TIPO_SOLICITACAO AS tipo
        FROM EDC_AUTORIZACOES WITH(NOLOCK)
        WHERE AUT_COD = @autCod
      `);
    if (!result.recordset.length) return null;
    const tipo = result.recordset[0].tipo;
    return tipo === 'P' ? 'P' : 'A';
  },

  /**
   * Resolve TMH_COD ativo do aluno no ano letivo atual. Substitui
   * o `tmh_cod` que vinha do mobile no fluxo legado (não confiável).
   */
  async getTmhCodAtivo(alunoPesCod: number): Promise<number | null> {
    const pool = await getLegacyPool();
    const result = await pool
      .request()
      .input('pesCod', sql.Int, alunoPesCod)
      .query<{ tmhCod: number }>(`
        SELECT TOP 1 TMH_COD AS tmhCod
        FROM EDU_TURMA_ALUNO WITH(NOLOCK)
        WHERE PES_COD_ALUNO = @pesCod
          AND TMH_ANO_LETIVO = YEAR(GETDATE())
          AND TMH_HABILITADO = 'S'
          AND TMH_SITUACAO NOT IN ('K', 'T', 'E')
        ORDER BY TMH_COD DESC
      `);
    return result.recordset[0]?.tmhCod ?? null;
  },

  /**
   * Cria resposta. Idempotente: se já existe registro pra
   * (autorizacaoId, alunoPesCod), retorna `ja_respondida` sem inserir.
   */
  async criarResposta(input: {
    autorizacaoId: number;
    alunoPesCod: number;
    responsavelNome: string;
    acao: AutorizacaoAcao;
    tmhCod: number;
  }): Promise<'inserida' | 'ja_respondida'> {
    const pool = await getLegacyPool();

    const existente = await pool
      .request()
      .input('autCod', sql.Int, input.autorizacaoId)
      .input('pesCod', sql.Int, input.alunoPesCod)
      .query<{ existe: number }>(`
        SELECT TOP 1 1 AS existe
        FROM EDC_RESPOSTAS_AUTORIZACAO WITH(NOLOCK)
        WHERE RA_AUT_COD = @autCod AND RA_PES_COD_ALUNO = @pesCod
      `);
    if (existente.recordset.length) return 'ja_respondida';

    await pool
      .request()
      .input('autCod', sql.Int, input.autorizacaoId)
      .input('pesCod', sql.Int, input.alunoPesCod)
      .input('responsavel', sql.NVarChar(255), input.responsavelNome)
      .input('resposta', sql.NVarChar(50), input.acao)
      .input('tmh', sql.Int, input.tmhCod)
      .query(`
        INSERT INTO EDC_RESPOSTAS_AUTORIZACAO
          (RA_AUT_COD, RA_PES_COD_ALUNO, RA_RESPONSAVEL, RA_RESPOSTA, TMH_COD)
        VALUES (@autCod, @pesCod, @responsavel, @resposta, @tmh)
      `);

    return 'inserida';
  },
};
