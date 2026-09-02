import { apiNotifications } from '../apiNotifications';

export interface TipoSolicitacao {
    id: number;
    label: string;
}

export type SolicitacaoStatus = 'pendente' | 'aprovado' | 'reprovado';

export interface SolicitacaoItem {
    id: number;
    /** ISO YYYY-MM-DD */
    data: string;
    andamento: SolicitacaoStatus;
    payload: Record<string, any> | string;
    tipo: number;
}

interface PortadorData {
    nome: string;
    cpf: string;
    rg: string;
    telefone: string;
    parentesco: string;
    aluno?: number;
    tipoSolicitacao?: number;
    solicitacao_id?: string;
}

interface AnexoBase64 {
    nome: string;
    formato: string;
    conteudo: string;
}

export async function getTiposSolicitacao(): Promise<TipoSolicitacao[]> {
    try {
        const response = await apiNotifications.get<TipoSolicitacao[]>('/solicitacoes/tipos');
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Erro ao buscar tipos de solicitação.');
    }
}

export async function getSolicitacoes(tipo: number): Promise<SolicitacaoItem[]> {
    try {
        const response = await apiNotifications.get<SolicitacaoItem[]>('/solicitacoes', {
            params: { tipo },
        });
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Erro ao buscar solicitações.');
    }
}

export async function deleteSolicitacao(codigoSolicitacao: number): Promise<void> {
    try {
        await apiNotifications.delete(`/solicitacoes/${codigoSolicitacao}`);
    } catch (error: any) {
        const data = error.response?.data;
        throw new Error(data?.message || 'Erro ao excluir solicitação.');
    }
}

/**
 * Cria solicitação de portador. Backend valida CPF duplicado e retorna
 * 409 com `{ error: "cpf_duplicado", message }`.
 */
export async function postPortador(
    data: PortadorData,
    tipoSolicitacao: number
): Promise<{ id: number }> {
    try {
        const response = await apiNotifications.post<{ id: number }>(
            '/solicitacoes/portador',
            {
                tipoSolicitacao,
                alunoPesCod: data.aluno,
                portador: {
                    nome: data.nome,
                    cpf: data.cpf.replace(/\D/g, ''),
                    rg: data.rg,
                    telefone: data.telefone,
                    parentesco: data.parentesco,
                },
            }
        );
        return response.data;
    } catch (error: any) {
        const code = error.response?.data?.error;
        const msg = error.response?.data?.message;
        if (code === 'cpf_duplicado') {
            // Mantém shape esperado pela tela (`error[0]?.ErrorRetorno`)
            return Promise.reject([{ ErrorRetorno: msg }]);
        }
        throw new Error(msg || 'Erro ao cadastrar portador.');
    }
}

/**
 * Atualiza dados de um portador existente.
 */
export async function putPortador(
    data: PortadorData,
    codigoSolicitacao: number
): Promise<{ ok: true }> {
    try {
        const response = await apiNotifications.patch<{ ok: true }>(
            `/solicitacoes/${codigoSolicitacao}`,
            {
                dados: {
                    nome: data.nome,
                    cpf: data.cpf.replace(/\D/g, ''),
                    rg: data.rg,
                    telefone: data.telefone,
                    parentesco: data.parentesco,
                },
            }
        );
        return response.data;
    } catch (error: any) {
        const msg = error.response?.data?.message;
        return Promise.reject([{ ErrorRetorno: msg || 'Erro ao atualizar portador.' }]);
    }
}

interface AtualizacaoCadastralPayload {
    aluno: number;
    tipoSolicitacao: number;
    descricao: string;
    arquivos: AnexoBase64[];
}

export async function postAtualizacaoCadastral(
    dados: AtualizacaoCadastralPayload
): Promise<{ id: number }> {
    try {
        const response = await apiNotifications.post<{ id: number }>(
            '/solicitacoes/atualizacao-cadastral',
            {
                tipoSolicitacao: dados.tipoSolicitacao,
                alunoPesCod: dados.aluno,
                descricao: dados.descricao,
                arquivos: dados.arquivos,
            }
        );
        return response.data;
    } catch (error: any) {
        const msg = error.response?.data?.message || error.message;
        throw new Error(msg || 'Erro ao enviar atualização cadastral.');
    }
}

export async function putAtualizacaoCadastral(
    dados: AtualizacaoCadastralPayload,
    codigoSolicitacao: number
): Promise<{ ok: true }> {
    try {
        const response = await apiNotifications.put<{ ok: true }>(
            `/solicitacoes/${codigoSolicitacao}/atualizacao-cadastral`,
            {
                descricao: dados.descricao,
                arquivos: dados.arquivos,
            }
        );
        return response.data;
    } catch (error: any) {
        const msg = error.response?.data?.message || error.message;
        throw new Error(msg || 'Erro ao atualizar atualização cadastral.');
    }
}
