import { apiNotifications } from '../apiNotifications';

export interface ListagemAlunos {
    pes_cod: number;
    aluno_turma_cod: number;
    matricula: string;
    nome: string;
    cpf: string;
    curso: string;
    serie: string;
    escola: string;
    escola_cod: number;
    turma: string;
    sexo: string;
    situacao: string;
    turno: string;
    ano_letivo: number;
    total_aulas_anual: number;
    total_faltas: number;
    data_prox_atividade?: string;
    disciplina_prox_atividade?: string;
    descricao_prox_atividade?: string;
    anos: string;
    ocorrencia_pendente: number;
    ocorrencia_nova: number;
}

/**
 * Lista alunos do responsável logado. JWT carrega o CPF — backend resolve.
 */
export async function GetAlunos(): Promise<ListagemAlunos[]> {
    const response = await apiNotifications.get<ListagemAlunos[]>('/alunos');
    return response.data;
}
