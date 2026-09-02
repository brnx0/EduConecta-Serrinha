import React, { createContext, useCallback, useContext, useState } from 'react';
import { GetAlunos } from '../services/home/HomeService';

export interface Aluno {
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
  anos_disponiveis?: {
    id: number;
    label: string;
  }[]
  ano_selecionado?: number;
  ocorrencia_nova: number;
  ocorrencia_pendente: number;
}

interface AlunoContextData {
  aluno: Aluno | null;
  setAluno: (aluno: Aluno, ano?: number) => void;
  clearAluno: () => void;
  preCarregarDados: () => Promise<void>;
  mudarAnoSelecionado: (ano: number) => void;
  atualizarOcorrenciaPendente: () => void;
}

const AlunoContext = createContext<AlunoContextData | undefined>(undefined);

export const AlunoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [aluno, setAlunoState] = useState<Aluno | null>(null);

  const mudarAnoSelecionado = (novoAno: number) => {
    if (aluno) {
      setAlunoState({ ...aluno, ano_selecionado: novoAno });
    }
  };

  const processarAluno = (alunoBruto: Aluno, ano?: number): Aluno => {
    if (!alunoBruto.anos) {
      // Fallback caso não venha anos
      const anoAtual = new Date().getFullYear();
      return {
        ...alunoBruto,
        anos_disponiveis: [{ id: anoAtual, label: String(anoAtual) }],
        ano_selecionado: anoAtual
      };
    }

    const anosNumericos = alunoBruto.anos
      .split(',')
      .map((ano) => parseInt(ano.trim()))
      .filter((ano) => !isNaN(ano));


    const anosOrdenados = anosNumericos.sort((a, b) => b - a);

    const anosDisponiveis = anosOrdenados.map((ano) => ({
      id: ano,
      label: String(ano),
    }));

    let anoSelecionado = 0

    if (!ano) {
      anoSelecionado = anosOrdenados.length > 0 ? anosOrdenados[0] : new Date().getFullYear();
    } else {
      anoSelecionado = ano
    }


    return {
      ...alunoBruto,
      anos_disponiveis: anosDisponiveis,
      ano_selecionado: anoSelecionado,
    };
  };

  const setAluno = (novoAluno: Aluno) => {
    setAlunoState((alunoAtual) => {

      // se for mesmo aluno base (mesmo pes_cod)
      if (alunoAtual && alunoAtual.pes_cod === novoAluno.pes_cod) {
        // só troca os dados do vínculo (ano, turma, escola etc)
        return {
          ...novoAluno,
          anos_disponiveis: alunoAtual.anos_disponiveis,
          ano_selecionado: novoAluno.ano_letivo
        };
      }

      // aluno diferente → processa anos
      return processarAluno(novoAluno);
    });
  };

  const atualizarOcorrenciaPendente = useCallback(() => {
    setAlunoState((prevAluno) => {
      if (!prevAluno) return null;

      return {
        ...prevAluno,
        ocorrencia_pendente: 0
      };
    });
  }, []);


  const clearAluno = () => {
    setAlunoState(null);
  };

  const preCarregarDados = async () => {
    try {

      const listaAlunos = await GetAlunos();

      if (listaAlunos && listaAlunos.length > 0) {

        const alunoPrincipal = processarAluno(listaAlunos[0]);

        setAlunoState(alunoPrincipal);
      }
    } catch (error: any) {
      throw new Error('Erro ao carregar dados do aluno.');
    }
  };

  return (
    <AlunoContext.Provider value={{ aluno, setAluno, clearAluno, preCarregarDados, mudarAnoSelecionado, atualizarOcorrenciaPendente }}>
      {children}
    </AlunoContext.Provider>
  );
};

export function useAluno() {
  const context = useContext(AlunoContext);
  if (!context) {
    throw new Error('useAluno deve ser usado dentro de AlunoProvider');
  }
  return context;
}
