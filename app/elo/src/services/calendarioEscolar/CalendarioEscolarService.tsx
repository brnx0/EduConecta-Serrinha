import { apiNotifications } from '../apiNotifications';

export interface DiaLetivoUnidade {
    unidade: string;
    data_inicio: string;
    data_fim: string;
    total_dias_letivos: number;
}

export interface CalendarioEscolar {
    dia: number;
    data: string;
    status_dia: string;
    motivo?: string;
    cor: string;
}

export interface AtividadeCalendario {
    dia: number;
    atividade: string;
    disciplina: string;
    data: string;
    valor: number;
    nota: number;
}

export interface CalendarioEscolarResponse {
    calendario: CalendarioEscolar[];
    atividades: AtividadeCalendario[];
}

export async function getCalendarioEscolar(
    pes_cod_aluno: number,
    ano: number,
    mes: number
): Promise<CalendarioEscolarResponse> {
    const response = await apiNotifications.get<CalendarioEscolarResponse>('/calendario', {
        params: {
            pesCodAluno: pes_cod_aluno,
            ano,
            mes,
        },
    });
    return response.data;
}

export async function getDiasLetivos(
    pes_cod_aluno: number,
    ano_letivo: number
): Promise<DiaLetivoUnidade[]> {
    const response = await apiNotifications.get<DiaLetivoUnidade[]>('/calendario/dias-letivos', {
        params: {
            pesCodAluno: pes_cod_aluno,
            anoLetivo: ano_letivo,
        },
    });
    return response.data;
}
