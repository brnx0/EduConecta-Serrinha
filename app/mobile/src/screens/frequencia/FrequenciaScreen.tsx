import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { Header } from '../../components/Header';
import { AlunoCard } from '../../components/AlunoCard';
import { Skeleton } from '../../components/Skeleton';
import { colors } from '../../constants/colors';
import { useAluno } from '../../context/AlunoContext';
import { getResumoFrequencia, ResumoFrequencia, StatusGeral } from '../../services/frequencia/FrequenciaService';
import type { AppTabParamList } from '../../navigation/AppTabs';

const STATUS_INFO: Record<StatusGeral, { label: string; cor: string; bg: string; icon: any }> = {
    em_dia: { label: 'Frequência em dia', cor: '#16a34a', bg: '#dcfce7', icon: 'check-circle' },
    atencao: { label: 'Atenção à frequência', cor: '#d97706', bg: '#fef3c7', icon: 'alert-triangle' },
    risco: { label: 'Risco de reprovação por falta', cor: '#dc2626', bg: '#fee2e2', icon: 'alert-octagon' },
};

function HeroCard({ geral }: { geral: ResumoFrequencia['geral'] }) {
    const s = STATUS_INFO[geral.status];
    return (
        <View className="mx-4 mt-4 bg-white rounded-2xl border border-slate-200 p-5 items-center" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
            <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Frequência geral</Text>
            <Text style={{ color: s.cor }} className="text-5xl font-extrabold">{geral.percentual.toFixed(1)}%</Text>
            <View className="w-full h-2.5 bg-slate-100 rounded-full mt-4 overflow-hidden">
                <View style={{ width: `${Math.min(100, geral.percentual)}%`, backgroundColor: s.cor }} className="h-full rounded-full" />
            </View>
            <Text className="text-slate-400 text-[11px] mt-1.5">mínimo exigido: {geral.minimo}%</Text>
            <View style={{ backgroundColor: s.bg }} className="flex-row items-center px-3 py-1.5 rounded-full mt-3">
                <Feather name={s.icon} size={14} color={s.cor} />
                <Text style={{ color: s.cor }} className="text-xs font-bold ml-1.5">{s.label}</Text>
            </View>
        </View>
    );
}

function Totais({ geral }: { geral: ResumoFrequencia['geral'] }) {
    const itens = [
        { label: 'Presenças', valor: geral.presencas, cor: '#16a34a' },
        { label: 'Faltas', valor: geral.faltas, cor: '#dc2626' },
        { label: 'Justificadas', valor: geral.justificadas, cor: '#d97706' },
    ];
    return (
        <View className="mx-4 mt-3 flex-row" style={{ gap: 10 }}>
            {itens.map((i) => (
                <View key={i.label} className="flex-1 bg-white rounded-2xl border border-slate-200 p-3 items-center">
                    <Text style={{ color: i.cor }} className="text-2xl font-extrabold">{i.valor}</Text>
                    <Text className="text-slate-500 text-[11px] font-semibold mt-0.5">{i.label}</Text>
                </View>
            ))}
        </View>
    );
}

function BarraDisciplina({ nome, percentual, faltas, abaixo }: { nome: string; percentual: number; faltas: number; abaixo: boolean }) {
    const cor = abaixo ? '#dc2626' : '#16a34a';
    return (
        <View className="mb-3">
            <View className="flex-row items-center justify-between mb-1">
                <View className="flex-row items-center flex-1 mr-2">
                    {abaixo && <Feather name="alert-triangle" size={12} color="#dc2626" />}
                    <Text className="text-slate-700 text-sm font-semibold ml-1" numberOfLines={1}>{nome}</Text>
                </View>
                <Text style={{ color: cor }} className="text-sm font-bold">{percentual.toFixed(0)}%</Text>
            </View>
            <View className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <View style={{ width: `${Math.min(100, percentual)}%`, backgroundColor: cor }} className="h-full rounded-full" />
            </View>
            {faltas > 0 && <Text className="text-slate-400 text-[10px] mt-0.5">{faltas} falta{faltas > 1 ? 's' : ''}</Text>}
        </View>
    );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
    return (
        <View className="mx-4 mt-4 bg-white rounded-2xl border border-slate-200 p-4">
            <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-3">{titulo}</Text>
            {children}
        </View>
    );
}

