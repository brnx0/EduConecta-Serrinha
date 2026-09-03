import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';

// Components & Services
import { Header } from '../../components/Header';
import { AlunoCard } from '../../components/AlunoCard';
import { Skeleton } from '../../components/Skeleton';
import { useAluno } from '../../context/AlunoContext';
import { AtividadeCalendario, CalendarioEscolar, DiaLetivoUnidade, getCalendarioEscolar, getDiasLetivos } from '../../services/calendarioEscolar/CalendarioEscolarService';
import { colors } from '../../constants/colors';

// --- Constants & Helpers ---
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const SCREEN_WIDTH = Dimensions.get('window').width;

// --- Sub-Components ---

function MonthSelector({ currentMonth, currentYear, onPrev, onNext, onTitlePress, disabled }: any) {
    return (
        <View className="flex-row items-center justify-between mb-6 px-2">
            <TouchableOpacity onPress={onPrev} className="p-2" disabled={disabled}>
                <Ionicons name="chevron-back" size={24} color="#111827" />
            </TouchableOpacity>

            <View className="flex-1 flex-row items-center justify-center gap-3">
                <TouchableOpacity onPress={onTitlePress} className="px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                    <Text className="text-base font-bold text-blue-900 text-center">{MONTHS[currentMonth]} {currentYear}</Text>
                </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={onNext} className="p-2" disabled={disabled}>
                <Ionicons name="chevron-forward" size={24} color="#111827" />
            </TouchableOpacity>
        </View>
    );
}

function CalendarGrid({ grid, colorMap, isLoading, onDayPress }: any) {
    if (isLoading) return <CalendarSkeleton />;

    return (
        <View className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm p-3 mb-6">
            <View className="flex-row mb-2">
                {WEEKDAYS.map((w, idx) => (
                    <View key={`weekday-${idx}`} style={{ width: (SCREEN_WIDTH - 56) / 7 }} className="items-center py-2">
                        <Text className="text-xs font-bold text-blue-600">{w}</Text>
                    </View>
                ))}
            </View>

            {Array.from({ length: Math.ceil(grid.length / 7) }).map((_, rowIndex) => (
                <View key={`r-${rowIndex}`} className="flex-row">
                    {grid.slice(rowIndex * 7, rowIndex * 7 + 7).map((cell: any) => {
                        const cellData = cell.dateString ? colorMap[cell.dateString] : null;
                        const hasActivity = cellData?.hasAtividade;
                        const bgColor = cellData?.cor || '#FFFFFF';
                        const textColor = cellData ? 'text-black' : 'text-gray-800';

                        return (
                            <View key={cell.key} style={{ borderWidth: 0.5, borderColor: '#e5e7eb' }} className="flex-1 items-center justify-center py-1">
                                {cell.day ? (
                                    <Pressable
                                        disabled={!cell.dateString || !hasActivity}
                                        onPress={() => {
                                            // AQUI: Pegamos o dia direto do objeto ou da célula
                                            const dia = cellData?.dia || cell.day;
                                            if (dia) onDayPress(dia);
                                        }}
                                    >
                                        <View style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: bgColor, borderWidth: 1, borderColor: '#d1d5db' }} className="items-center justify-center">
                                            <Text className={`text-sm font-semibold ${textColor}`}>{cell.day}</Text>
                                            {hasActivity && (
                                                <View style={{ position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FFFFFF' }} />
                                            )}
                                        </View>
                                    </Pressable>
                                ) : null}
                            </View>
                        );
                    })}
                </View>
            ))}
        </View>
    );
}

function CalendarSkeleton() {
    return (
        <View className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm p-3 mb-6 h-[320px] justify-center items-center">
            <ActivityIndicator size="large" color={colors.edu.dark} />
            <Text className="mt-4 text-base text-gray-700">Carregando calendário...</Text>
        </View>
    );
}

