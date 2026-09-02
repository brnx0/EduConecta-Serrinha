import { apiNotifications } from '../apiNotifications';

export interface ListagemConteudo {
    id: number;
    tema: string;
    conteudo: string;
    desenvolvimento: string;
    data_inicio: string;
    data_fim: string;
    disciplina: string;
}

export async function getConteudos(
    pes_cod_aluno: number,
    ano_letivo: number
): Promise<ListagemConteudo[]> {
    const response = await apiNotifications.get<ListagemConteudo[]>('/conteudos', {
        params: {
            pesCodAluno: pes_cod_aluno,
            anoLetivo: ano_letivo ?? new Date().getFullYear(),
        },
    });
    return response.data;
}