function DashboardSkeleton() {
    return (
        <View className="px-4 mt-4" style={{ gap: 12 }}>
            <Skeleton width="100%" height={180} borderRadius={16} />
            <Skeleton width="100%" height={70} borderRadius={16} />
            <Skeleton width="100%" height={160} borderRadius={16} />
        </View>
    );
}

export default function FrequenciaScreen() {
    const { aluno } = useAluno();
    const navigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
    const [resumo, setResumo] = useState<ResumoFrequencia | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const ano = aluno?.ano_selecionado ?? new Date().getFullYear();

    const carregar = useCallback(async () => {
        if (!aluno) return;
        setError(null);
        try {
            setResumo(await getResumoFrequencia(aluno.pes_cod, ano));
        } catch {
            setError('Não foi possível carregar a frequência.');
        } finally {
            setLoading(false);
        }
    }, [aluno, ano]);

    useEffect(() => { carregar(); }, [carregar]);

    const onRefresh = async () => { setRefreshing(true); await carregar(); setRefreshing(false); };

    const semDados = resumo && resumo.geral.total === 0;

    return (
        <View className="flex-1 bg-slate-150">
            <StatusBar style="dark" backgroundColor="transparent" translucent />
            <View className="flex-1">
                <Header title="Frequência" showBack={true} />
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingBottom: 40 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.edu.dark]} tintColor={colors.edu.dark} />}
                    showsVerticalScrollIndicator={false}
                >
                    <AlunoCard alunoAtual={aluno!} />

                    {loading && !refreshing ? (
                        <DashboardSkeleton />
                    ) : error ? (
                        <View className="mx-4 mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 items-center">
                            <Feather name="alert-triangle" size={24} color="#F59E0B" />
                            <Text className="text-amber-800 font-bold mt-2">Ops! Algo deu errado</Text>
                            <TouchableOpacity onPress={carregar} className="mt-4 px-6 py-2 rounded-xl" style={{ backgroundColor: colors.edu.dark }}>
                                <Text className="text-white font-bold">Tentar Novamente</Text>
                            </TouchableOpacity>
                        </View>
                    ) : !resumo || semDados ? (
                        <View className="mx-4 mt-6 bg-white border border-slate-200 rounded-2xl p-8 items-center">
                            <View className="w-14 h-14 bg-slate-100 rounded-2xl items-center justify-center mb-3">
                                <Feather name="check-square" size={26} color="#94a3b8" />
                            </View>
                            <Text className="text-slate-700 font-bold text-base">Sem registros de frequência</Text>
                            <Text className="text-slate-400 text-sm text-center mt-1">Ainda não há aulas com presença lançada neste ano.</Text>
                        </View>
                    ) : (
                        <>
                            <HeroCard geral={resumo.geral} />
                            <Totais geral={resumo.geral} />

                            {resumo.porDisciplina.length > 0 && (
                                <Secao titulo="Por disciplina">
                                    {resumo.porDisciplina.map((d) => (
                                        <BarraDisciplina key={d.disciplina} nome={d.disciplina} percentual={d.percentual} faltas={d.faltas} abaixo={d.abaixoMinimo} />
                                    ))}
                                </Secao>
                            )}

                            {resumo.porPeriodo.length > 0 && (
                                <Secao titulo="Por período">
                                    {resumo.porPeriodo.map((p) => (
                                        <BarraDisciplina key={p.ordem} nome={p.nome} percentual={p.percentual} faltas={p.faltas} abaixo={p.percentual < resumo.geral.minimo} />
                                    ))}
                                </Secao>
                            )}

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => navigation.navigate('FrequenciaDiariaScreen')}
                                className="mx-4 mt-4 bg-white rounded-2xl border border-slate-200 p-4 flex-row items-center justify-between"
                            >
                                <View className="flex-row items-center">
                                    <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: '#eff6ff' }}>
                                        <Feather name="list" size={18} color={colors.edu.dark} />
                                    </View>
                                    <Text className="text-slate-700 font-bold text-sm ml-3">Presença dia a dia</Text>
                                </View>
                                <Feather name="chevron-right" size={20} color="#94a3b8" />
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            </View>
        </View>
    );
}
