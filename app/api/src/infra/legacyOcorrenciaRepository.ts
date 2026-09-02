import sql from 'mssql';
import { getLegacyPool } from './legacyDb.js';
import type { OcorrenciaItem } from '../domain/ocorrencia.js';

/**
 * Adapter pra ocorrências escolares.
 * Adaptado das regras Maker `getOcorrencias` (55) e `postOcorrenciaCiente` (56).
 */
export const legacyOcorrenciaRepository = {
  async findOcorrencias(input: {
    pesCodAluno: number;
    anoLetivo: number;
  }): Promise<OcorrenciaItem[]> {
    const pool = await getLegacyPool();
    const result = await pool
      .request()
      .input('pesCodAluno', sql.Int, input.pesCodAluno)
      .input('anoLetivo', sql.Int, input.anoLetivo)
      .query<OcorrenciaItem>(`
        SELECT
          AO.OCORRENCIA_COD AS ocorrencia_id,
          AO.AOC_TITULO AS titulo,
          AO.AOC_DESCRICAO AS descricao,
          TOA.TPO_DESCRICAO AS tipo,
          FORMAT(AO.AOC_DT_OCORRENCIA, 'dd/MM/yyyy HH:mm') AS data_ocorrencia,
          P_ALU.PES_NOME AS aluno,
          CASE WHEN AO.AOC_RESP_CIENTE = 1 THEN 'Sim' ELSE 'Não' END AS ciente,
          AO.AOC_DT_CIENCIA_RESP AS dt_confirmacao,
          P_PROF.PES_NOME AS professor,
          AO.AOC_ANO_LETIVO AS ano,
          E.ESC_NOME_REDUZIDO AS escola,
          T.TMA_NOME AS turma,
          AO.AOC_EXIGIR_CONHECIMENTO AS exige_conhecimento
        FROM EDU_ALUNO_OCORRENCIA AO WITH(NOLOCK)
          INNER JOIN EDU_TURMA_ALUNO TMH WITH(NOLOCK) ON AO.TMH_COD = TMH.TMH_COD
          INNER JOIN GER_PESSOA P_ALU WITH(NOLOCK) ON TMH.PES_COD_ALUNO = P_ALU.PES_COD
          INNER JOIN GER_PESSOA P_PROF WITH(NOLOCK) ON AO.PES_COD_PROFESSOR = P_PROF.PES_COD
          INNER JOIN EDU_ESCOLA E WITH(NOLOCK) ON AO.ESC_COD = E.ESC_COD
          INNER JOIN EDU_TURMA T WITH(NOLOCK) ON AO.TMA_COD = T.TMA_COD
          INNER JOIN EDU_TIPO_OCORRENCIA_ALUNO TOA WITH(NOLOCK) ON AO.TIPO_OCORRENCIA_COD = TOA.TIPO_OCORRENCIA_COD
        WHERE P_ALU.PES_COD = @pesCodAluno
          AND TMH.TMH_ANO_LETIVO = @anoLetivo
        ORDER BY
          AO.AOC_EXIGIR_CONHECIMENTO DESC,
          AO.AOC_RESP_CIENTE ASC,
          AO.AOC_DT_OCORRENCIA DESC
      `);
    return result.recordset;
  },

  /**
   * Marca ocorrência como "ciente" pelo responsável. Atualiza
   * AOC_RESP_CIENTE=1 + AOC_DT_CIENCIA_RESP=GETDATE() + USR_CODIGO_RESP.
   */
  async marcarCiente(input: {
    ocorrenciaId: number;
    usrCodigo: number;
  }): Promise<void> {
    const pool = await getLegacyPool();
    await pool
      .request()
      .input('ocorrenciaId', sql.Int, input.ocorrenciaId)
      .input('usrCodigo', sql.Int, input.usrCodigo)
      .query(`
        UPDATE EDU_ALUNO_OCORRENCIA SET
          AOC_RESP_CIENTE = 1,
          AOC_DT_CIENCIA_RESP = GETDATE(),
          USR_CODIGO_RESP = @usrCodigo
        WHERE OCORRENCIA_COD = @ocorrenciaId
      `);
  },
};
