import { apiNotifications } from '../apiNotifications';

export interface ListagemHorarios {
    pes_cod_aluno: number;
    dia_semana: number;
    tempo: number;
    escola: string;
    disciplina: string;
    serie: string;
    turma: string;
    professor: string;
    ano_letivo: number;
}

export async function GetHorarios(
    pes_cod_aluno: number,
    ano_letivo: number
): Promise<ListagemHorarios[]> {
    const response = await apiNotifications.get<ListagemHorarios[]>('/horarios', {
        params: {
            pesCodAluno: pes_cod_aluno,
            anoLetivo: ano_letivo,
        },
    });
    return response.data;
}
