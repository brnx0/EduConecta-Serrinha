import sql from 'mssql';
import { getLegacyPool } from './legacyDb.js';
import type { HorarioItem } from '../domain/horario.js';

/**
 * Quadro de horários semanal do aluno por ano letivo.
 * Adaptado da regra Maker `getHorarios` (REG_COD 36).
 */
export const legacyHorarioRepository = {
  async findHorarios(input: {
    pesCodAluno: number;
    anoLetivo: number;
  }): Promise<HorarioItem[]> {
    const pool = await getLegacyPool();
    const result = await pool
      .request()
      .input('pesCodAluno', sql.Int, input.pesCodAluno)
      .input('anoLetivo', sql.Int, input.anoLetivo)
      .query<HorarioItem>(`
        SELECT
          TA.PES_COD_ALUNO AS pes_cod_aluno,
          QHD.DIA AS dia_semana,
          QHD.TEMPO AS tempo,
          E.ESC_NOME_REDUZIDO AS escola,
          D.DIS_NOME_MEC AS disciplina,
          S.SER_NOME AS serie,
          T.TMA_NOME AS turma,
          PF_PROFESSOR.PFI_APELIDO AS professor,
          TA.TMH_ANO_LETIVO AS ano_letivo
        FROM EDU_QUADRO_DE_HORARIOS_DETALHE QHD WITH(NOLOCK)
          INNER JOIN EDU_QUADRO_DE_HORARIOS QH WITH(NOLOCK) ON QH.QUA_COD = QHD.QUA_COD
          INNER JOIN EDU_TURMA_ALUNO TA WITH(NOLOCK) ON TA.TMA_COD = QH.QUA_TMA_COD
          INNER JOIN EDU_ESCOLA E WITH(NOLOCK) ON E.ESC_COD = TA.ESC_COD
          INNER JOIN EDU_DISCIPLINA D WITH(NOLOCK) ON D.DIS_COD = QHD.DISCIPLINA
          INNER JOIN EDU_TURMA T WITH(NOLOCK) ON T.TMA_COD = QH.QUA_TMA_COD
          INNER JOIN EDU_SERIE S WITH(NOLOCK) ON S.SER_COD = T.SER_COD
          INNER JOIN GER_PESSOA_FISICA PF_PROFESSOR WITH(NOLOCK) ON PF_PROFESSOR.PES_COD = QHD.PROFESSOR
        WHERE TA.PES_COD_ALUNO = @pesCodAluno
          AND TA.TMH_ANO_LETIVO = @anoLetivo
        ORDER BY QHD.TEMPO, D.DIS_NOME_MEC ASC
      `);
    return result.recordset;
  },
};
