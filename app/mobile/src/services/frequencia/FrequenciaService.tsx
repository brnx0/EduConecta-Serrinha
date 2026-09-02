import { apiNotifications } from '../apiNotifications';

export type StatusGeral = 'em_dia' | 'atencao' | 'risco';
export type RegistroStatus = 'presente' | 'falta' | 'justificada';

export interface GeralFreq {
    total: number; presencas: number; faltas: number; justificadas: number;
    percentual: number; minimo: number; status: StatusGeral;
}
export interface DisciplinaFreq {
    disciplina: string; total: number; presencas: number; faltas: number;
    justificadas: number; percentual: number; abaixoMinimo: boolean;
}
export interface PeriodoFreq {
    ordem: number; nome: string; total: number; presencas: number;
    faltas: number; justificadas: number; percentual: number;
}
export interface ResumoFrequencia {
    geral: GeralFreq; porDisciplina: DisciplinaFreq[]; porPeriodo: PeriodoFreq[];
}

export interface AulaPresenca { tempo: number; disciplina: string; status: RegistroStatus; cor: string }
export interface ResumoDia { total: number; presencas: number; faltas: number; justificadas: number }
export interface DiaPresenca { data: string; dia_semana: number; resumo: ResumoDia; aulas: AulaPresenca[] }

export async function getResumoFrequencia(pesCod: number, ano: number): Promise<ResumoFrequencia> {
    const response = await apiNotifications.get<ResumoFrequencia>('/frequencia/resumo', {
        params: { pesCodAluno: pesCod, ano },
    });
    return response.data;
}

export async function getDiasFrequencia(pesCod: number, ano: number, mes: number): Promise<DiaPresenca[]> {
    const response = await apiNotifications.get<DiaPresenca[]>('/frequencia/dias', {
        params: { pesCodAluno: pesCod, ano, mes },
    });
    return response.data;
}
