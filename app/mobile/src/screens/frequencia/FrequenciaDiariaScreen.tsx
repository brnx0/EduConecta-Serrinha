import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { Header } from '../../components/Header';
import { Skeleton } from '../../components/Skeleton';
import { colors } from '../../constants/colors';
import { useAluno } from '../../context/AlunoContext';
import { getDiasFrequencia, DiaPresenca, RegistroStatus } from '../../services/frequencia/FrequenciaService';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DIA_ABBR = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']; // index = dia_semana-1
const ICON_STATUS: Record<RegistroStatus, { icon: any; cor: string; label: string }> = {
    presente: { icon: 'check', cor: '#16a34a', label: 'Presente' },
    falta: { icon: 'x', cor: '#dc2626', label: 'Falta' },
    justificada: { icon: 'shield', cor: '#d97706', label: 'Justificada' },
};

function fmtDiaData(iso: string, diaSemana: number): string {
    const [, m, d] = iso.split('-');
    return `${DIA_ABBR[diaSemana - 1] ?? ''} · ${d}/${m}`;
}

function CardDia({ dia }: { dia: DiaPresenca }) {
    return (
        <View className="bg-white rounded-2xl border border-slate-200 mb-3 overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                <Text className="text-slate-700 font-bold text-sm">{fmtDiaData(dia.data, dia.dia_semana)}</Text>
                <Text className="text-slate-500 text-xs font-semibold">{dia.resumo.presencas}/{dia.resumo.total} presenças</Text>
            </View>
            <View className="px-4 py-2">
                {dia.aulas.map((a, i) => {
                    const s = ICON_STATUS[a.status];
                    return (
                        <View key={`${a.tempo}-${i}`} className="flex-row items-center py-2">
                            <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: `${s.cor}1a` }}>
                                <Feather name={s.icon} size={13} color={s.cor} />
                            </View>
                            <Text className="text-slate-400 text-[11px] font-bold w-7 ml-2">{a.tempo}º</Text>
                            <Text className="text-slate-700 text-sm flex-1" numberOfLines={1}>{a.disciplina}</Text>
                            <Text style={{ color: s.cor }} className="text-[11px] font-bold">{s.label}</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

export default function FrequenciaDiariaScreen() {
    const { aluno } = useAluno();
    const [mes, setMes] = useState(new Date().getMonth()); // 0-11
    const [dias, setDias] = useState<DiaPresenca[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const ano = aluno?.ano_selecionado ?? new Date().getFullYear();

    const carregar = useCallback(async () => {
        if (!aluno) return;
        setLoading(true);
        try {
            setDias(await getDiasFrequencia(aluno.pes_cod, ano, mes + 1));
        } catch {
            setDias([]);
        } finally {
            setLoading(false);
        }
    }, [aluno, ano, mes]);

    useEffect(() => { carregar(); }, [carregar]);

    const onRefresh = async () => { setRefreshing(true); await carregar(); setRefreshing(false); };

    return (
        <View className="flex-1 bg-slate-150">
            <StatusBar style="dark" backgroundColor="transparent" translucent />
            <View className="flex-1">
                <Header title="Presença Diária" showBack={true} />

                {/* Seletor de mês — chips horizontais, não grid */}
                <View className="bg-white border-b border-slate-100">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
                        {MESES.map((m, i) => {
                            const ativo = i === mes;
                            return (
                                <TouchableOpacity
                                    key={m}
                                    onPress={() => setMes(i)}
                                    className="px-4 py-2 rounded-full"
                                    style={{ backgroundColor: ativo ? colors.edu.primary : '#f1f5f9' }}
                                >
                                    <Text className="text-xs font-bold" style={{ color: ativo ? '#fff' : '#64748b' }}>{m}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.edu.primary]} tintColor={colors.edu.primary} />}
                    showsVerticalScrollIndicator={false}
                >
                    {loading && !refreshing ? (
                        <View style={{ gap: 12 }}>
                            <Skeleton width="100%" height={120} borderRadius={16} />
                            <Skeleton width="100%" height={120} borderRadius={16} />
                        </View>
                    ) : dias.length === 0 ? (
                        <View className="bg-white border border-slate-200 rounded-2xl p-8 items-center mt-4">
                            <View className="w-14 h-14 bg-slate-100 rounded-2xl items-center justify-center mb-3">
                                <Feather name="calendar" size={26} color="#94a3b8" />
                            </View>
                            <Text className="text-slate-700 font-bold text-base">Sem aulas em {MESES[mes]}</Text>
                            <Text className="text-slate-400 text-sm text-center mt-1">Nenhuma presença registrada neste mês.</Text>
                        </View>
                    ) : (
                        dias.map((d) => <CardDia key={d.data} dia={d} />)
                    )}
                </ScrollView>
            </View>
        </View>
    );
}
