import { apiNotifications } from '../apiNotifications';

export interface ListagemAvisos {
    id: number;
    titulo: string;
    descricao: string;
    imagem: string;
    data_cadastro: string;
    data_fim: string;
}

export async function getMuralAvisos(
    escola_cod: number,
    pes_cod_aluno: number,
    limite_registros?: number
): Promise<ListagemAvisos[]> {
    const response = await apiNotifications.get<ListagemAvisos[]>('/mural/avisos', {
        params: {
            escolaCod: escola_cod,
            pesCodAluno: pes_cod_aluno,
            limit: limite_registros ?? 5,
        },
    });
    return response.data;
}
