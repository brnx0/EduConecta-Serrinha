import { apiNotifications } from '../apiNotifications';

export interface ListagemOcorrencia {
    ocorrencia_id: number;
    titulo: string;
    tipo: string;
    data_ocorrencia: string;
    aluno: string;
    ciente: 'Sim' | 'Não';
    dt_confirmacao: string | null;
    professor: string;
    ano: number;
    escola: string;
    turma: string;
    descricao: string;
    exige_conhecimento: number;
}

export const getOcorrencias = async (
    codAluno: number,
    ano: number
): Promise<ListagemOcorrencia[]> => {
    const response = await apiNotifications.get<ListagemOcorrencia[]>('/ocorrencias', {
        params: {
            pesCodAluno: codAluno,
            anoLetivo: ano ?? new Date().getFullYear(),
        },
    });
    return response.data;
};

/**
 * Marca ocorrência como "ciente". `usr_codigo` agora vem do JWT no backend
 * — parâmetro mantido na assinatura por compat com chamadores existentes.
 */
export async function postOcorrenciaCiente(
    ocorrencia_id: number,
    _usr_codigo?: number
): Promise<void> {
    await apiNotifications.patch(`/ocorrencias/${ocorrencia_id}/ciente`);
}
