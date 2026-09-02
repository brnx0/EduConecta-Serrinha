import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, FlatList, Pressable, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { Skeleton } from '../../components/Skeleton';
import { useAluno } from '../../context/AlunoContext';
import { AtividadeCalendario, CalendarioEscolar, DiaLetivoUnidade, getCalendarioEscolar, getDiasLetivos } from '../../services/calendarioEscolar/CalendarioEscolarService';
import { colors } from '../../constants/colors';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/**
 * CalendarioEscolarScreen Élo — calendário visual + bottom sheet
 * de atividades do dia. Cards de bimestres listados como chips.
 */
export default function CalendarioEscolarScreen() {
    const { aluno } = useAluno();
    const currentYear = aluno?.ano_selecionado || new Date().getFullYear();
    const [monthIndex, setMonthIndex] = useState(new Date().getMonth());
    const [monthPickerVisible, setMonthPickerVisible] = useState(false);
    const [activityModalVisible, setActivityModalVisible] = useState(false);
    const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingUnidades, setIsLoadingUnidades] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dados, setDados] = useState<CalendarioEscolar[]>([]);
    const [dadosAtividades, setDadosAtividades] = useState<AtividadeCalendario[]>([]);
    const [diasLetivos, setDiasLetivos] = useState<DiaLetivoUnidade[]>([]);

    const fetchDiasLetivos = useCallback(async () => {
        if (!aluno) return;
        setIsLoadingUnidades(true);
        try {
            const result = await getDiasLetivos(aluno.pes_cod, currentYear);
            setDiasLetivos(result);
        } catch {
            setError((p) => p || 'Não foi possível carregar.');
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
        } catch {
            setError('Erro ao buscar dados do calendário.');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [monthIndex, currentYear, aluno]);

    useEffect(() => { fetchDiasLetivos(); }, [fetchDiasLetivos]);
    useEffect(() => { fetchCalendario(); }, [fetchCalendario]);

    const startWeekday = new Date(currentYear, monthIndex, 1).getDay();
    const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();

    const grid = useMemo(() => {
        const cells: Array<{ key: string; day?: number; iso?: string }> = [];
        const pad = (n: number) => String(n).padStart(2, '0');
        for (let i = 0; i < startWeekday; i++) cells.push({ key: `e-${i}` });
        for (let d = 1; d <= daysInMonth; d++) {
            const iso = `${currentYear}-${pad(monthIndex + 1)}-${pad(d)}`;
            cells.push({ key: iso, day: d, iso });
        }
        while (cells.length % 7 !== 0) cells.push({ key: `t-${cells.length}` });
        return cells;
    }, [monthIndex, daysInMonth, startWeekday, currentYear]);

    const colorMap = useMemo(() => {
        const map: Record<string, { cor: string; dia: number; hasAtividade: boolean }> = {};
        dados.forEach((item: any) => {
            const rawDate = (item.DATA || item.data || '').toString().split('T')[0].trim();
            if (!rawDate) return;
            const dia = item.dia;
            const hasAtividade = dadosAtividades.some((a) => a.dia === item.dia && a.atividade);
            map[rawDate] = {
                cor: item.COR || item.cor || '#FFFFFF',
                dia,
                hasAtividade,
            };
        });
        return map;
    }, [dados, dadosAtividades]);

    const atividadesDoDia = useMemo(() => {
        if (!diaSelecionado) return [];
        return dadosAtividades
            .filter((a) => Number(a.dia) === Number(diaSelecionado))
            .filter((a) => a.atividade !== null && a.atividade !== '');
    }, [diaSelecionado, dadosAtividades]);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchCalendario(), fetchDiasLetivos()]);
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.paper }}>
            <Header title="Calendário" />

            <ScrollView
                contentContainerStyle={{ paddingBottom: 140, paddingHorizontal: 18, paddingTop: 18 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.brand.primary]}
                        tintColor={colors.brand.primary}
                    />
                }
            >
                {/* Hero do mês */}
                <View
                    style={{
                        backgroundColor: colors.brand.secondary,
                        borderRadius: 28,
                        padding: 22,
                    }}
                >
                    <Text
                        style={{
                            color: 'rgba(255,255,255,0.9)',
                            fontFamily: 'Outfit_500Medium',
                            fontSize: 11,
                            letterSpacing: 1.5,
                            textTransform: 'uppercase',
                        }}
                    >
                        Você está vendo
                    </Text>
                    <Text
                        style={{
                            color: '#FFFFFF',
                            fontFamily: 'Outfit_700Bold',
                            fontSize: 30,
                            letterSpacing: -1.2,
                            marginTop: 4,
                        }}
                    >
                        {MONTHS[monthIndex]}, {currentYear}
                    </Text>
                </View>

                {/* Mês picker */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 18,
                        marginBottom: 12,
                    }}
                >
                    <NavBtn icon="chevron-left" onPress={() => setMonthIndex((i) => (i === 0 ? 11 : i - 1))} disabled={isLoading} />
                    <TouchableOpacity
                        onPress={() => setMonthPickerVisible(true)}
                        style={{
                            paddingHorizontal: 18,
                            paddingVertical: 10,
                            backgroundColor: '#FFFFFF',
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: colors.hairline,
                        }}
                    >
                        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 14, color: colors.ink }}>
                            Outro mês
                        </Text>
                    </TouchableOpacity>
                    <NavBtn icon="chevron-right" onPress={() => setMonthIndex((i) => (i === 11 ? 0 : i + 1))} disabled={isLoading} />
                </View>

                {/* Calendário */}
                <View
                    style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 24,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: colors.hairline,
                    }}
                >
                    <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                        {WEEKDAYS.map((w, idx) => (
                            <View key={`wd-${idx}`} style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
                                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 11, color: colors.brand.secondary, letterSpacing: 0.6 }}>
                                    {w}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {isLoading ? (
                        <Skeleton width="100%" height={240} borderRadius={16} />
                    ) : error ? (
                        <ErrorState onRetry={() => { fetchCalendario(); fetchDiasLetivos(); }} />
                    ) : (
                        Array.from({ length: grid.length / 7 }).map((_, rowIdx) => (
                            <View key={`r-${rowIdx}`} style={{ flexDirection: 'row' }}>
                                {grid.slice(rowIdx * 7, rowIdx * 7 + 7).map((cell) => {
                                    const info = cell.iso ? colorMap[cell.iso] : undefined;
                                    return (
                                        <View key={cell.key} style={{ flex: 1, aspectRatio: 1, padding: 3 }}>
                                            {cell.day ? (
                                                <Pressable
                                                    disabled={!info?.hasAtividade}
                                                    onPress={() => {
                                                        const dia = info?.dia ?? cell.day!;
                                                        setDiaSelecionado(dia);
                                                        setActivityModalVisible(true);
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        borderRadius: 12,
                                                        backgroundColor: info?.cor ?? colors.paperWarm,
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        position: 'relative',
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontFamily: 'Outfit_700Bold',
                                                            fontSize: 14,
                                                            color: info ? lumiText(info.cor) : colors.ink,
                                                            letterSpacing: -0.3,
                                                        }}
                                                    >
                                                        {cell.day}
                                                    </Text>
                                                    {info?.hasAtividade && (
                                                        <View
                                                            style={{
                                                                position: 'absolute',
                                                                top: 4,
                                                                right: 4,
                                                                width: 6,
                                                                height: 6,
                                                                borderRadius: 3,
                                                                backgroundColor: colors.brand.accent,
                                                            }}
                                                        />
                                                    )}
                                                </Pressable>
                                            ) : null}
                                        </View>
                                    );
                                })}
                            </View>
                        ))
                    )}
                </View>

                {/* Unidades */}
                <View
                    style={{
                        marginTop: 16,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 22,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: colors.hairline,
                    }}
                >
                    <Text
                        style={{
                            fontFamily: 'Outfit_500Medium',
                            fontSize: 11,
                            color: colors.inkSoft,
                            letterSpacing: 1,
                            textTransform: 'uppercase',
                            marginBottom: 10,
                        }}
                    >
                        Unidades letivas
                    </Text>
                    {isLoadingUnidades ? (
                        <View style={{ gap: 8 }}>
                            <Skeleton width="100%" height={36} borderRadius={12} />
                            <Skeleton width="100%" height={36} borderRadius={12} />
                        </View>
                    ) : diasLetivos.length === 0 ? (
                        <Text style={{ color: colors.inkSoft, fontFamily: 'Outfit_400Regular', fontSize: 13 }}>
                            Nenhuma unidade encontrada.
                        </Text>
                    ) : (
                        <View style={{ gap: 8 }}>
                            {diasLetivos.map((u, idx) => (
                                <View
                                    key={idx}
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        backgroundColor: colors.paperWarm,
                                        padding: 12,
                                        borderRadius: 14,
                                    }}
                                >
                                    <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 13, color: colors.ink }}>
                                        {u.unidade}
                                    </Text>
                                    <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 11, color: colors.inkSoft }}>
                                        {u.data_inicio} → {u.data_fim}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Legenda */}
                <View
                    style={{
                        marginTop: 16,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 22,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: colors.hairline,
                    }}
                >
                    <Text
                        style={{
                            fontFamily: 'Outfit_500Medium',
                            fontSize: 11,
                            color: colors.inkSoft,
                            letterSpacing: 1,
                            textTransform: 'uppercase',
                            marginBottom: 10,
                        }}
                    >
                        Legenda
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        <LegendItem color="#22C55E" label="Letivo" />
                        <LegendItem color="#EF4444" label="Feriado" />
                        <LegendItem color="#94A3B8" label="Não letivo" />
                        <LegendItem color="#86EFAC" label="Início bim." />
                        <LegendItem color="#F97316" label="Encerramento" />
                    </View>
                </View>
            </ScrollView>

            {/* Mês picker modal */}
            <Modal visible={monthPickerVisible} transparent animationType="slide" onRequestClose={() => setMonthPickerVisible(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setMonthPickerVisible(false)} activeOpacity={1} />
                    <View
                        style={{
                            backgroundColor: colors.paper,
                            borderTopLeftRadius: 32,
                            borderTopRightRadius: 32,
                            padding: 24,
                            maxHeight: '70%',
                        }}
                    >
                        <View style={{ width: 48, height: 4, backgroundColor: colors.hairline, borderRadius: 999, alignSelf: 'center', marginBottom: 16 }} />
                        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: colors.ink, marginBottom: 12, letterSpacing: -0.5 }}>
                            Selecione o mês
                        </Text>
                        <FlatList
                            data={MONTHS}
                            keyExtractor={(_, idx) => `m-${idx}`}
                            ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
                            renderItem={({ item, index }) => {
                                const ativo = index === monthIndex;
                                return (
                                    <TouchableOpacity
                                        onPress={() => { setMonthIndex(index); setMonthPickerVisible(false); }}
                                        style={{
                                            padding: 16,
                                            borderRadius: 16,
                                            backgroundColor: ativo ? colors.brand.primaryLight : '#FFFFFF',
                                            borderWidth: 1,
                                            borderColor: ativo ? colors.brand.primary : colors.hairline,
                                        }}
                                    >
                                        <Text style={{ fontFamily: ativo ? 'Outfit_700Bold' : 'Outfit_500Medium', fontSize: 15, color: ativo ? colors.brand.primaryDark : colors.ink }}>
                                            {item} {currentYear}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                </View>
            </Modal>

            {/* Atividades modal */}
            <Modal visible={activityModalVisible} transparent animationType="slide" onRequestClose={() => setActivityModalVisible(false)} statusBarTranslucent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setActivityModalVisible(false)} activeOpacity={1} />
                    <View
                        style={{
                            backgroundColor: colors.paper,
                            borderTopLeftRadius: 32,
                            borderTopRightRadius: 32,
                            padding: 24,
                            maxHeight: '85%',
                        }}
                    >
                        <View style={{ width: 48, height: 4, backgroundColor: colors.hairline, borderRadius: 999, alignSelf: 'center', marginBottom: 16 }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <View>
                                <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 11, color: colors.inkSoft, letterSpacing: 1, textTransform: 'uppercase' }}>
                                    Dia {diaSelecionado}
                                </Text>
                                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 24, color: colors.ink, letterSpacing: -0.6, marginTop: 2 }}>
                                    {atividadesDoDia.length} atividade{atividadesDoDia.length === 1 ? '' : 's'}
                                </Text>
                            </View>
                        </View>

                        {atividadesDoDia.length === 0 ? (
                            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                <Feather name="inbox" size={40} color={colors.inkSoft} />
                                <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 14, color: colors.inkSoft, marginTop: 12 }}>
                                    Nada registrado.
                                </Text>
                            </View>
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                                <View style={{ gap: 10 }}>
                                    {atividadesDoDia.map((item, idx) => {
                                        const valor = Number(item.valor) || 0;
                                        const nota = Number((item as any).nota);
                                        const passou = valor > 0 && !Number.isNaN(nota) && nota >= valor * 0.6;
                                        return (
                                            <View
                                                key={idx}
                                                style={{
                                                    backgroundColor: '#FFFFFF',
                                                    borderRadius: 18,
                                                    padding: 14,
                                                    borderWidth: 1,
                                                    borderColor: colors.hairline,
                                                }}
                                            >
                                                <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 10, color: colors.brand.primary, letterSpacing: 1, textTransform: 'uppercase' }}>
                                                    {item.disciplina}
                                                </Text>
                                                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: colors.ink, marginTop: 4, lineHeight: 20 }}>
                                                    {item.atividade}
                                                </Text>
                                                {(valor > 0 || !Number.isNaN(nota)) && (
                                                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                                                        {valor > 0 && (
                                                            <View style={{ backgroundColor: colors.paperWarm, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
                                                                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 10, color: colors.ink }}>
                                                                    Val: {valor}
                                                                </Text>
                                                            </View>
                                                        )}
                                                        {!Number.isNaN(nota) && (
                                                            <View
                                                                style={{
                                                                    backgroundColor: passou ? '#DCFCE7' : '#FEE2E2',
                                                                    paddingHorizontal: 8,
                                                                    paddingVertical: 4,
                                                                    borderRadius: 999,
                                                                }}
                                                            >
                                                                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 10, color: passou ? '#15803D' : '#B91C1C' }}>
                                                                    Nota: {nota}
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        )}

                        <TouchableOpacity
                            onPress={() => setActivityModalVisible(false)}
                            style={{
                                marginTop: 16,
                                paddingVertical: 14,
                                borderRadius: 999,
                                alignItems: 'center',
                                backgroundColor: colors.ink,
                            }}
                        >
                            <Text style={{ color: '#FFFFFF', fontFamily: 'Outfit_700Bold', fontSize: 14 }}>Fechar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function NavBtn({ icon, onPress, disabled }: { icon: 'chevron-left' | 'chevron-right'; onPress: () => void; disabled?: boolean }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: colors.hairline,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: disabled ? 0.5 : 1,
            }}
        >
            <Feather name={icon} size={18} color={colors.ink} />
        </TouchableOpacity>
    );
}

function LegendItem({ color, label }: { color: string; label: string }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
                style={{
                    width: 14,
                    height: 14,
                    borderRadius: 5,
                    backgroundColor: color,
                    marginRight: 6,
                }}
            />
            <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 12, color: colors.ink }}>{label}</Text>
        </View>
    );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Feather name="alert-triangle" size={28} color={colors.brand.primary} />
            <TouchableOpacity
                onPress={onRetry}
                style={{ marginTop: 12, backgroundColor: colors.brand.primary, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 999 }}
            >
                <Text style={{ color: '#FFFFFF', fontFamily: 'Outfit_700Bold', fontSize: 13 }}>Tentar novamente</Text>
            </TouchableOpacity>
        </View>
    );
}

function lumiText(hex: string): string {
    if (!hex.startsWith('#') || hex.length < 7) return colors.ink;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? colors.ink : '#FFFFFF';
}
