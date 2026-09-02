/**
 * DTO Aviso do mural escolar.
 */
export interface AvisoMural {
  id: number;
  titulo: string;
  descricao: string;
  imagem: string | null;
  data_cadastro: string;
  data_inicio: string;
  data_fim: string;
}
