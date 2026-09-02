/**
 * DTO Conteúdo (plano de aula).
 */
export interface ConteudoItem {
  id: number;
  tema: string;
  conteudo: string;
  desenvolvimento: string;
  data_inicio: string;
  data_fim: string;
  disciplina: string;
}
