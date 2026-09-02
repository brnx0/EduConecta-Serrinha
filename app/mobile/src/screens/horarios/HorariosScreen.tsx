import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, RefreshControl } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Services & Context
import { GetHorarios, ListagemHorarios } from '../../services/horario/HorariosService';
import { useAluno } from '../../context/AlunoContext';

// Components
import { Header } from '../../components/Header';
import { AlunoCard } from '../../components/AlunoCard';
import { Skeleton } from '../../components/Skeleton';
import { colors } from '../../constants/colors';

// --- Interfaces & Constants ---

interface HorarioSemanal {
    [dia: string]: {
        [periodo: string]: ListagemHorarios | null;
    };
}

const PERIODOS_TODOS = ['1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º', '9º', '10º', '11º', '12º'];
const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const THEME_COLOR = colors.edu.primary;

const MAPA_DIA_NOME: { [key: number]: string } = {
    1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado',
};

const MAPA_TEMPO_PERIODO: { [key: number]: string } = {
    1: '1º', 2: '2º', 3: '3º', 4: '4º', 5: '5º', 6: '6º',
    7: '7º', 8: '8º', 9: '9º', 10: '10º', 11: '11º', 12: '12º',
};

const PALETA_DISCIPLINAS = [
    { bg: '#F4433633', border: '#F44336' }, // Vermelho
    { bg: '#E91E6333', border: '#E91E63' }, // Rosa
    { bg: '#9C27B033', border: '#9C27B0' }, // Roxo
    { bg: '#673AB733', border: '#673AB7' }, // Roxo profundo
    { bg: '#3F51B533', border: '#3F51B5' }, // Índigo
    { bg: '#2196F333', border: '#2196F3' }, // Azul
    { bg: '#03A9F433', border: '#03A9F4' }, // Azul claro
    { bg: '#00BCD433', border: '#00BCD4' }, // Ciano
    { bg: '#00968833', border: '#009688' }, // Verde água
    { bg: '#4CAF5033', border: '#4CAF50' }, // Verde
    { bg: '#8BC34A33', border: '#8BC34A' }, // Verde claro
    { bg: '#CDDC3933', border: '#CDDC39' }, // Lima
    { bg: '#FFEB3B33', border: '#FFEB3B' }, // Amarelo
    { bg: '#FFC10733', border: '#FFC107' }, // Âmbar
    { bg: '#FF980033', border: '#FF9800' }, // Laranja
    { bg: '#FF572233', border: '#FF5722' }, // Laranja forte
    { bg: '#79554833', border: '#795548' }, // Marrom
    { bg: '#9E9E9E33', border: '#9E9E9E' }, // Cinza
    { bg: '#607D8B33', border: '#607D8B' }, // Azul acinzentado
    { bg: '#00000022', border: '#000000' }, // Preto suave
];


// --- Helpers ---

const getCorDisciplina = (nome: string) => {
    if (!nome) return PALETA_DISCIPLINAS[0];

    let hash = 0;
    for (let i = 0; i < nome.length; i++) {
        hash = nome.charCodeAt(i) + ((hash << 5) - hash);
        hash |= 0; // força 32-bit
    }

    const index = Math.abs(hash) % PALETA_DISCIPLINAS.length;
    return PALETA_DISCIPLINAS[index];
};


const transformarDadosAPI = (dados: ListagemHorarios[]) => {
    const estrutura: HorarioSemanal = {};
    DIAS_SEMANA.forEach(dia => {
        estrutura[dia] = {};
        PERIODOS_TODOS.forEach(p => estrutura[dia][p] = null);
    });

    dados.forEach((aula) => {
        const diaNome = MAPA_DIA_NOME[aula.dia_semana - 1];
        const periodoNome = MAPA_TEMPO_PERIODO[aula.tempo];
        if (diaNome && periodoNome && estrutura[diaNome]) {
            estrutura[diaNome][periodoNome] = aula;
        }
    });
    return estrutura;
};

// --- Sub-Components ---

function PeriodSelector({ filtro, setFiltro }: { filtro: 'manha' | 'tarde', setFiltro: (v: 'manha' | 'tarde') => void }) {
    return (
        <View className="mx-4 mt-4 bg-slate-100 rounded-xl p-1 flex-row">
            <TouchableOpacity onPress={() => setFiltro('manha')} className={`flex-1 py-2 rounded-lg items-center justify-center ${filtro === 'manha' ? 'bg-white shadow-sm' : ''}`}>
                <Text className={`text-xs font-bold ${filtro === 'manha' ? 'text-blue-600' : 'text-slate-400'}`}>Manhã (1º-6º)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFiltro('tarde')} className={`flex-1 py-2 rounded-lg items-center justify-center ${filtro === 'tarde' ? 'bg-white shadow-sm' : ''}`}>
                <Text className={`text-xs font-bold ${filtro === 'tarde' ? 'text-blue-600' : 'text-slate-400'}`}>Tarde (7º-12º)</Text>
            </TouchableOpacity>
        </View>
    );
}

