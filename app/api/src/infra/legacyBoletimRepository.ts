import sql from 'mssql';
import { getLegacyPool } from './legacyDb.js';
import type { BoletimItem } from '../domain/boletim.js';

/**
 * Boletim escolar do aluno por ano letivo. Adaptado da regra Maker
 * `getBoletimEscolar` (REG_COD 38).
 *
 * Cada row do retorno = uma disciplina, com notas/faltas por unidade,
 * média anual, recuperação, datas de início/fim de cada unidade, etc.
 */
export const legacyBoletimRepository = {
  async findBoletim(input: {
    pesCodAluno: number;
    anoLetivo: number;
  }): Promise<BoletimItem[]> {
    const pool = await getLegacyPool();

    const result = await pool
      .request()
      .input('pesCodAluno', sql.Int, input.pesCodAluno)
      .input('anoLetivo', sql.Int, input.anoLetivo)
      .query<{
        numero_linha: number;
        semestre_inicial: number;
        is_encerramento_semestral: number;
        disciplina: string;
        nota_1: number;
        nota_2: number;
        nota_3: number;
        nota_4: number;
        nota_recuperacao: number;
        media: number;
        media_final: number;
        falta_1: number;
        falta_2: number;
        falta_3: number;
        falta_4: number;
        total_faltas: number;
        is_aprovado_em_conselho: number;
        ano_letivo: number;
        dt_inicio_unidade_1: string | null;
        dt_fim_unidade_1: string | null;
        dt_inicio_unidade_2: string | null;
        dt_fim_unidade_2: string | null;
        dt_inicio_unidade_3: string | null;
        dt_fim_unidade_3: string | null;
        dt_inicio_unidade_4: string | null;
        dt_fim_unidade_4: string | null;
        perc_frequencia_minima: number;
        media_para_aprovacao: number;
        tipo_avaliacao: string;
        nota_limite_inferior: number;
        nota_limite_superior: number;
        qtd_unidades: number;
        und_numerador_1: number;
        und_denominador_1: number;
        und_numerador_2: number;
        und_denominador_2: number;
        und_numerador_3: number;
        und_denominador_3: number;
        und_numerador_4: number;
        und_denominador_4: number;
        und_numerador_media: number;
        und_denominador_media: number;
        total_aulas_anual: number;
        data_fim_ano_letivo: string | null;
      }>(`
        SELECT
          ROW_NUMBER() OVER (ORDER BY D.DIS_NOME_MEC) AS numero_linha,
          IIF(T.TMA_SEMESTRE IS NULL, 1, T.TMA_SEMESTRE) AS semestre_inicial,
          IIF(T.TMA_ENCERRAMENTO_SEMESTRAL = 'S', 1, 0) AS is_encerramento_semestral,
          D.DIS_NOME_REDUZIDO AS disciplina,
          COALESCE(ANF.ENF_NOTA_01, 0) AS nota_1,
          COALESCE(ANF.ENF_NOTA_02, 0) AS nota_2,
          COALESCE(ANF.ENF_NOTA_03, 0) AS nota_3,
          COALESCE(ANF.ENF_NOTA_04, 0) AS nota_4,
          COALESCE(ANF.ENF_NOTA_RECUPERACAO, 0) AS nota_recuperacao,
          MA.media_anual AS media,
          CASE WHEN ANF.ENF_EM_RECUPERACAO = 'S'
              THEN CAST(
                IIF(
                  ANF.ENF_NOTA_RECUPERACAO > MA.media_anual,
                  ANF.ENF_NOTA_RECUPERACAO,
                  MA.media_anual
                ) AS NUMERIC(18, 2)
              )
            ELSE MA.media_anual
          END AS media_final,
          COALESCE(FALTAS.falta_1, 0) AS falta_1,
          COALESCE(FALTAS.falta_2, 0) AS falta_2,
          COALESCE(FALTAS.falta_3, 0) AS falta_3,
          COALESCE(FALTAS.falta_4, 0) AS falta_4,
          COALESCE((FALTAS.falta_1 + FALTAS.falta_2 + FALTAS.falta_3 + FALTAS.falta_4), 0) AS total_faltas,
          IIF(ANF.ENF_APROV_EM_CONSELHO = 'S', 1, 0) AS is_aprovado_em_conselho,
          TA.TMH_ANO_LETIVO AS ano_letivo,
          UNIDADES.DT_INICIO_1 AS dt_inicio_unidade_1,
          UNIDADES.DT_FIM_1 AS dt_fim_unidade_1,
          UNIDADES.DT_INICIO_2 AS dt_inicio_unidade_2,
          UNIDADES.DT_FIM_2 AS dt_fim_unidade_2,
          UNIDADES.DT_INICIO_3 AS dt_inicio_unidade_3,
          UNIDADES.DT_FIM_3 AS dt_fim_unidade_3,
          UNIDADES.DT_INICIO_4 AS dt_inicio_unidade_4,
          UNIDADES.DT_FIM_4 AS dt_fim_unidade_4,
          COALESCE(MF.FREQUENCIA, 75) AS perc_frequencia_minima,
          CAST(COALESCE(MF.MEDIA, 5) AS NUMERIC(18, 2)) AS media_para_aprovacao,
          TAV.TPA_TIPO AS tipo_avaliacao,
          TAV.TPA_NUM_LIMITE_INFERIOR AS nota_limite_inferior,
          TAV.TPA_NUM_LIMITE_SUPERIOR AS nota_limite_superior,
          TAV.TPA_QTD_UNIDADE AS qtd_unidades,
          TAV.TPA_NUME_UND1 AS und_numerador_1,
          TAV.TPA_DENO_UND1 AS und_denominador_1,
          TAV.TPA_NUME_UND2 AS und_numerador_2,
          TAV.TPA_DENO_UND2 AS und_denominador_2,
          TAV.TPA_NUME_UND3 AS und_numerador_3,
          TAV.TPA_DENO_UND3 AS und_denominador_3,
          TAV.TPA_NUME_UND4 AS und_numerador_4,
          TAV.TPA_DENO_UND4 AS und_denominador_4,
          TAV.TPA_NUME_MEDIA AS und_numerador_media,
          TAV.TPA_DENO_MEDIA AS und_denominador_media,
          S.SER_TOTAL_AULA_ANUAL AS total_aulas_anual,
          DT_FIM_ANO_LETIVO.DATA AS data_fim_ano_letivo
        FROM (
            SELECT MIN(GRA_COD) AS GRA_COD, DIS_COD, CUR_COD, SER_COD, ANO
            FROM EDU_GRADE WITH(NOLOCK)
            GROUP BY DIS_COD, CUR_COD, SER_COD, ANO
          ) G
          INNER JOIN EDU_DISCIPLINA D WITH(NOLOCK) ON D.DIS_COD = G.DIS_COD
          INNER JOIN EDU_TURMA T WITH(NOLOCK) ON T.CUR_COD = G.CUR_COD
            AND T.SER_COD = G.SER_COD
            AND T.TMA_ANO_LETIVO = G.ANO
          INNER JOIN EDU_TURMA_ALUNO TA WITH(NOLOCK) ON T.TMA_COD = TA.TMA_COD
          INNER JOIN GER_PESSOA_FISICA PF WITH(NOLOCK) ON PF.PES_COD = TA.PES_COD_ALUNO
          INNER JOIN EDU_ESCOLA E WITH(NOLOCK) ON E.ESC_COD = TA.ESC_COD
          INNER JOIN EDU_SERIE S WITH(NOLOCK) ON S.SER_COD = T.SER_COD
          INNER JOIN EDU_CURSO C WITH(NOLOCK) ON C.CUR_COD = T.CUR_COD
          INNER JOIN EDU_TIPO_AVALIACAO TAV WITH(NOLOCK) ON TAV.TPA_COD = C.TPA_COD
          LEFT JOIN EDU_MEDIA_FREQUENCIA MF WITH(NOLOCK) ON MF.CUR_COD = TA.CUR_COD
            AND MF.ANO_COD = TA.TMH_ANO_LETIVO
          LEFT JOIN EDU_ALUNOS_NOTAS_E_FALTAS ANF WITH(NOLOCK) ON ANF.DIS_COD = G.DIS_COD
            AND ANF.TMH_COD = TA.TMH_COD
          OUTER APPLY (
            SELECT
              SUM(CASE WHEN DC.UNS_COD = 1 THEN 1 ELSE 0 END) AS falta_1,
              SUM(CASE WHEN DC.UNS_COD = 2 THEN 1 ELSE 0 END) AS falta_2,
              SUM(CASE WHEN DC.UNS_COD = 3 THEN 1 ELSE 0 END) AS falta_3,
              SUM(CASE WHEN DC.UNS_COD = 4 THEN 1 ELSE 0 END) AS falta_4
            FROM EDU_DIARIO_CONTEUDO DC WITH(NOLOCK)
              INNER JOIN EDU_DIARIO_FREQUENCIA DF WITH(NOLOCK) ON DF.DIC_COD = DC.DIC_COD
                AND DF.TMH_COD = TA.TMH_COD
            WHERE DC.TMA_COD = TA.TMA_COD
              AND DC.DIS_COD = D.DIS_COD
              AND DF.DIF_PRESENTE = 'N'
          ) FALTAS
          OUTER APPLY (
            SELECT
              MAX(CASE WHEN NDC.UNIDADE = 1 THEN NDC.DATA_INICIO END) AS DT_INICIO_1,
              MAX(CASE WHEN NDC.UNIDADE = 1 THEN NDC.DATA_FIM    END) AS DT_FIM_1,
              MAX(CASE WHEN NDC.UNIDADE = 2 THEN NDC.DATA_INICIO END) AS DT_INICIO_2,
              MAX(CASE WHEN NDC.UNIDADE = 2 THEN NDC.DATA_FIM    END) AS DT_FIM_2,
              MAX(CASE WHEN NDC.UNIDADE = 3 THEN NDC.DATA_INICIO END) AS DT_INICIO_3,
              MAX(CASE WHEN NDC.UNIDADE = 3 THEN NDC.DATA_FIM    END) AS DT_FIM_3,
              MAX(CASE WHEN NDC.UNIDADE = 4 THEN NDC.DATA_INICIO END) AS DT_INICIO_4,
              MAX(CASE WHEN NDC.UNIDADE = 4 THEN NDC.DATA_FIM    END) AS DT_FIM_4
            FROM EDU_UNIDADE_VI U WITH(NOLOCK)
              INNER JOIN EDU_NOVO_DIARIO_CALENDARIO NDC WITH(NOLOCK)
                ON (NDC.UNIDADE = U.UNS_ORDEM)
                AND (NDC.ANO = U.ANO)
                AND (NDC.CUR_COD = T.CUR_COD)
            WHERE U.SER_COD = T.SER_COD
              AND U.ANO = T.TMA_ANO_LETIVO
          ) UNIDADES
          CROSS APPLY (
            SELECT CAST(
              (
                (COALESCE(ANF.ENF_NOTA_01, 0) * (TAV.TPA_NUME_UND1 * 1.0 / NULLIF(TAV.TPA_DENO_UND1, 0))) +
                (COALESCE(ANF.ENF_NOTA_02, 0) * (TAV.TPA_NUME_UND2 * 1.0 / NULLIF(TAV.TPA_DENO_UND2, 0))) +
                (COALESCE(ANF.ENF_NOTA_03, 0) * (TAV.TPA_NUME_UND3 * 1.0 / NULLIF(TAV.TPA_DENO_UND3, 0))) +
                (COALESCE(ANF.ENF_NOTA_04, 0) * (TAV.TPA_NUME_UND4 * 1.0 / NULLIF(TAV.TPA_DENO_UND4, 0)))
              )
              /
              NULLIF(
                (TAV.TPA_NUME_UND1 * 1.0 / NULLIF(TAV.TPA_DENO_UND1, 0)) +
                (TAV.TPA_NUME_UND2 * 1.0 / NULLIF(TAV.TPA_DENO_UND2, 0)) +
                (TAV.TPA_NUME_UND3 * 1.0 / NULLIF(TAV.TPA_DENO_UND3, 0)) +
                (TAV.TPA_NUME_UND4 * 1.0 / NULLIF(TAV.TPA_DENO_UND4, 0))
              , 0)
            AS NUMERIC(18, 2)
            ) AS media_anual
          ) MA
          CROSS APPLY (
            SELECT
              CASE TAV.TPA_QTD_UNIDADE
                WHEN 1 THEN UNIDADES.DT_FIM_1
                WHEN 2 THEN UNIDADES.DT_FIM_2
                WHEN 3 THEN UNIDADES.DT_FIM_3
                ELSE UNIDADES.DT_FIM_4
              END AS DATA
          ) DT_FIM_ANO_LETIVO
        WHERE TA.PES_COD_ALUNO = @pesCodAluno
          AND G.ANO = @anoLetivo
        ORDER BY D.DIS_NOME_MEC
      `);

    return result.recordset.map((row) => ({
      ...row,
      is_encerramento_semestral: row.is_encerramento_semestral === 1,
      is_aprovado_em_conselho: row.is_aprovado_em_conselho === 1,
    }));
  },
};
