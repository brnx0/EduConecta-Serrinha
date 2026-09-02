import sql from 'mssql';
import { getLegacyPool } from './legacyDb.js';
import type { AvisoMural } from '../domain/aviso.js';

/**
 * Lê avisos do mural (EDU_AVISOS) — adaptado da regra Maker `getMuralAvisos`
 * (REG_COD 43).
 *
 * Filtros:
 * - Apenas avisos com EDU_CONECTA='S' (publicados pro app dos pais)
 * - Janela de validade entre DATA_INICIO e DATA_FIM
 * - Aviso pra TODA_REDE='S' OU (escola do aluno + curso da turma do aluno)
 */
export const legacyAvisoRepository = {
  async findAvisosPorEscolaEAluno(input: {
    escolaCod: number;
    pesCodAluno: number;
    limite?: number;
  }): Promise<AvisoMural[]> {
    const pool = await getLegacyPool();
    const limit = input.limite && input.limite > 0 ? Math.min(input.limite, 100) : null;
    const topClause = limit ? `TOP ${limit}` : '';

    const result = await pool
      .request()
      .input('escCod', sql.Int, input.escolaCod)
      .input('pesCodAluno', sql.Int, input.pesCodAluno)
      .query<{
        id: number;
        titulo: string;
        descricao: string;
        imagem: string | null;
        data_cadastro: string;
        data_inicio: string;
        data_fim: string;
      }>(`
        SELECT ${topClause}
          A.AVI_COD AS id,
          A.TITULO AS titulo,
          A.AVISO AS descricao,
          A.IMAGEM AS imagem,
          A.DATA_CRIACAO AS data_cadastro,
          A.DATA_INICIO AS data_inicio,
          A.DATA_FIM AS data_fim
        FROM EDU_AVISOS A WITH(NOLOCK)
          OUTER APPLY (
            SELECT MAX(AE.AVE_COD) AS ID
            FROM EDU_AVISOS_ESCOLAS AE WITH(NOLOCK)
            WHERE AE.AVI_COD = A.AVI_COD
              AND AE.ESC_COD = @escCod
          ) ESCOLAS
          OUTER APPLY (
            SELECT MAX(ASE.ACU_COD) AS ID
            FROM EDU_AVISOS_SEGMENTO ASE WITH(NOLOCK)
              INNER JOIN EDU_TURMA T WITH(NOLOCK) ON T.CUR_COD = ASE.CUR_COD
              INNER JOIN EDU_TURMA_ALUNO TA WITH(NOLOCK) ON TA.TMA_COD = T.TMA_COD
            WHERE ASE.AVI_COD = A.AVI_COD
              AND TA.PES_COD_ALUNO = @pesCodAluno
          ) CURSOS
        WHERE A.EDU_CONECTA = 'S'
          AND GETDATE() BETWEEN A.DATA_INICIO AND A.DATA_FIM
          AND (A.TODA_REDE = 'S'
            OR (ESCOLAS.ID IS NOT NULL AND CURSOS.ID IS NOT NULL))
        ORDER BY A.DATA_CRIACAO DESC
      `);

    return result.recordset.map((row) => ({
      id: row.id,
      titulo: row.titulo,
      descricao: row.descricao,
      imagem: row.imagem,
      data_cadastro: row.data_cadastro,
      data_inicio: row.data_inicio,
      data_fim: row.data_fim,
    }));
  },
};