function TimeTableSkeleton() {
    return (
        <View className="mx-4 mt-6 bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
            {/* Header Skeleton */}
            <View className="flex-row bg-slate-50 border-b border-slate-200 h-10">
                <View className="w-10 items-center justify-center border-r border-slate-200">
                    <Feather name="clock" size={14} color="#cbd5e1" />
                </View>
                {DIAS_SEMANA.map(dia => (
                    <View key={dia} className="flex-1 items-center justify-center border-r border-slate-200 last:border-r-0">
                        <Skeleton width={20} height={8} borderRadius={2} />
                    </View>
                ))}
            </View>

            {/* Rows Skeleton (6 períodos) */}
            {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} className="flex-row border-b border-slate-100 h-14 last:border-b-0">
                    <View className="w-10 bg-slate-50 items-center justify-center border-r border-slate-200">
                        <Skeleton width={10} height={10} borderRadius={2} />
                    </View>
                    {DIAS_SEMANA.map(dia => (
                        <View key={`${dia}-${i}`} className="flex-1 border-r border-slate-100 p-1 items-center justify-center">
                            <Skeleton width="80%" height="80%" borderRadius={4} />
                        </View>
                    ))}
                </View>
            ))}
        </View>
    );
}

function TimeTableGrid({ horarios, periodosVisiveis, onSelectAula }: any) {
    const renderCelulaAula = (dia: string, periodo: string) => {
        const aula = horarios[dia]?.[periodo];

        if (!aula) {
            return (
                <View className="h-14 border-b border-r border-slate-100 bg-white items-center justify-center">
                    <View className="w-1.5 h-1.5 rounded-full bg-slate-100" />
                </View>
            );
        }

        const cores = getCorDisciplina(aula.disciplina);

        return (
            <TouchableOpacity
                className="h-14 border-b border-r border-slate-100 items-center justify-center p-1 relative overflow-hidden"
                style={{ backgroundColor: cores.bg }}
                activeOpacity={0.7}
                onPress={() => onSelectAula({ aula, dia, periodo })}
            >
                <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: cores.border }} />
                <Text className="text-[9px] font-bold text-slate-800 text-center leading-tight" numberOfLines={3}>
                    {aula.disciplina.slice(0, 3).toUpperCase()}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View className="mx-4 mt-6 bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
            {/* Header da Tabela */}
            <View className="flex-row bg-slate-50 border-b border-slate-200">
                <View className="w-10 h-10 items-center justify-center border-r border-slate-200">
                    <Feather name="clock" size={14} color="#64748b" />
                </View>
                {DIAS_SEMANA.map(dia => (
                    <View key={dia} className="flex-1 h-10 items-center justify-center border-r border-slate-200 last:border-r-0">
                        <Text className="text-[10px] font-bold text-slate-500 uppercase">{dia.substring(0, 3)}</Text>
                    </View>
                ))}
            </View>

            {/* Linhas de Períodos */}
            {periodosVisiveis.map((periodo: string) => (
                <View key={periodo} className="flex-row border-b border-slate-100 last:border-b-0">
                    <View className="w-10 h-14 bg-slate-50 items-center justify-center border-r border-slate-200">
                        <Text className="text-xs font-bold text-slate-700">{periodo.replace('º', '')}º</Text>
                    </View>
                    {DIAS_SEMANA.map(dia => (
                        <View key={`${dia}-${periodo}`} className="flex-1">
                            {renderCelulaAula(dia, periodo)}
                        </View>
                    ))}
                </View>
            ))}
        </View>
    );
}

