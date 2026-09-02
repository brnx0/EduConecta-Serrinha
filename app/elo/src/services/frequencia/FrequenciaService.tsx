import { apiNotifications } from '../apiNotifications';

export interface CalendarioEscolar {
    dia: number;
    data: string;
    status_dia: string;
    motivo?: string;
    cor: string;
}

export async function getFrequenciaEscolar(
    pes_cod: number,
    ano: number,
    mes: number
): Promise<CalendarioEscolar[]> {
    const response = await apiNotifications.get<CalendarioEscolar[]>('/frequencia', {
        params: {
            pesCodAluno: pes_cod,
            ano,
            mes,
        },
    });
    return response.data;
}
