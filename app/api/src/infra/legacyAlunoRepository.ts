import sql from 'mssql';
import { getLegacyPool } from './legacyDb.js';
import type { VinculoResponsavelAluno } from '../domain/primeiroAcesso.js';
import type { AlunoCompleto } from '../domain/aluno.js';

/**
 * Adapter pra ler dados de aluno/responsável no banco legado Softwell (EDU_*).
 *
 * Tabelas envolvidas:
 * - GER_PESSOA_FISICA: aluno + dados do responsável (denormalizado em CHECK_RESP/PFI_CPF_RESP)
 * - EDU_ALUNO: registro de aluno
 *
 * Mapper converte rows do banco em DTOs do domínio (clean architecture).
 */

export const legacyAlunoRepository = {
  /**
   * Busca vínculo aluno ↔ responsável validando CPF responsável + CPF aluno
   * + data nascimento. Retorna null se não achar.
   *
   * `dataNascimentoAluno` em ISO YYYY-MM-DD. Convertido pra Date.
   */
  async findVinculoExato(input: {
    cpfResponsavel: string;
    cpfAluno: string;
    dataNascimentoAluno: string;
  }): Promise<VinculoResponsavelAluno | null> {
    const pool = await getLegacyPool();
    const result = await pool
      .request()
      .input('cpfResp', sql.Char(11), input.cpfResponsavel)
      .input('cpfAluno', sql.Char(11), input.cpfAluno)
      .input('dataNasc', sql.Date, new Date(input.dataNascimentoAluno))
      .query<{
        PES_COD_ALUNO: number;
        PFI_APELIDO: string;
        PFI_RESP: string;
      }>(
        `SELECT
          A.PES_COD_ALUNO,
          PF.PFI_APELIDO,
          PF.PFI_RESP
         FROM EDU_ALUNO A WITH(NOLOCK)
         INNER JOIN GER_PESSOA_FISICA PF WITH(NOLOCK)
           ON PF.PES_COD = A.PES_COD_ALUNO
         WHERE PF.CHECK_RESP = 'S'
           AND PF.PFI_CPF_RESP = @cpfResp
           AND PF.PFI_CPF = @cpfAluno
           AND CAST(PF.PFI_NASCIMENTO AS DATE) = @dataNasc`
      );

    const row = result.recordset[0];
    if (!row) return null;

    return {
      alunoPesCod: row.PES_COD_ALUNO,
      nomeAluno: row.PFI_APELIDO,
      nomeResponsavel: row.PFI_RESP,
    };
  },

  /**
   * Lista alunos de um responsável pelo CPF. Usado no login (sync de
   * EDC_RESPONSAVEL_ALUNO).
   */
  /**
   * Verifica se o CPF é responsável legal de algum aluno cadastrado na
   * escola (CHECK_RESP='S' AND PFI_CPF_RESP=cpf). Usado pra diferenciar
   * "primeiro acesso pendente" de "credenciais inválidas" no login.
   */
  async cpfIsResponsavel(cpfResponsavel: string): Promise<boolean> {
    const pool = await getLegacyPool();
    const result = await pool
      .request()
      .input('cpfResp', sql.Char(11), cpfResponsavel)
      .query<{ qtd: number }>(
        `SELECT COUNT(*) as qtd
         FROM EDU_ALUNO A WITH(NOLOCK)
         INNER JOIN GER_PESSOA_FISICA PF WITH(NOLOCK)
           ON PF.PES_COD = A.PES_COD_ALUNO
         WHERE PF.CHECK_RESP = 'S' AND PF.PFI_CPF_RESP = @cpfResp`
      );
    return (result.recordset[0]?.qtd ?? 0) > 0;
  },

  async findAlunosPorCpfResponsavel(cpfResponsavel: string): Promise<VinculoResponsavelAluno[]> {
    const pool = await getLegacyPool();
    const result = await pool
      .request()
      .input('cpfResp', sql.Char(11), cpfResponsavel)
      .query<{
        PES_COD_ALUNO: number;
        PFI_APELIDO: string;
        PFI_RESP: string;
      }>(
        `SELECT
          A.PES_COD_ALUNO,
          PF.PFI_APELIDO,
          PF.PFI_RESP
         FROM EDU_ALUNO A WITH(NOLOCK)
         INNER JOIN GER_PESSOA_FISICA PF WITH(NOLOCK)
           ON PF.PES_COD = A.PES_COD_ALUNO
         WHERE PF.CHECK_RESP = 'S'
           AND PF.PFI_CPF_RESP = @cpfResp`
      );

    return result.recordset.map((row) => ({
      alunoPesCod: row.PES_COD_ALUNO,
      nomeAluno: row.PFI_APELIDO,
      nomeResponsavel: row.PFI_RESP,
    }));
  },

  /**
   * Busca aluno pela matrícula. Usado pelo webhook FR (que envia matrícula
   * em vez de PES_COD).
   */
  async findAlunoPorMatricula(
    matricula: string
  ): Promise<{ pesCodAluno: number; nome: string } | null> {
    const pool = await getLegacyPool();
    const result = await pool
      .request()
      .input('matricula', sql.VarChar, matricula)
      .query<{ PES_COD_ALUNO: number; nome: string }>(
        `SELECT TOP 1
           A.PES_COD_ALUNO,
           PF.PFI_APELIDO AS nome
         FROM EDU_ALUNO A WITH(NOLOCK)
           INNER JOIN GER_PESSOA_FISICA PF WITH(NOLOCK) ON PF.PES_COD = A.PES_COD_ALUNO
         WHERE CAST(A.ALU_NUMERO_MATRICULA AS VARCHAR) = @matricula`
      );
    const row = result.recordset[0];
    if (!row) return null;
    return { pesCodAluno: row.PES_COD_ALUNO, nome: row.nome };
  },

  /**
   * Contexto pra notificação: dado um aluno (PES_COD), retorna nome do aluno
   * e CPF do responsável legal. Usado pelo PushDispatcher pra montar
   * notificação + descobrir destinatário.
   */
  /**
   * Busca nomes de alunos em batch por PES_COD. Usado pra enriquecer
   * lista de notificações (PresencaEvento.alunoId guarda PES_COD como
   * string).
   */
  async findNomesPorPesCods(pesCods: number[]): Promise<Map<number, string>> {
    const out = new Map<number, string>();
    const validos = pesCods.filter((n) => Number.isInteger(n) && n > 0);
    if (validos.length === 0) return out;

    const pool = await getLegacyPool();
    const inList = validos.map((c) => Math.trunc(c)).join(',');
    const result = await pool.request().query<{ pes_cod: number; nome: string }>(
      `SELECT PF.PES_COD AS pes_cod, PF.PFI_APELIDO AS nome
       FROM GER_PESSOA_FISICA PF WITH(NOLOCK)
       WHERE PF.PES_COD IN (${inList})`
    );
    for (const r of result.recordset) out.set(r.pes_cod, r.nome);
    return out;
  },

  async findContextoNotificacao(
    pesCodAluno: number
  ): Promise<{ nomeAluno: string; cpfResponsavel: string } | null> {
    const pool = await getLegacyPool();
    const result = await pool
      .request()
      .input('pesCodAluno', sql.Int, pesCodAluno)
      .query<{ nome: string; cpfResponsavel: string }>(
        `SELECT TOP 1
           PF.PFI_APELIDO AS nome,
           PF.PFI_CPF_RESP AS cpfResponsavel
         FROM GER_PESSOA_FISICA PF WITH(NOLOCK)
         WHERE PF.PES_COD = @pesCodAluno
           AND PF.CHECK_RESP = 'S'
           AND PF.PFI_CPF_RESP IS NOT NULL`
      );
    const row = result.recordset[0];
    if (!row) return null;
    return { nomeAluno: row.nome, cpfResponsavel: row.cpfResponsavel };
  },

  /**
   * Lista alunos completos com todos os dados pra Home (curso, série, turma,
   * escola, frequência, próx atividade, ocorrências, etc.).
   *
   * Adaptado da regra Maker `getAlunos` (REG_COD 35). Diferença: parte de
   * `GER_PESSOA_FISICA.PFI_CPF_RESP` em vez do cache `EDC_USUARIO_RESP_ALUNO`
   * (que não estamos populando — sync ficou de fora).
   */
  async findAlunosCompletosPorCpfResponsavel(cpfResponsavel: string): Promise<AlunoCompleto[]> {
    const pool = await getLegacyPool();
    const result = await pool
      .request()
      .input('cpfResp', sql.Char(11), cpfResponsavel)
      .query<{
        aluno_turma_cod: number;
        pes_cod: number;
        matricula: string;
        nome: string;
        cpf: string;
        curso: string;
        serie: string;
        escola: string;
        escola_cod: number;
        turma: string;
        data_nascimento: string | null;
        sexo: string;
        situacao: string;
        turno: string;
        ano_letivo: number;
        total_aulas_anual: number;
        total_faltas: number;
        data_prox_atividade: string | null;
        disciplina_prox_atividade: string | null;
        descricao_prox_atividade: string | null;
        anos: string;
        ocorrencia_nova: number;
        ocorrencia_pendente: number;
      }>(`
        SELECT
          TA.TMH_COD AS aluno_turma_cod,
          PF.PES_COD AS pes_cod,
          A.ALU_NUMERO_MATRICULA AS matricula,
          PF.PFI_APELIDO AS nome,
          PF.PFI_CPF AS cpf,
          C.CUR_NOME_REDUZIDO AS curso,
          S.SER_NOME AS serie,
          E.ESC_NOME_REDUZIDO AS escola,
          E.ESC_COD AS escola_cod,
          T.TMA_NOME AS turma,
          FORMAT(PF.PFI_NASCIMENTO, 'dd/MM/yyyy') AS data_nascimento,
          CASE PF.PFI_SEXO
            WHEN 'M' THEN 'Masculino'
            WHEN 'F' THEN 'Feminino'
            ELSE 'Não informado'
          END AS sexo,
          CASE
            WHEN TA.TAS_COD_SAIDA IS NOT NULL THEN CONCAT(TAS.TAS_DESCRICAO, ' - ', FORMAT(TA.TMH_DATA_SAIDA, 'dd/MM/yyyy'))
            ELSE CONCAT('Matriculado - ', FORMAT(TA.TMH_DATA_MATRICULA, 'dd/MM/yyyy'))
          END AS situacao,
          TUR.TUR_NOME AS turno,
          TA.TMH_ANO_LETIVO AS ano_letivo,
          S.SER_TOTAL_AULA_ANUAL AS total_aulas_anual,
          COALESCE(FALTAS.total_faltas, 0) AS total_faltas,
          ATIVIDADE.DT_AVALIACAO AS data_prox_atividade,
          ATIVIDADE.DISCIPLINA AS disciplina_prox_atividade,
          ATIVIDADE.DESCRICAO AS descricao_prox_atividade,
          ANO_MATRICULADO.ANOS AS anos,
          IIF(OCORRENCIA_N.ID IS NOT NULL, 1, 0) AS ocorrencia_nova,
          IIF(OCORRENCIA_P.ID IS NOT NULL, 1, 0) AS ocorrencia_pendente
        FROM GER_PESSOA_FISICA PF WITH(NOLOCK)
          INNER JOIN EDU_ALUNO A WITH(NOLOCK) ON A.PES_COD_ALUNO = PF.PES_COD
          INNER JOIN EDU_TURMA_ALUNO TA WITH(NOLOCK) ON TA.PES_COD_ALUNO = PF.PES_COD
          INNER JOIN EDU_CURSO C WITH(NOLOCK) ON C.CUR_COD = TA.CUR_COD
          INNER JOIN EDU_SERIE S WITH(NOLOCK) ON S.SER_COD = TA.SER_COD
          INNER JOIN EDU_ESCOLA E WITH(NOLOCK) ON E.ESC_COD = TA.ESC_COD
          INNER JOIN EDU_TURMA T WITH(NOLOCK) ON T.TMA_COD = TA.TMA_COD
          INNER JOIN EDU_TURNO TUR WITH(NOLOCK) ON TUR.TUR_COD = TA.TUR_COD
          LEFT JOIN EDU_TURMA_ALUNO_SITUACAO TAS WITH(NOLOCK) ON TAS.TAS_COD = TA.TAS_COD_SAIDA
          OUTER APPLY (
            SELECT
              SUM(CASE WHEN DC.UNS_COD = 1 THEN 1 ELSE 0 END) +
              SUM(CASE WHEN DC.UNS_COD = 2 THEN 1 ELSE 0 END) +
              SUM(CASE WHEN DC.UNS_COD = 3 THEN 1 ELSE 0 END) +
              SUM(CASE WHEN DC.UNS_COD = 4 THEN 1 ELSE 0 END) AS total_faltas
            FROM EDU_DIARIO_CONTEUDO DC WITH(NOLOCK)
              INNER JOIN EDU_DIARIO_FREQUENCIA DF WITH(NOLOCK) ON DF.DIC_COD = DC.DIC_COD
                AND DF.TMH_COD = TA.TMH_COD
            WHERE DC.TMA_COD = TA.TMA_COD
              AND DF.DIF_PRESENTE = 'N'
          ) FALTAS
          OUTER APPLY (
            SELECT TOP 1
              FORMAT(IAV_DATA, 'dd/MMM', 'pt-BR') AS DT_AVALIACAO,
              IA.IAV_DESCRICAO AS DESCRICAO,
              D.DIS_NOME_MEC AS DISCIPLINA
            FROM EDU_INSTRUMENTO_AVALIATIVO IA WITH(NOLOCK)
              INNER JOIN EDU_DISCIPLINA D WITH(NOLOCK) ON D.DIS_COD = IA.DIS_COD
            WHERE IA.TMA_COD = TA.TMA_COD
              AND (IA.IAV_DATA IS NOT NULL AND IA.IAV_DATA >= GETDATE())
          ) ATIVIDADE
          OUTER APPLY (
            SELECT
              STRING_AGG(CAST(TMH_ANO_LETIVO AS VARCHAR), ',') AS ANOS
            FROM (
              SELECT DISTINCT TMH_ANO_LETIVO
              FROM EDU_TURMA_ALUNO WITH(NOLOCK)
              WHERE PES_COD_ALUNO = TA.PES_COD_ALUNO
            ) X
          ) ANO_MATRICULADO
          OUTER APPLY (
            SELECT MAX(OCORRENCIA_COD) AS ID
            FROM EDU_ALUNO_OCORRENCIA AO WITH(NOLOCK)
            WHERE AO.TMH_COD = TA.TMH_COD
              AND DATEDIFF(DAY, AO.AOC_DT_OCORRENCIA, GETDATE()) <= 2
          ) OCORRENCIA_N
          OUTER APPLY (
            SELECT MAX(OCORRENCIA_COD) AS ID
            FROM EDU_ALUNO_OCORRENCIA AO WITH(NOLOCK)
            WHERE AO.TMH_COD = TA.TMH_COD
              AND AO.AOC_EXIGIR_CONHECIMENTO = 1
              AND AO.AOC_RESP_CIENTE = 0
          ) OCORRENCIA_P
        WHERE PF.CHECK_RESP = 'S'
          AND PF.PFI_CPF_RESP = @cpfResp
        ORDER BY TA.TMH_ANO_LETIVO DESC, A.ALU_NOME ASC
      `);

    return result.recordset.map((row) => ({
      pes_cod: row.pes_cod,
      aluno_turma_cod: row.aluno_turma_cod,
      matricula: row.matricula,
      nome: row.nome,
      cpf: row.cpf,
      curso: row.curso,
      serie: row.serie,
      escola: row.escola,
      escola_cod: row.escola_cod,
      turma: row.turma,
      data_nascimento: row.data_nascimento,
      sexo: row.sexo,
      situacao: row.situacao,
      turno: row.turno,
      ano_letivo: row.ano_letivo,
      total_aulas_anual: row.total_aulas_anual ?? 0,
      total_faltas: row.total_faltas ?? 0,
      data_prox_atividade: row.data_prox_atividade,
      disciplina_prox_atividade: row.disciplina_prox_atividade,
      descricao_prox_atividade: row.descricao_prox_atividade,
      anos: row.anos ?? '',
      ocorrencia_nova: row.ocorrencia_nova ?? 0,
      ocorrencia_pendente: row.ocorrencia_pendente ?? 0,
    }));
  },
};
