import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';

// Components & Services
import { Header } from '../../components/Header';
import { AlunoCard } from '../../components/AlunoCard';
import { FormSelect } from '../../components/forms/FormSelect';
import { FormSwitch } from '../../components/forms/FormSwitch';
import { getBoletimEscolar, ListagemBoletimEscolar } from '../../services/boletim/BoletimEscolarService';
import { useAluno } from '../../context/AlunoContext';
import { colors } from '../../constants/colors';
import { Skeleton } from '../../components/Skeleton';

// --- Constants & Helpers ---
const ROW_HEIGHT = 50;

const getCorNota = (nota: number, dtFim: string | null) => {
    if (!dtFim || new Date(dtFim) > new Date()) return '#94a3b8'; // Cinza se ainda não acabou
    return nota >= 6 ? colors.edu.accent : '#EF4444'; // Azul ou Vermelho
};

const getSituacaoItem = (item: ListagemBoletimEscolar) => {
    const hoje = new Date();
    const fimAno = new Date(item.data_fim_ano_letivo);
    if (hoje <= fimAno) return "Cursando";
    return item.media >= item.media_para_aprovacao ? "Aprovado" : "Reprovado";
};

// --- Sub-Components (Cells) ---

const HeaderCell = ({ label, width = 80 }: { label: string, width?: number }) => (
    <View style={{ width, height: ROW_HEIGHT }} className="items-center justify-center border-r border-black/15 px-1">
        <Text className="text-white text-[10px] font-bold text-center uppercase">{label}</Text>
    </View>
);

const BimestreHeader = ({ label }: { label: string }) => (
    <View style={{ width: 100, height: ROW_HEIGHT }} className="border-r border-black/15">
        <View className="flex-1 items-center justify-center px-1">
            <Text className="text-white text-[10px] font-bold uppercase">{label}</Text>
        </View>
        <View className="flex-row h-5 border-t border-black/15">
            <View className="flex-1 items-center justify-center"><Text className="text-white text-[9px] font-semibold">Nota</Text></View>
            <View className="w-8 items-center justify-center"><Text className="text-white text-[9px] font-semibold">Falta</Text></View>
        </View>
    </View>
);

const DataCell = ({ text, color = '#334155', fontBold = false }: { text: string | number, color?: string, fontBold?: boolean }) => (
    <View style={{ width: 80, height: ROW_HEIGHT }} className="items-center justify-center border-r border-slate-100">
        <Text style={{ color }} className={`text-xs ${fontBold ? 'font-bold' : 'font-semibold'}`}>{text}</Text>
    </View>
);

const BimestreCell = ({ nota, falta, dtInicio }: { nota: number, falta: number, dtInicio: string }) => (
    <View style={{ width: 100, height: ROW_HEIGHT }} className="flex-row border-r border-slate-100">
        <View className="flex-1 items-center justify-center border-r border-slate-50">
            <Text style={{ color: getCorNota(nota, dtInicio) }} className="font-bold text-xs">{nota}</Text>
        </View>
        <View className="w-8 items-center justify-center bg-slate-50">
            <Text className="text-slate-400 text-[10px]">{falta}</Text>
        </View>
    </View>
);