function ClassDetailsModal({ visible, data, onClose }: any) {
    if (!data) return null;
    const { aula, dia, periodo } = data;
    const cor = getCorDisciplina(aula.disciplina);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View className="flex-1 bg-black/60 justify-center items-center px-6">
                <View className="bg-white w-full rounded-3xl overflow-hidden shadow-2xl">
                    {/* Header Modal */}
                    <View className="p-5 flex-row justify-between items-start" style={{ backgroundColor: cor.bg }}>
                        <View className="flex-1 mr-4">
                            <Text className="text-white text-2xl font-bold w-full">{aula.disciplina}</Text>
                            <View className="flex-row items-center mt-1">
                                <View className="bg-white/50 px-2 py-0.5 rounded mr-2">
                                    <Text className="text-slate-600 text-xs font-bold uppercase">{dia}</Text>
                                </View>
                                <Text className="text-slate-500 text-sm font-medium">{periodo} Horário</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} className="bg-white/50 p-1.5 rounded-full">
                            <Ionicons name="close" size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    {/* Body Modal */}
                    <View className="p-6 space-y-5">
                        <InfoRow icon="calendar-outline" label="Ano Letivo" value={aula.ano_letivo} />
                        <InfoRow icon="people-outline" label="Turma" value={aula.turma} />
                        <View className="flex-row items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <View className="w-10 h-10 bg-white rounded-full items-center justify-center mr-3 shadow-sm border border-slate-100">
                                <Ionicons name="person" size={20} color={THEME_COLOR} />
                            </View>
                            <View>
                                <Text className="text-xs text-slate-400 uppercase">Professor(a)</Text>
                                <Text className="text-slate-800 font-bold text-base">{aula.professor || 'Não informado'}</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} className="w-full py-3.5 rounded-xl items-center mt-4" style={{ backgroundColor: THEME_COLOR }}>
                            <Text className="text-white font-bold text-base">Fechar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const InfoRow = ({ icon, label, value }: any) => (
    <View className="flex-row items-center">
        <View className="w-8 h-8 bg-blue-50 rounded-full items-center justify-center mr-3">
            <Ionicons name={icon} size={16} color={THEME_COLOR} />
        </View>
        <View>
            <Text className="text-xs text-slate-400 uppercase">{label}</Text>
            <Text className="text-slate-800 font-semibold">{value || '-'}</Text>
        </View>
    </View>
);

// --- Main Screen ---

export default function HorariosScreen() {
    const { aluno } = useAluno();

    // States
    const [horarios, setHorarios] = useState<HorarioSemanal>({});
    const [modalVisible, setModalVisible] = useState(false);
    const [aulaSelecionada, setAulaSelecionada] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filtroPeriodo, setFiltroPeriodo] = useState<'manha' | 'tarde'>('manha');
    const [refreshing, setRefreshing] = useState(false);

    // Logic
    const periodosVisiveis = useMemo(() => {
        return filtroPeriodo === 'manha' ? PERIODOS_TODOS.slice(0, 6) : PERIODOS_TODOS.slice(6, 12);
    }, [filtroPeriodo]);

    const fetchHorarios = useCallback(async () => {
        if (!aluno) return;
        setIsLoading(true);
        setError(null);
        try {
            const dados = await GetHorarios(aluno.pes_cod, aluno.ano_selecionado!);
            if (dados) setHorarios(transformarDadosAPI(dados));
        } catch (err) {
            setError('Não foi possível carregar as informações.');
        } finally {
            setIsLoading(false);
        }
    }, [aluno]);

    useEffect(() => { fetchHorarios(); }, [aluno]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchHorarios();
        setRefreshing(false);
    };

    return (
        <View className="flex-1 bg-slate-150">
            <StatusBar style="dark" backgroundColor="transparent" translucent />
            <View className="flex-1">
                <Header title="Grade Horária" showBack={true} />

                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingBottom: 40 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2A93E2']} tintColor="#2A93E2" />}
                    showsVerticalScrollIndicator={false}
                >
                    <AlunoCard alunoAtual={aluno!} />

                    <PeriodSelector filtro={filtroPeriodo} setFiltro={setFiltroPeriodo} />

                    {isLoading || refreshing ? (
                        <TimeTableSkeleton />
                    ) : error ? (
                        <View className="mx-4 mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 items-center">
                            <Feather name="alert-triangle" size={24} color="#F59E0B" />
                            <Text className="text-amber-800 font-bold mt-2">Ops! Algo deu errado</Text>
                            <TouchableOpacity onPress={fetchHorarios} className="mt-4 px-6 py-2 bg-edu-primary rounded-xl">
                                <Text className="text-white font-bold">Tentar Novamente</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <TimeTableGrid
                                horarios={horarios}
                                periodosVisiveis={periodosVisiveis}
                                onSelectAula={(data: any) => {
                                    setAulaSelecionada(data);
                                    setModalVisible(true);
                                }}
                            />
                            <Text className="text-center text-slate-400 text-[10px] mt-4">
                                Toque em uma aula para ver os detalhes completos.
                            </Text>
                        </>
                    )}
                </ScrollView>
            </View>

            <ClassDetailsModal
                visible={modalVisible}
                data={aulaSelecionada}
                onClose={() => setModalVisible(false)}
            />
        </View>
    );
}