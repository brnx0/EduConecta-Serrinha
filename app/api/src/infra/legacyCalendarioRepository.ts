import sql from 'mssql';
import { getLegacyPool } from './legacyDb.js';
import type {
  DiaCalendario,
  AtividadeCalendario,
  DiaLetivoUnidade,
} from '../domain/calendario.js';

/**
 * Calendário escolar e dias letivos.
 * Adaptado das regras Maker `getCalendarioEscolar` (39) e `getDiasLetivos` (31).
 */
export const legacyCalendarioRepository = {
  /**
   * Calendário do mês: 1 row por dia com status (Letivo/Não Letivo) + cor.
   */
  async findCalendarioMensal(input: {
    pesCodAluno: number;
    ano: number;
    mes: number;
  }): Promise<DiaCalendario[]> {
    const pool = await getLegacyPool();
    const result = await pool
      .request()
      .input('pesCodAluno', sql.Int, input.pesCodAluno)
      .input('ano', sql.Int, input.ano)
      .input('mes', sql.Int, input.mes)
      .query<DiaCalendario>(`
        SET DATEFIRST 1;

        WITH MesCompleto AS (
          SELECT CAST(DATEFROMPARTS(@ano, @mes, 1) AS DATE) AS Data
          UNION ALL
          SELECT DATEADD(DAY, 1, Data)
          FROM MesCompleto
          WHERE Data < EOMONTH(DATEFROMPARTS(@ano, @mes, 1))
        )
        SELECT
          DAY(M.Data) AS dia,
          FORMAT(M.Data, 'yyyy-MM-dd') AS data,
          CASE
            WHEN P.Data IS NULL THEN 'Não Letivo - Fora do Período'
            WHEN DATEPART(dw, M.Data) = 7 THEN 'Não Letivo'
            WHEN I.ID_MOTIVO IS NOT NULL THEN 'Não Letivo'
            WHEN DATEPART(dw, M.Data) = 6 AND S.ASL_DATA IS NULL THEN 'Não Letivo'
            ELSE 'Letivo'
          END AS status_dia,
          COALESCE(
            CASE WHEN M.Data = P.DATA_FIM THEN 'Encerramento do bimestre' ELSE NULL END,
            CASE WHEN M.Data = P.DATA_INICIO THEN 'Início de bimestre' ELSE NULL END,
            CASE WHEN DATEPART(dw, M.Data) = 7 THEN 'Domingo' ELSE NULL END,
            I.DescricaoMotivo,
            CASE WHEN DATEPART(dw, M.Data) = 6 AND S.ASL_DATA IS NULL THEN 'Sábado não letivo' ELSE NULL END
          ) AS motivo,
          CASE
            WHEN DATEPART(dw, M.Data) = 7 THEN '#C0C0C0'
            WHEN I.ID_MOTIVO IS NOT NULL THEN '#FF0000'
            WHEN M.Data = P.DATA_FIM THEN '#FFA500'
            WHEN M.Data = P.DATA_INICIO THEN '#90EE90'
            WHEN P.Data IS NULL THEN '#C0C0C0'
            WHEN DATEPART(dw, M.Data) = 6 AND S.ASL_DATA IS NULL THEN '#C0C0C0'
            WHEN (COALESCE(
              CASE WHEN M.Data = P.DATA_FIM THEN 1 ELSE NULL END,
              CASE WHEN M.Data = P.DATA_INICIO THEN 1 ELSE NULL END,
              CASE WHEN DATEPART(dw, M.Data) = 7 THEN 1 ELSE NULL END,
              I.ID_MOTIVO,
              CASE WHEN DATEPART(dw, M.Data) = 6 AND S.ASL_DATA IS NULL THEN 1 ELSE NULL END
            ) IS NULL) THEN '#008000'
            ELSE '#F0F0F0'
          END AS cor
        FROM MesCompleto M
          CROSS APPLY (
            SELECT TOP 1
              T.TMA_COD,
              T.TMA_ANO_LETIVO,
              T.CUR_COD
            FROM EDU_TURMA_ALUNO TA WITH(NOLOCK)
              INNER JOIN EDU_TURMA T WITH(NOLOCK) ON T.TMA_COD = TA.TMA_COD
            WHERE TA.PES_COD_ALUNO = @pesCodAluno
              AND TMA_ANO_LETIVO = @ano
          ) C
          OUTER APPLY (
            SELECT TOP 1
              DC.DATA_INICIO,
              DC.DATA_FIM,
              1 AS Data
            FROM EDU_NOVO_DIARIO_CALENDARIO DC WITH(NOLOCK)
            WHERE DC.CUR_COD = C.CUR_COD
              AND DC.ANO = C.TMA_ANO_LETIVO
              AND M.Data BETWEEN DC.DATA_INICIO AND DC.DATA_FIM
          ) P
          OUTER APPLY (
            SELECT TOP 1
              ECI.ID_MOTIVO,
              MI.DESCRICAO AS DescricaoMotivo
            FROM EDU_CALENDARIO_DE_INATIVIDADE ECI WITH(NOLOCK)
              LEFT JOIN EDU_MOTIVO_INATIVIDADE MI WITH(NOLOCK) ON MI.ID = ECI.ID_MOTIVO
            WHERE ECI.EDU_CAL_ANO_LETIVO = C.TMA_ANO_LETIVO
              AND M.Data BETWEEN ECI.EDU_CAL_DATA_INICIO AND ECI.EDU_CAL_DATA_FIM
          ) I
          OUTER APPLY (
            SELECT TOP 1 EASL.ASL_DATA
            FROM EDU_ALOCACAO_SABADO_LETIVO EASL WITH(NOLOCK)
            WHERE EASL.TMA_COD = C.TMA_COD
              AND EASL.ASL_DATA = M.Data
          ) S
        ORDER BY M.Data
        OPTION (MAXRECURSION 32);
      `);
    return result.recordset;
  },

  /**
   * Atividades avaliativas no mês (instrumentos de avaliação) — 1 row por dia
   * que tem atividade. Junta com nota do aluno (se já lançada).
   */
  async findAtividadesMensal(input: {
    pesCodAluno: number;
    ano: number;
    mes: number;
  }): Promise<AtividadeCalendario[]> {
    const pool = await getLegacyPool();
    const result = await pool
      .request()
      .input('pesCodAluno', sql.Int, input.pesCodAluno)
      .input('ano', sql.Int, input.ano)
      .input('mes', sql.Int, input.mes)
      .query<{
        dia: number;
        atividade: string | null;
        valor: number | null;
        disciplina: string | null;
        nota: number | null;
        data: string | null;
      }>(`
        SET DATEFIRST 1;

        WITH MesCompleto AS (
          SELECT CAST(DATEFROMPARTS(@ano, @mes, 1) AS DATE) AS Data
          UNION ALL
          SELECT DATEADD(DAY, 1, Data)
          FROM MesCompleto
          WHERE Data < EOMONTH(DATEFROMPARTS(@ano, @mes, 1))
        )
        SELECT
          DAY(M.Data) AS dia,
          FORMAT(M.Data, 'yyyy-MM-dd') AS data,
          ATIVIDADES.atividade,
          ATIVIDADES.valor,
          ATIVIDADES.disciplina,
          ATIVIDADES.nota
        FROM MesCompleto M
          CROSS APPLY (
            SELECT TOP 1
              T.TMA_COD,
              T.TMA_ANO_LETIVO,
              T.CUR_COD
            FROM EDU_TURMA_ALUNO TA WITH(NOLOCK)
              INNER JOIN EDU_TURMA T WITH(NOLOCK) ON T.TMA_COD = TA.TMA_COD
            WHERE TA.PES_COD_ALUNO = @pesCodAluno
              AND TMA_ANO_LETIVO = @ano
          ) C
          OUTER APPLY (
            SELECT
              IA.IAV_COD AS id,
              IA.IAV_DESCRICAO AS atividade,
              IA.IAV_VALOR AS valor,
              E.DIS_NOME_MEC AS disciplina,
              CASE IA.IAV_ID_AVALIACAO
                WHEN 1 THEN AA.AVA_AV1
                WHEN 2 THEN AA.AVA_AV2
                WHEN 3 THEN AA.AVA_AV3
                WHEN 4 THEN AA.AVA_AV4
                WHEN 5 THEN AA.AVA_AV5
                WHEN 6 THEN AA.AVA_AV6
                WHEN 7 THEN AA.AVA_AV7
                WHEN 8 THEN AA.AVA_AV8
                WHEN 9 THEN AA.AVA_AV9
              END AS nota
            FROM EDU_INSTRUMENTO_AVALIATIVO IA WITH(NOLOCK)
              INNER JOIN EDU_DISCIPLINA E WITH(NOLOCK) ON E.DIS_COD = IA.DIS_COD
              INNER JOIN EDU_AVALIACAO_ALUNO AA WITH(NOLOCK) ON AA.TMA_COD = IA.TMA_COD
                AND AA.DIS_COD = IA.DIS_COD
              INNER JOIN EDU_TURMA_ALUNO TA WITH(NOLOCK) ON TA.TMH_COD = AA.TMH_COD
            WHERE (IA.IAV_DATA IS NOT NULL AND CAST(IA.IAV_DATA AS DATE) = M.Data)
              AND IA.TMA_COD = C.TMA_COD
              AND TA.PES_COD_ALUNO = @pesCodAluno
              AND TA.TMH_ANO_LETIVO = @ano
          ) ATIVIDADES
        WHERE ATIVIDADES.atividade IS NOT NULL
        ORDER BY M.Data
        OPTION (MAXRECURSION 32);
      `);
    return result.recordset.map((row) => ({
      dia: row.dia,
      atividade: row.atividade ?? '',
      disciplina: row.disciplina ?? '',
      data: row.data ?? '',
      valor: row.valor ?? 0,
      nota: row.nota ?? 0,
    }));
  },

  /**
   * Total de dias letivos por unidade (bimestre) no ano. Retorna 1 row por
   * unidade com data_inicio, data_fim (DD/MM/YYYY) e contagem.
   */
  async findDiasLetivosPorUnidade(input: {
    pesCodAluno: number;
    anoLetivo: number;
  }): Promise<DiaLetivoUnidade[]> {
    const pool = await getLegacyPool();
    const result = await pool
      .request()
      .input('pesCodAluno', sql.Int, input.pesCodAluno)
      .input('anoLetivo', sql.Int, input.anoLetivo)
      .query<DiaLetivoUnidade>(`
        WITH DatasBase AS (
          SELECT DISTINCT
            DC.DATA_INICIO,
            DC.DATA_FIM,
            DC.UNIDADE,
            UV.UNS_DESCRICAO
          FROM EDU_NOVO_DIARIO_CALENDARIO DC
            INNER JOIN EDU_TURMA T ON T.CUR_COD = DC.CUR_COD
            INNER JOIN EDU_TURMA_ALUNO TA ON TA.TMA_COD = T.TMA_COD
            INNER JOIN EDU_UNIDADE_VI UV
              ON UV.UNS_ORDEM = DC.UNIDADE
              AND UV.ANO = DC.ANO
              AND UV.CUR_COD = DC.CUR_COD
              AND T.SER_COD = UV.SER_COD
          WHERE TA.PES_COD_ALUNO = @pesCodAluno
            AND DC.ANO = @anoLetivo
        ),
        DatasGeradas AS (
          SELECT
            DB.UNIDADE,
            DB.UNS_DESCRICAO,
            DB.DATA_INICIO AS Data,
            DB.DATA_FIM
          FROM DatasBase DB
          UNION ALL
          SELECT
            DG.UNIDADE,
            DG.UNS_DESCRICAO,
            DATEADD(DAY, 1, DG.Data),
            DG.DATA_FIM
          FROM DatasGeradas DG
          WHERE DATEADD(DAY, 1, DG.Data) <= DG.DATA_FIM
        ),
        DiasValidos AS (
          SELECT DISTINCT
            DG.UNIDADE,
            DG.UNS_DESCRICAO,
            DG.Data
          FROM DatasGeradas DG
            LEFT JOIN EDU_CALENDARIO_DE_INATIVIDADE ECI
              ON DG.Data BETWEEN ECI.EDU_CAL_DATA_INICIO AND ECI.EDU_CAL_DATA_FIM
            LEFT JOIN EDU_ALOCACAO_SABADO_LETIVO EASL
              ON DG.Data = EASL.ASL_DATA
          WHERE DATENAME(WEEKDAY, DG.Data) <> 'Sunday'
            AND ECI.EDU_CAL_ID IS NULL
            AND (
              DATENAME(WEEKDAY, DG.Data) <> 'Saturday'
              OR EASL.ASL_DATA IS NOT NULL
            )
        )
        SELECT
          FORMAT(MIN(Data), 'dd/MM/yyyy') AS data_inicio,
          FORMAT(MAX(Data), 'dd/MM/yyyy') AS data_fim,
          UNS_DESCRICAO AS unidade,
          COUNT(*) AS total_dias_letivos
        FROM DiasValidos
        GROUP BY UNIDADE, UNS_DESCRICAO
        ORDER BY UNIDADE
        OPTION (MAXRECURSION 0);
      `);
    return result.recordset;
  },
};