const DisciplinaColumn = ({ dados, isFixed }: { dados: ListagemBoletimEscolar[], isFixed?: boolean }) => {
    // Se isFixed=true, renderiza o cabeçalho azul + linhas. Se false, só linhas (usado no scroll caso não fixo)
    return (
        <View className={isFixed ? "z-10 shadow-lg border-r border-slate-200 bg-white" : ""}>
            {isFixed && (
                <View style={{ width: 180, height: ROW_HEIGHT, backgroundColor: colors.edu.dark }} className="justify-center px-3 border-b border-black/15">
                    <Text className="text-white font-bold text-xs uppercase">Disciplina</Text>
                </View>
            )}

            {dados.map((item, index) => (
                <View key={`disc-${item.disciplina}-${index}`} style={{ height: ROW_HEIGHT, width: 180 }} className={`justify-center px-3 border-b border-r border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <Text className="text-slate-700 font-bold text-[11px]" numberOfLines={2}>{item.disciplina}</Text>
                </View>
            ))}
        </View>
    )
}

function BoletimSkeleton() {
  return (
    <View className="flex-1">
      {/* 1. Bloco de Resumo (Simula Select, Switch e Infos) */}
      <View className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4">
        {/* Linha 1: Select e Switch */}
        <View className="flex-row justify-between mb-4">
          <Skeleton width="60%" height={40} borderRadius={12} />
          <Skeleton width="35%" height={40} borderRadius={12} />
        </View>
        
        {/* Linha 2: Infos Gerais (Simula as 3 colunas de info) */}
        <View className="flex-row justify-between mt-2 pt-4 border-t border-slate-50">
          <View className="items-center"><Skeleton width={60} height={10} borderRadius={4} style={{marginBottom:4}} /><Skeleton width={40} height={14} borderRadius={4} /></View>
          <View className="items-center"><Skeleton width={60} height={10} borderRadius={4} style={{marginBottom:4}} /><Skeleton width={40} height={14} borderRadius={4} /></View>
          <View className="items-center"><Skeleton width={60} height={10} borderRadius={4} style={{marginBottom:4}} /><Skeleton width={40} height={14} borderRadius={4} /></View>
        </View>
      </View>

      {/* 2. Tabela de Notas */}
      <View className="mx-4 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Header da Tabela */}
        <View className="flex-row items-center border-b border-blue-100 p-3 bg-slate-50">
          <Skeleton width={100} height={16} borderRadius={4} />
          <View className="flex-1 flex-row justify-end gap-3">
             <Skeleton width={40} height={16} borderRadius={4} />
             <Skeleton width={40} height={16} borderRadius={4} />
             <Skeleton width={40} height={16} borderRadius={4} />
          </View>
        </View>

        {/* Linhas da Tabela (Gerando 8 linhas falsas) */}
        {Array.from({ length: 8 }).map((_, index) => (
          <View 
            key={index} 
            className={`flex-row items-center p-3 border-b border-slate-100 ${index % 2 !== 0 ? 'bg-slate-50/50' : 'bg-white'}`}
            style={{ height: 50 }}
          >
            {/* Coluna Disciplina */}
            <View className="flex-1 pr-4">
              <Skeleton width="80%" height={14} borderRadius={4} />
            </View>

            {/* Colunas Notas (Simulando visualmente) */}
            <View className="flex-row gap-4 opacity-70">
              <Skeleton width={30} height={20} borderRadius={4} />
              <Skeleton width={30} height={20} borderRadius={4} />
              <Skeleton width={30} height={20} borderRadius={4} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}


// --- Main Screen ---

export default function BoletimEscolarScreen() {
    const { aluno } = useAluno();

    // States
    const [isLoading, setIsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [dados, setDados] = useState<ListagemBoletimEscolar[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [fixarDisciplinas, setFixarDisciplinas] = useState(true);

    // State do Ano Local (Inicia com o do contexto)
    const [anoLocal, setAnoLocal] = useState<{ id: number; label: string } | null>(
        () => aluno?.anos_disponiveis?.find(a => a.id === aluno.ano_selecionado) || null
    );

    // Effects
    useEffect(() => {
        if (aluno) {
            const padrao = aluno.anos_disponiveis?.find(a => a.id === aluno.ano_selecionado);
            setAnoLocal(padrao || null);
        }
    }, [aluno]);

    useEffect(() => { fetchBoletim(); }, [anoLocal]);

    // Data Fetching
    const fetchBoletim = async () => {
        if (!aluno || !anoLocal) return;
        setIsLoading(true);
        setError(null);
        setDados([]);
        try {
            const result = await getBoletimEscolar(aluno.pes_cod, anoLocal.id);
            if (result) setDados(result);
        } catch (err) {
            console.error(err);
            setError('Não foi possível carregar as informações.');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchBoletim();
    };

    // Memoized Calculations
    const infoGeral = useMemo(() => {
        if (!dados.length) return null;
        const base = dados[0];
        return {
            curso: aluno!.curso,
            totalAulas: base.total_aulas_anual,
            mediaMinima: base.media_para_aprovacao,
            freqMinima: base.perc_frequencia_minima,
            faltasTotais: dados.reduce((acc, item) => acc + (item.total_faltas || 0), 0)
        };
    }, [dados, aluno]);

    const situacaoFinal = useMemo(() => {
        if (!dados.length || !infoGeral) return "";
        const hoje = new Date();
        const fimAno = new Date(dados[0].data_fim_ano_letivo);

        if (hoje < fimAno) return "Cursando";

        const freqAnual = ((infoGeral.totalAulas - infoGeral.faltasTotais) * 100) / infoGeral.totalAulas;
        if (freqAnual < infoGeral.freqMinima) return "Reprovado por Falta";

        const reprovadoNota = dados.some(i => hoje > new Date(i.data_fim_ano_letivo) && i.media_final < i.media_para_aprovacao && !i.is_aprovado_em_conselho);
        if (reprovadoNota) return "Reprovado";
        if (dados.some(i => i.is_aprovado_em_conselho)) return "Aprovado pelo Conselho";

        return "Aprovado";
    }, [dados, infoGeral]);

    const unidadesVisiveis = useMemo(() => {
        if (!dados.length) return [];
        const { semestre_inicial, is_encerramento_semestral, qtd_unidades } = dados[0];
        if (is_encerramento_semestral) return Array.from({ length: Math.ceil(qtd_unidades / 2) }, (_, i) => i + 1);
        if (semestre_inicial === 2) {
            const metade = Math.ceil(qtd_unidades / 2);
            return Array.from({ length: qtd_unidades - metade }, (_, i) => i + metade + 1);
        }
        return Array.from({ length: qtd_unidades }, (_, i) => i + 1);
    }, [dados]);

    // Render Logic
    return (
        <View className="flex-1 bg-slate-150">
            <Header title="Boletim Escolar" showBack={true} />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.edu.dark]} tintColor={colors.edu.dark} />}
            >
                <AlunoCard alunoAtual={aluno!} />

                {/* Filters & Summary Block */}
                <View className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                    <View className="flex-row items-center justify-between gap-4">
                        <View className="flex-1">
                            <FormSelect label="Ano Letivo" required value={anoLocal} options={aluno?.anos_disponiveis!} onSelect={setAnoLocal} />
                        </View>
                        <View className="w-44 justify-center">
                            <FormSwitch label="Disciplinas" value={fixarDisciplinas} onChange={setFixarDisciplinas} onLabel="Travadas" offLabel="Livres" />
                        </View>
                    </View>

                    {infoGeral && !isLoading && (
                        <View>
                            <View className="mt-4 pt-4 border-t border-slate-100 flex-row flex-wrap justify-between gap-y-2">
                                <InfoBlockItem label="Ensino" value={infoGeral.curso} />
                                <InfoBlockItem label="Sit. Final." value={situacaoFinal} />
                                <InfoBlockItem label="Média Min." value={infoGeral.mediaMinima} />
                            </View>
                            <View className="mt-4 pt-4 flex-row flex-wrap justify-between gap-y-2">
                                <InfoBlockItem label="Aulas/Ano" value={infoGeral.totalAulas} />
                                <InfoBlockItem label="Freq. Min." value={`${infoGeral.freqMinima}%`} />
                                <InfoBlockItem label="Tot. Faltas" value={infoGeral.faltasTotais} />
                            </View>
                        </View>
                    )}
                </View>

                {/* Table Content */}
                {isLoading ? (
                    <BoletimSkeleton />
                ) : error ? (
                    <ErrorState onRetry={() => fetchBoletim()} />
                ) : dados.length === 0 ? (
                    <EmptyState />
                ) : (
                    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                        <View className="m-4 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-row">

                            {/* Fixed Column (Left) */}
                            {fixarDisciplinas && <DisciplinaColumn dados={dados} isFixed />}

                            {/* Scrollable Columns (Right) */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1" bounces={false} overScrollMode="never">
                                <View>
                                    {/* Header Row */}
                                    <View style={{ height: ROW_HEIGHT, backgroundColor: colors.edu.dark }} className="flex-row border-b border-black/15">
                                        {!fixarDisciplinas && (
                                            <View style={{ width: 180, height: ROW_HEIGHT, backgroundColor: colors.edu.dark }} className="justify-center px-3 border-r border-black/15">
                                                <Text className="text-white font-bold text-xs uppercase">Disciplina</Text>
                                            </View>
                                        )}
                                        {unidadesVisiveis.map(u => <BimestreHeader key={u} label={`${u}º Bimestre`} />)}
                                        <HeaderCell label="Média Anual" />
                                        <HeaderCell label="Recup. Final" />
                                        <HeaderCell label="Média Final" />
                                        <HeaderCell label="Faltas Total" />
                                        <HeaderCell label="Situação" width={100} />
                                    </View>

                                    {/* Data Rows */}
                                    {dados.map((item, index) => (
                                        <View key={`row-${item.disciplina}-${index}`} style={{ height: ROW_HEIGHT }} className={`flex-row border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                            {!fixarDisciplinas && (
                                                <View style={{ width: 180, height: ROW_HEIGHT }} className="justify-center px-3 border-r border-slate-100">
                                                    <Text className="text-slate-700 font-bold text-[11px]" numberOfLines={2}>{item.disciplina}</Text>
                                                </View>
                                            )}

                                            {unidadesVisiveis.map(u => (
                                                <BimestreCell
                                                    key={u}
                                                    nota={item[`nota_${u}` as keyof typeof item] as number}
                                                    falta={item[`falta_${u}` as keyof typeof item] as number}
                                                    dtInicio={item[`dt_inicio_unidade_${u}` as keyof typeof item] as string}
                                                />
                                            ))}
                                            <DataCell text={item.media} color={getCorNota(item.media, item.dt_inicio_unidade_4)} />
                                            <DataCell text={item.nota_recuperacao} />
                                            <DataCell text={item.media_final} color={getCorNota(item.media_final, item.dt_inicio_unidade_4)} fontBold />
                                            <DataCell text={item.total_faltas} color="#64748b" />
                                            <View style={{ width: 100, height: ROW_HEIGHT }} className="items-center justify-center border-r border-slate-100 px-2">
                                                <View className="px-2 py-1 rounded-md bg-slate-100">
                                                    <Text className="text-[9px] font-bold text-slate-500 uppercase">{getSituacaoItem(item)}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>
                    </ScrollView>
                )}
            </ScrollView>
        </View>
    );
}

// --- Helpers de UI ---

const InfoBlockItem = ({ label, value }: { label: string, value: string | number }) => (
    <View className="items-center flex-1 min-w-[80px]">
        <Text className="text-slate-400 text-[10px] font-bold uppercase mb-0.5">{label}</Text>
        <Text className="text-slate-700 text-xs font-bold text-center">{value}</Text>
    </View>
);

const LoadingState = () => (
    <View className="flex-1 justify-center items-center mt-6">
        <ActivityIndicator size="large" color={colors.edu.dark} />
        <Text className="text-slate-400 mt-2">Carregando notas...</Text>
    </View>
);

const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
    <View className="mx-4 mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 items-center">
        <View className="w-12 h-12 rounded-full bg-amber-100 items-center justify-center mb-3">
            <Feather name="alert-triangle" size={22} color="#F59E0B" />
        </View>
        <Text className="text-amber-800 font-bold text-base text-center mb-1">Ops! Algo deu errado</Text>
        <Text className="text-amber-700 text-sm text-center mb-4">Não foi possível carregar as informações.</Text>
        <TouchableOpacity onPress={onRetry} className="px-6 py-2.5 rounded-xl bg-edu-dark active:opacity-80">
            <Text className="text-white font-bold">Tentar novamente</Text>
        </TouchableOpacity>
    </View>
);

const EmptyState = () => (
    <View className="mx-4 mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 items-center">
        <View className="w-12 h-12 rounded-full bg-amber-100 items-center justify-center mb-3">
            <Feather name="info" size={22} color="#F59E0B" />
        </View>
        <Text className="text-amber-800 font-bold text-base text-center mb-1">Nenhum dado encontrado</Text>
        <Text className="text-amber-700 text-sm text-center mb-4">Não há informações disponíveis para o ano letivo selecionado.</Text>
    </View>
);