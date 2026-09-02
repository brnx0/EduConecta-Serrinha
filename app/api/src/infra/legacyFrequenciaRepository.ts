import sql from 'mssql';
import { getLegacyPool } from './legacyDb.js';
import type { FrequenciaDia } from '../domain/frequencia.js';

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
};
