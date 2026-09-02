import { apiNotifications } from '../apiNotifications';

export interface ListagemBoletimEscolar {
    numero_linha: number;
    semestre_inicial: number;
    is_encerramento_semestral: boolean;
    disciplina: string;
    nota_1: number;
    nota_2: number;
    nota_3: number;
    nota_4: number;
    nota_recuperacao: number;
    media: number;
    media_final: number;
    falta_1: number;
    falta_2: number;
    falta_3: number;
    falta_4: number;
    total_faltas: number;
    is_aprovado_em_conselho: boolean;
    situacao: string;
    tipo_avaliacao: string;
    nota_limite_inferior: number;
    nota_limite_superior: number;
    dt_inicio_unidade_1: string;
    dt_fim_unidade_1: string;
    dt_inicio_unidade_2: string;
    dt_fim_unidade_2: string;
    dt_inicio_unidade_3: string;
    dt_fim_unidade_3: string;
    dt_inicio_unidade_4: string;
    dt_fim_unidade_4: string;
    perc_frequencia_minima: number;
    media_para_aprovacao: number;
    qtd_unidades: number;
    und_numerador_1: number;
    und_denominador_1: number;
    und_numerador_2: number;
    und_denominador_2: number;
    und_numerador_3: number;
    und_denominador_3: number;
    und_numerador_4: number;
    und_denominador_4: number;
    und_numerador_media: number;
    und_denominador_media: number;
    total_aulas_anual: number;
    data_fim_ano_letivo: string;
}

export async function getBoletimEscolar(
    pes_cod_aluno: number,
    ano_letivo: number
): Promise<ListagemBoletimEscolar[]> {
    const response = await apiNotifications.get<ListagemBoletimEscolar[]>('/boletim', {
        params: {
            pesCodAluno: pes_cod_aluno,
            anoLetivo: ano_letivo,
        },
    });
    return response.data;
}
