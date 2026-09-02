import sql from 'mssql';
import { getLegacyPool } from './legacyDb.js';
import {
  mapStatusDb,
  type AnexoBase64,
  type SolicitacaoItem,
  type SolicitacaoStatus,
  type TipoSolicitacao,
} from '../domain/solicitacao.js';

interface SolRow {
  id: number;
  data: Date | string | null;
  andamento: string | null;
  payload: string | null;
  tipo: number;
}

function toIsoDate(d: Date | string | null): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function tryParseJson(raw: string | null): Record<string, unknown> | string {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return raw;
  }
}

export const legacySolicitacaoRepository = {
  async listarTipos(): Promise<TipoSolicitacao[]> {
    const pool = await getLegacyPool();
    const result = await pool.request().query<TipoSolicitacao>(`
      SELECT TIP_COD AS id, TIP_DESCRICAO AS label
      FROM EDC_TIPO_SOLICITACAO WITH(NOLOCK)
      ORDER BY TIP_DESCRICAO
    `);
    return result.recordset;
  },

  async listarPorUsuarioETipo(
    usrCodigo: number,
    tipoSolicitacao: number
  ): Promise<SolicitacaoItem[]> {
    const pool = await getLegacyPool();
    const result = await pool
      .request()
      .input('usrCod', sql.Int, usrCodigo)
      .input('tipo', sql.Int, tipoSolicitacao)
      .query<SolRow>(`
        SELECT
          SOL_COD AS id,
          SOL_DT AS [data],
          SOL_STATUS AS andamento,
          SOL_DADOS AS payload,
          SOL_TIP AS tipo
        FROM EDC_SOLICITACAO WITH(NOLOCK)
        WHERE USR_COD = @usrCod AND SOL_TIP = @tipo
        ORDER BY SOL_COD DESC
      `);

    return result.recordset.map((row) => ({
      id: row.id,
      data: toIsoDate(row.data),
      andamento: mapStatusDb(row.andamento) as SolicitacaoStatus,
      payload: tryParseJson(row.payload),
      tipo: row.tipo,
    }));
  },

  /**
   * Carrega solicitação pra checagens de ownership/existência.
   * Retorna `null` se não existir.
   */
  async getDono(solicitacaoId: number): Promise<{
    id: number;
    usrCodigo: number;
    tipo: number;
    status: string | null;
  } | null> {
    const pool = await getLegacyPool();
    const result = await pool
      .request()
      .input('id', sql.Int, solicitacaoId)
      .query<{ id: number; usrCodigo: number; tipo: number; status: string | null }>(`
        SELECT TOP 1 SOL_COD AS id, USR_COD AS usrCodigo, SOL_TIP AS tipo, SOL_STATUS AS status
        FROM EDC_SOLICITACAO WITH(NOLOCK)
        WHERE SOL_COD = @id
      `);
    return result.recordset[0] ?? null;
  },

  /**
   * Verifica se já existe portador (CPF) cadastrado em
   * EDU_AUTORIZACAO_DE_SAIDA ou solicitação pendente em EDC_SOLICITACAO.
   * Substitui a validação string-concat do legado por LIKE parametrizado.
   */
  async checarPortadorDuplicado(
    cpf: string,
    tipoSolicitacao: number
  ): Promise<{ duplicado: boolean; motivo?: string }> {
    const pool = await getLegacyPool();

    const r1 = await pool
      .request()
      .input('cpf', sql.VarChar(14), cpf)
      .query<{ existe: number }>(`
        SELECT TOP 1 1 AS existe
        FROM EDU_AUTORIZACAO_DE_SAIDA WITH(NOLOCK)
        WHERE CEP_RESP = @cpf
      `);
    if (r1.recordset.length) {
      return { duplicado: true, motivo: 'Esse CPF já foi cadastrado como um portador.' };
    }

    const r2 = await pool
      .request()
      .input('tipo', sql.Int, tipoSolicitacao)
      .input('pattern', sql.NVarChar(50), `%"cpf":"${cpf}"%`)
      .query<{ existe: number }>(`
        SELECT TOP 1 1 AS existe
        FROM EDC_SOLICITACAO WITH(NOLOCK)
        WHERE SOL_TIP = @tipo
          AND SOL_STATUS = 'P'
          AND SOL_DADOS LIKE @pattern
      `);
    if (r2.recordset.length) {
      return {
        duplicado: true,
        motivo: 'Uma solicitação já foi feita para esse CPF, por favor aguarde.',
      };
    }

    return { duplicado: false };
  },

  /**
   * Cria solicitação. Retorna o ID gerado (SOL_COD identity).
   * `dadosJson` é o conteúdo bruto a gravar em SOL_DADOS (já stringificado).
   */
  async criar(input: {
    usrCodigo: number;
    tipoSolicitacao: number;
    alunoPesCod: number;
    dadosJson: string;
  }): Promise<number> {
    const pool = await getLegacyPool();
    const result = await pool
      .request()
      .input('usrCod', sql.Int, input.usrCodigo)
      .input('tipo', sql.Int, input.tipoSolicitacao)
      .input('dados', sql.NVarChar(sql.MAX), input.dadosJson)
      .input('pesCod', sql.Int, input.alunoPesCod)
      .query<{ id: number }>(`
        INSERT INTO EDC_SOLICITACAO (USR_COD, SOL_TIP, SOL_DADOS, PES_COD_ALUNO)
        OUTPUT INSERTED.SOL_COD AS id
        VALUES (@usrCod, @tipo, @dados, @pesCod)
      `);
    return result.recordset[0].id;
  },

  async atualizarDados(input: {
    solicitacaoId: number;
    dadosJson: string;
  }): Promise<void> {
    const pool = await getLegacyPool();
    await pool
      .request()
      .input('id', sql.Int, input.solicitacaoId)
      .input('dados', sql.NVarChar(sql.MAX), input.dadosJson)
      .query(`
        UPDATE EDC_SOLICITACAO
        SET SOL_DADOS = @dados
        WHERE SOL_COD = @id
      `);
  },

  async excluir(solicitacaoId: number): Promise<void> {
    const pool = await getLegacyPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      await new sql.Request(tx)
        .input('id', sql.Int, solicitacaoId)
        .query(`DELETE FROM EDC_ANEXO_SOLICITACAO WHERE SOL_COD = @id`);
      await new sql.Request(tx)
        .input('id', sql.Int, solicitacaoId)
        .query(`DELETE FROM EDC_SOLICITACAO WHERE SOL_COD = @id`);
      await tx.commit();
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  },

  /**
   * Insere anexos vinculados a uma solicitação. Decode base64 → varbinary.
   */
  async inserirAnexos(input: {
    solicitacaoId: number;
    anexos: AnexoBase64[];
  }): Promise<void> {
    if (!input.anexos.length) return;
    const pool = await getLegacyPool();
    for (const arq of input.anexos) {
      const buf = Buffer.from(arq.conteudo, 'base64');
      await pool
        .request()
        .input('nome', sql.NVarChar(255), arq.nome)
        .input('extensao', sql.NVarChar(20), arq.formato)
        .input('solCod', sql.Int, input.solicitacaoId)
        .input('arquivo', sql.VarBinary(sql.MAX), buf)
        .query(`
          INSERT INTO EDC_ANEXO_SOLICITACAO (ANE_NOME, ANE_EXTENSAO, SOL_COD, ANE_ARQUIVO)
          VALUES (@nome, @extensao, @solCod, @arquivo)
        `);
    }
  },

  /** Remove todos os anexos de uma solicitação (usado em update cadastral). */
  async removerAnexos(solicitacaoId: number): Promise<void> {
    const pool = await getLegacyPool();
    await pool
      .request()
      .input('id', sql.Int, solicitacaoId)
      .query(`DELETE FROM EDC_ANEXO_SOLICITACAO WHERE SOL_COD = @id`);
  },
};
