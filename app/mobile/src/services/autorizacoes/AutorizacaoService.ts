import { apiNotifications } from '../apiNotifications';

export type AutorizacaoTipo = 'A' | 'P';

export type AutorizacaoStatus =
    | 'pendente'
    | 'aprovado'
    | 'recusado'
    | 'confirmada'
    | 'nao_comparecera';

export type AutorizacaoAcao = Exclude<AutorizacaoStatus, 'pendente'>;

export interface Autorizacao {
    id: number;
    titulo: string;
    detalhes: string;
    tipo: AutorizacaoTipo;
    status: AutorizacaoStatus;
    /** ISO YYYY-MM-DD */
    data: string;
}

/**
 * Lista autorizações do aluno. Backend filtra por curso/escola/turma do
 * vínculo no ano letivo atual.
 */
export async function getAutorizacoes(alunoPesCod: number): Promise<Autorizacao[]> {
    try {
        const response = await apiNotifications.get<Autorizacao[]>('/autorizacoes', {
            params: { alunoPesCod },
        });
        return response.data;
    } catch (error: any) {
        const msg = error.response?.data?.message || error.message || 'Erro ao buscar autorizações.';
        throw new Error(msg);
    }
}

/**
 * Registra resposta do responsável. Backend valida:
 *   - aluno pertence ao responsável (JWT)
 *   - ação compatível com tipo (A: aprovado/recusado, P: confirmada/nao_comparecera)
 *   - idempotência (409 se já respondida)
 *
 * Não envia mais `responsavel`/`tmh_cod` — vêm do JWT/lookup no backend.
 */
export async function postAutorizacao(
    autorizacao: Autorizacao,
    alunoPesCod: number,
    acao: AutorizacaoAcao
): Promise<{ ok: true }> {
    try {
        const response = await apiNotifications.post<{ ok: true }>(
            `/autorizacoes/${autorizacao.id}/respostas`,
            { alunoPesCod, acao }
        );
        return response.data;
    } catch (error: any) {
        const code = error.response?.data?.error;
        const msg = error.response?.data?.message;

        if (code === 'ja_respondida') {
            throw new Error(msg || 'Esta autorização já foi respondida.');
        }
        if (code === 'acao_incompativel') {
            throw new Error(msg || 'Ação inválida para este tipo de autorização.');
        }
        if (code === 'autorizacao_nao_encontrada') {
            throw new Error(msg || 'Autorização não encontrada.');
        }
        if (code === 'sem_vinculo_ativo') {
            throw new Error(msg || 'Aluno sem matrícula ativa.');
        }
        throw new Error(msg || error.message || 'Erro ao registrar ação.');
    }
}

/**
 * Helper de UI: rótulo humanizado do status pra exibição.
 */
export function statusLabel(status: AutorizacaoStatus): string {
    switch (status) {
        case 'pendente':
            return 'Pendente';
        case 'aprovado':
            return 'Aprovado';
        case 'recusado':
            return 'Recusado';
        case 'confirmada':
            return 'Confirmada';
        case 'nao_comparecera':
            return 'Não comparecerá';
    }
}