function EventsList({ diasLetivos, isLoading }: { diasLetivos: DiaLetivoUnidade[], isLoading: boolean }) {
    if (isLoading && (!diasLetivos || diasLetivos.length === 0)) return <EventsSkeleton />;

    return (
        <View className="bg-white rounded-lg p-4 mb-6 border border-gray-200 shadow-sm">
            {diasLetivos.length > 0 ? (
                <>
                    <Text className="text-sm font-semibold text-gray-800 mb-3">Unidades</Text>
                    <View className="space-y-3">
                        {diasLetivos.map((unidade, idx) => (
                            <View key={idx} className="rounded-lg border border-gray-100 bg-gray-50 p-3 flex-row items-center justify-between">
                                <Text className="text-sm font-semibold text-gray-800 mb-1">{unidade.unidade}</Text>
                                <Text className="text-xs text-gray-600">{unidade.data_inicio} • {unidade.data_fim}</Text>
                            </View>
                        ))}
                    </View>
                </>
            ) : (
                <Text className="text-sm text-gray-600">Nenhum dado encontrado</Text>
            )}
        </View>
    );
}

function EventsSkeleton() {
    return (
        <View className="bg-white rounded-lg p-4 mb-6 border border-gray-200 shadow-sm space-y-3">
            <Skeleton width="30%" height={16} borderRadius={4} />
            <Skeleton width="100%" height={40} borderRadius={8} />
            <Skeleton width="100%" height={40} borderRadius={8} />
        </View>
    );
}

