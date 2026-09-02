import sql from 'mssql';
import { getLegacyPool } from './legacyDb.js';
import type { ConteudoItem } from '../domain/conteudo.js';

/**
 * Conteúdos/planos de aula visíveis pro aluno por ano letivo.
 * Adaptado da regra Maker `getConteudos` (REG_COD 48).
 */
export const legacyConteudoRepository = {
  async findConteudos(input: {
    pesCodAluno: number;
    anoLetivo: number;
  }): Promise<ConteudoItem[]> {
    const pool = await getLegacyPool();
    const result = await pool
      .request()
      .input('pesCodAluno', sql.Int, input.pesCodAluno)
      .input('anoLetivo', sql.Int, input.anoLetivo)
      .query<ConteudoItem>(`
        SELECT DISTINCT
          PA.PLANID AS id,
          PA.TEMA AS tema,
          PA.CONTEUDO AS conteudo,
          PA.DESENVOLVIMENTO AS desenvolvimento,
          PA.DATA AS data_inicio,
          PA.DATA_FIM AS data_fim,
          D.DIS_NOME_MEC AS disciplina
        FROM EDU_PLANO_AULA PA WITH(NOLOCK)
          INNER JOIN EDU_SERIE S WITH(NOLOCK) ON S.SER_COD = PA.SER_COD
          INNER JOIN EDU_DISCIPLINA D WITH(NOLOCK) ON D.DIS_COD = PA.DIS_COD
          INNER JOIN EDU_TURMA_ALUNO TA WITH(NOLOCK) ON TA.SER_COD = PA.SER_COD
        WHERE TA.PES_COD_ALUNO = @pesCodAluno
          AND TA.TMH_ANO_LETIVO = @anoLetivo
          AND @anoLetivo BETWEEN YEAR(PA.DATA) AND YEAR(PA.DATA_FIM)
      `);
    return result.recordset;
  },
};
