import sql from 'mssql';
import { getLegacyPool } from './legacyDb.js';
import type { FrequenciaDia, LinhaAula, PeriodoInfo } from '../domain/frequencia.js';

/**
 * Frequência diária do aluno num mês.
 * Adaptado da regra Maker `getFrequencia` (REG_COD 52).
 *
 * CTE recursiva monta calendário do mês + LEFT JOIN com frequência agregada.
 * Retorna 1 row por dia do mês com status (Presente/Ausente/Parcial) e cor.
 */
export const legacyFrequenciaRepository = {
  async findFrequenciaMensal(input: {
    pesCodAluno: number;
    ano: number;
    mes: number;
  }): Promise<FrequenciaDia[]> {
    const pool = await getLegacyPool();
    const result = await pool
      .request()
      .input('pesCodAluno', sql.Int, input.pesCodAluno)
      .input('ano', sql.Int, input.ano)
      .input('mes', sql.Int, input.mes)
      .query<{
        dia: number;
        data: string;
        status_dia: string | null;
        cor: string;
      }>(`
        SET DATEFIRST 1;

        WITH MesCompleto AS (
          SELECT DATEFROMPARTS(@ano, @mes, 1) AS Data
          UNION ALL
          SELECT DATEADD(DAY, 1, Data)
          FROM MesCompleto
          WHERE Data < EOMONTH(DATEFROMPARTS(@ano, @mes, 1))
        ),
        FrequenciaAgregada AS (
          SELECT
            TA.TMA_COD,
            CAST(DC.DIC_DATA AS DATE) AS DataLetiva,
            SUM(CASE WHEN DF.DIF_PRESENTE = 'S' THEN 1 ELSE 0 END) AS Qtd_Presencas,
            COUNT(DF.DIF_COD) AS Qtd_Aulas
          FROM EDU_DIARIO_CONTEUDO DC
            INNER JOIN EDU_DIARIO_FREQUENCIA DF ON DC.DIC_COD = DF.DIC_COD
            INNER JOIN EDU_TURMA_ALUNO TA ON DF.TMH_COD = TA.TMH_COD
          WHERE TA.PES_COD_ALUNO = @pesCodAluno
            AND TA.TMH_HABILITADO = 'S'
            AND DC.DIC_DATA >= DATEFROMPARTS(@ano, @mes, 1)
            AND DC.DIC_DATA < DATEADD(DAY, 1, EOMONTH(DATEFROMPARTS(@ano, @mes, 1)))
          GROUP BY CAST(DC.DIC_DATA AS DATE), TA.TMA_COD
        )
        SELECT
          DAY(M.Data) AS dia,
          FORMAT(M.Data, 'yyyy-MM-dd') AS data,
          CASE
            WHEN F.Qtd_Aulas IS NULL THEN NULL
            WHEN F.Qtd_Presencas = F.Qtd_Aulas THEN 'Presente'
            WHEN F.Qtd_Presencas = 0 THEN 'Ausente'
            ELSE 'Parcialmente Presente'
          END AS status_dia,
          CASE
            WHEN DATEPART(DW, M.Data) = 7 THEN '#C3C3C3'
            WHEN F.Qtd_Presencas = F.Qtd_Aulas THEN '#008000'
            WHEN F.Qtd_Presencas = 0 THEN '#f74b4b'
            WHEN sabadoLetivo.ASL_COD IS NULL AND DATEPART(DW, M.Data) = 6 THEN '#C3C3C3'
            WHEN F.Qtd_Aulas IS NULL THEN '#FFFFFF'
            ELSE '#FFA500'
          END AS cor
        FROM MesCompleto M
          LEFT JOIN FrequenciaAgregada F ON M.Data = F.DataLetiva
          OUTER APPLY (
            SELECT MAX(S.ASL_COD) AS ASL_COD
            FROM EDU_ALOCACAO_SABADO_LETIVO S
              INNER JOIN EDU_TURMA_ALUNO TA ON TA.TMA_COD = S.TMA_COD
            WHERE S.ASL_DATA = M.Data AND TA.PES_COD_ALUNO = @pesCodAluno
          ) sabadoLetivo
        ORDER BY M.Data
        OPTION (MAXRECURSION 31);
      `);

    return result.recordset.map((row) => ({
      dia: row.dia,
      data: row.data,
      status_dia: row.status_dia,
      motivo: null,
      cor: row.cor,
    }));
  },

  /**
   * Cada aula com presença lançada pro aluno — no ano inteiro, ou só no mês
   * quando `mes` vier. Base do `/frequencia/resumo` e `/frequencia/dias`.
   *
   * `DC.UNS_COD` guarda a ordem da unidade (1, 2, 3), não o UNS_COD de
   * EDU_UNIDADE_VI — mesmo uso da query do boletim.
   */
  async findAulas(input: {
    pesCodAluno: number;
    ano: number;
    mes?: number;
  }): Promise<LinhaAula[]> {
    const pool = await getLegacyPool();
    const result = await pool
      .request()
      .input('pesCodAluno', sql.Int, input.pesCodAluno)
      .input('ano', sql.Int, input.ano)
      .input('mes', sql.Int, input.mes ?? null)
      .query<{
        data: string;
        tempo: number | null;
        disciplina: string | null;
        presente: string | null;
        justificada: string | null;
        unidade: number | null;
      }>(`
        SELECT
          FORMAT(CAST(DC.DIC_DATA AS DATE), 'yyyy-MM-dd') AS data,
          DF.DIF_ORDEM AS tempo,
          D.DIS_NOME_REDUZIDO AS disciplina,
          DF.DIF_PRESENTE AS presente,
          DF.DIF_JUSTIFICADA AS justificada,
          DC.UNS_COD AS unidade
        FROM EDU_TURMA_ALUNO TA WITH(NOLOCK)
          INNER JOIN EDU_DIARIO_FREQUENCIA DF WITH(NOLOCK) ON DF.TMH_COD = TA.TMH_COD
          INNER JOIN EDU_DIARIO_CONTEUDO DC WITH(NOLOCK) ON DC.DIC_COD = DF.DIC_COD
          LEFT JOIN EDU_DISCIPLINA D WITH(NOLOCK) ON D.DIS_COD = DC.DIS_COD
        WHERE TA.PES_COD_ALUNO = @pesCodAluno
          AND TA.TMH_ANO_LETIVO = @ano
          AND TA.TMH_HABILITADO = 'S'
          AND DC.DIC_DATA >= IIF(@mes IS NULL, DATEFROMPARTS(@ano, 1, 1), DATEFROMPARTS(@ano, @mes, 1))
          AND DC.DIC_DATA < IIF(@mes IS NULL, DATEFROMPARTS(@ano + 1, 1, 1), DATEADD(MONTH, 1, DATEFROMPARTS(@ano, @mes, 1)))
      `);

    return result.recordset.map((row) => ({
      data: row.data,
      tempo: row.tempo ?? 1,
      disciplina: row.disciplina ?? '—',
      status:
        row.presente === 'S' ? 'presente'
        : row.justificada === 'S' ? 'justificada'
        : 'falta',
      unidade: row.unidade,
    }));
  },

  /** Frequência mínima do curso (fallback 75, igual boletim) e períodos letivos da série. */
  async findContextoResumo(input: {
    pesCodAluno: number;
    ano: number;
  }): Promise<{ minimo: number; periodos: PeriodoInfo[] }> {
    const pool = await getLegacyPool();
    const result = await pool
      .request()
      .input('pesCodAluno', sql.Int, input.pesCodAluno)
      .input('ano', sql.Int, input.ano)
      .query<{ minimo: number; ordem: number | null; nome: string | null }>(`
        SELECT
          COALESCE(MF.FREQUENCIA, 75) AS minimo,
          U.UNS_ORDEM AS ordem,
          U.UNS_DESCRICAO AS nome
        FROM EDU_TURMA_ALUNO TA WITH(NOLOCK)
          INNER JOIN EDU_TURMA T WITH(NOLOCK) ON T.TMA_COD = TA.TMA_COD
          LEFT JOIN EDU_MEDIA_FREQUENCIA MF WITH(NOLOCK) ON MF.CUR_COD = TA.CUR_COD
            AND MF.ANO_COD = TA.TMH_ANO_LETIVO
          LEFT JOIN EDU_UNIDADE_VI U WITH(NOLOCK) ON U.SER_COD = T.SER_COD
            AND U.ANO = T.TMA_ANO_LETIVO
        WHERE TA.PES_COD_ALUNO = @pesCodAluno
          AND TA.TMH_ANO_LETIVO = @ano
          AND TA.TMH_HABILITADO = 'S'
        ORDER BY U.UNS_ORDEM
      `);

    const rows = result.recordset;
    const periodos = new Map<number, string>();
    for (const r of rows) {
      if (r.ordem != null && !periodos.has(r.ordem)) periodos.set(r.ordem, r.nome ?? `${r.ordem}º Período`);
    }
    return {
      minimo: rows[0]?.minimo ?? 75,
      periodos: [...periodos.entries()].map(([ordem, nome]) => ({ ordem, nome })),
    };
  },
};