function Legend() {
    return (
        <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <Text className="font-bold text-base mb-4 text-gray-800">Legenda</Text>
            <View className="flex-row flex-wrap gap-3">
                {[
                    ['Dias letivos', '#008000'],
                    ['Feriado', '#FF0000'],
                    ['Dias não letivos', '#C0C0C0'],
                    ['Início de bimestre', '#90EE90'],
                    ['Encerramento de bimestre', '#FFA500']
                ].map(([label, color]) => (
                    <View key={String(label)} className="flex-row items-center">
                        <View style={{ backgroundColor: color }} className="w-5 h-5 rounded border border-gray-300 mr-2" />
                        <Text className="text-sm text-gray-700">{label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

function MonthPickerModal({ visible, onClose, onSelect, currentYear, selectedIndex }: any) {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <Pressable className="flex-1 bg-black/40 items-center justify-center" onPress={onClose}>
                <View className="w-4/5 bg-white rounded-2xl p-4 shadow-lg max-h-96">
                    <View className="mb-3 pb-3 border-b border-gray-200">
                        <Text className="text-lg font-bold text-gray-800">Selecione o mês</Text>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {MONTHS.map((month, index) => (
                            <TouchableOpacity
                                key={`m-${index}`}
                                onPress={() => { onSelect(index); onClose(); }}
                                className={`py-3 px-4 rounded-lg mb-2 ${index === selectedIndex ? 'bg-blue-100' : ''}`}
                            >
                                <Text className={`text-base ${index === selectedIndex ? 'font-bold text-blue-900' : 'text-gray-800'}`}>
                                    {month} {currentYear}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Pressable>
        </Modal>
    );
}

function ActivityModal({ visible, onClose, dia, atividades }: { visible: boolean, onClose: () => void, dia: number | null, atividades: AtividadeCalendario[] }) {

    // Verificação de segurança visual
    const temAtividades = atividades && atividades.length > 0;

    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose} statusBarTranslucent={true}>
            <View className="flex-1 bg-black/60 justify-center items-center p-4">

                {/* Container Principal */}
                <View className="bg-white w-full max-h-[85%] rounded-3xl overflow-hidden shadow-2xl flex-col">

                    {/* Header Azul */}
                    <View className="bg-blue-600 px-5 py-4 flex-row justify-between items-center shrink-0">
                        <View className="flex-row items-center flex-1">
                            <Feather name="calendar" size={20} color="white" />
                            <Text className="text-white text-lg font-bold ml-3 capitalize">
                                Dia {dia} {temAtividades ? `(${atividades.length})` : ''}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} className="bg-white/20 w-8 h-8 rounded-full items-center justify-center">
                            <Ionicons name="close" size={20} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Conteúdo da Lista */}
                    {/* REMOVIDO: flex-1 da View wrapper, para evitar colapso em containers sem altura fixa */}
                    <View className="w-full bg-slate-50 shrink">
                        {!temAtividades ? (
                            <View className="items-center justify-center py-10 opacity-60">
                                <Feather name="inbox" size={48} color="#94a3b8" />
                                <Text className="text-slate-500 text-base mt-3 font-medium">Nenhuma tarefa registrada.</Text>
                            </View>
                        ) : (
                            <ScrollView
                                contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
                                showsVerticalScrollIndicator={false}
                            >
                                {atividades.map((item, index) => (
                                    <View key={index} className="bg-white border border-slate-200 rounded-xl p-4 mb-3 shadow-sm flex-row overflow-hidden">
                                        <View className={`w-1.5 rounded-full mr-3 ${(Number(item.valor) || 0) > 0 ? 'bg-blue-500' : 'bg-slate-400'}`} />
                                        <View className="flex-1">
                                            <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wide mb-1">
                                                {item.disciplina}
                                            </Text>

                                            <Text className="text-slate-800 font-bold text-base mb-3 leading-tight">
                                                {item.atividade}
                                            </Text>

                                            <View className="flex-row items-center gap-2">
                                                {(Number(item.valor) || 0) > 0 && (
                                                    <View className="bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                                        <Text className="text-slate-600 text-[10px] font-bold">
                                                            Val: {item.valor}
                                                        </Text>
                                                    </View>
                                                )}
                                                {item.nota !== null && item.nota !== undefined && (
                                                    <View className={`px-2 py-1 rounded border ${Number(item.nota) >= (Number(item.valor || 0) * 0.6) ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                                        <Text className={`text-[10px] font-bold ${Number(item.nota) >= (Number(item.valor || 0) * 0.6) ? 'text-green-700' : 'text-red-700'}`}>
                                                            Nota: {item.nota}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                    </View>

                    {/* Footer */}
                    <View className="p-4 bg-white border-t border-slate-100 shrink-0">
                        <TouchableOpacity onPress={onClose} className="w-full bg-slate-100 py-3 rounded-xl items-center active:bg-slate-200">
                            <Text className="text-slate-700 font-bold">Fechar Detalhes</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// --- Main Screen ---

export default function CalendarioEscolarScreen() {
    const { aluno } = useAluno();

    // States
    const [monthIndex, setMonthIndex] = useState(new Date().getMonth());
    const [monthPickerVisible, setMonthPickerVisible] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingUnidades, setIsLoadingUnidades] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Data States
    const [dados, setDados] = useState<CalendarioEscolar[]>([]);
    const [dadosAtividades, setDadosAtividades] = useState<AtividadeCalendario[]>([]);
    const [diasLetivos, setDiasLetivos] = useState<DiaLetivoUnidade[]>([]);

    const currentYear = aluno?.ano_selecionado || new Date().getFullYear();

    // Data Fetching
    const fetchDiasLetivos = useCallback(async () => {
        if (!aluno) return;
        setIsLoadingUnidades(true);
        try {
            const result = await getDiasLetivos(aluno.pes_cod, currentYear);
            setDiasLetivos(result);
        } catch (erro) {
            setError(prev => prev || 'Não foi possível carregar os dados escolares.');
        } finally {
            setIsLoadingUnidades(false);
        }
    }, [aluno, currentYear]);

    const fetchCalendario = useCallback(async () => {
        if (!aluno) return;
        setIsLoading(true);
        setError(null);
        try {
            const result = await getCalendarioEscolar(aluno.pes_cod, currentYear, monthIndex + 1);
            setDados(result.calendario || []);
            setDadosAtividades(result.atividades || []);
        } catch (err) {
            setError('Erro ao buscar os dados do calendário.');
        } finally {
            setIsLoading(false);
        }
    }, [monthIndex, currentYear, aluno]);

    useEffect(() => { fetchDiasLetivos(); }, [fetchDiasLetivos]);
    useEffect(() => { fetchCalendario(); }, [fetchCalendario]);

    // Calendar Logic
    const startWeekday = new Date(currentYear, monthIndex, 1).getDay();
    const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();

    const grid = useMemo(() => {
        const cells: Array<any> = [];
        const pad = (n: number) => String(n).padStart(2, '0');
        for (let i = 0; i < startWeekday; i++) cells.push({ key: `e-${i}` });
        for (let d = 1; d <= daysInMonth; d++) {
            const iso = `${currentYear}-${pad(monthIndex + 1)}-${pad(d)}`;
            cells.push({ key: iso, day: d, dateString: iso });
        }
        while (cells.length % 7 !== 0) cells.push({ key: `t-${cells.length}` });
        return cells;
    }, [monthIndex, daysInMonth, startWeekday, currentYear]);

    const calendarColorMap = useMemo(() => {
        const map: Record<string, any> = {};
        dados.forEach((item: any) => {
            const rawDate = (item.DATA || item.data || '').toString().split('T')[0].trim();
            if (!rawDate) return;
            const dia = item.dia;
            const hasAtividade = dadosAtividades.some(a => {
                // Aqui verificamos se o dia da atividade (INT) bate com o dia do calendário
                return a.dia === item.dia && a.atividade;
            });
            map[rawDate] = {
                cor: item.COR || item.cor || '#FFFFFF',
                dia,
                hasAtividade
            };
        });
        return map;
    }, [dados, dadosAtividades]);

    // --- CORREÇÃO AQUI ---
    const atividadesDoDia = useMemo(() => {
        if (!diaSelecionado || !dadosAtividades) return [];

        // 1. Filtra tudo que é do dia selecionado (sem verificar se tem atividade ainda)
        const registrosDoDia = dadosAtividades.filter(a => Number(a.dia) === Number(diaSelecionado));

        // 2. Retorna apenas os que têm conteúdo na atividade
        return registrosDoDia.filter(a => a.atividade !== null && a.atividade !== "");
    }, [diaSelecionado, dadosAtividades]);

    const handleRetry = () => {
        fetchCalendario();
        fetchDiasLetivos();
    };

    return (
        <View className="flex-1 bg-slate-150">
            <View className="flex-1">
                <Header title="Calendário Escolar" showBack={true} />

                <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                    <AlunoCard alunoAtual={aluno!} />

                    {error && !isLoading ? (
                        <View className="mx-4 mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 items-center">
                            <Feather name="alert-triangle" size={24} color="#F59E0B" />
                            <Text className="text-amber-800 font-bold mt-2">Ops! Algo deu errado</Text>
                            <TouchableOpacity onPress={handleRetry} className="mt-4 px-6 py-2 bg-edu-dark rounded-xl">
                                <Text className="text-white font-bold">Tentar Novamente</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View className="px-4 pt-4">
                            <MonthSelector
                                currentMonth={monthIndex}
                                currentYear={currentYear}
                                onPrev={() => setMonthIndex(i => (i === 0 ? 11 : i - 1))}
                                onNext={() => setMonthIndex(i => (i === 11 ? 0 : i + 1))}
                                onTitlePress={() => setMonthPickerVisible(true)}
                                disabled={isLoading}
                            />

                            <CalendarGrid
                                grid={grid}
                                colorMap={calendarColorMap}
                                isLoading={isLoading}
                                onDayPress={(dia: number) => {
                                    setDiaSelecionado(dia);
                                    setModalVisible(true);
                                }}
                            />

                            <EventsList diasLetivos={diasLetivos} isLoading={isLoadingUnidades} />

                            <Legend />
                        </View>
                    )}
                </ScrollView>
            </View>

            <MonthPickerModal
                visible={monthPickerVisible}
                onClose={() => setMonthPickerVisible(false)}
                onSelect={setMonthIndex}
                currentYear={currentYear}
                selectedIndex={monthIndex}
            />

            <ActivityModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                dia={diaSelecionado}
                atividades={atividadesDoDia}
            />
        </View>
    );
}