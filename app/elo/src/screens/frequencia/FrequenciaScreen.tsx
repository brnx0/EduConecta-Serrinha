import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, FlatList, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { colors } from '../../constants/colors';
import { Skeleton } from '../../components/Skeleton';
import { useAluno } from '../../context/AlunoContext';
import { CalendarioEscolar, getFrequenciaEscolar } from '../../services/frequencia/FrequenciaService';

const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

type DayInfo = { cor: string; status: string; motivo?: string };

/**
 * FrequenciaScreen Élo — calendário mensal com tiles arredondados
 * coloridos por status. Header com mês picker, hero com %frequencia,
 * legenda compacta no rodapé.
 */
export default function FrequenciaScreen() {
    const { aluno } = useAluno();
    const currentYear = aluno?.ano_selecionado ?? new Date().getFullYear();
    const [monthIndex, setMonthIndex] = useState(new Date().getMonth());
    const [monthPickerVisible, setMonthPickerVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dados, setDados] = useState<CalendarioEscolar[]>([]);

    const firstDayOfMonth = useMemo(() => new Date(currentYear, monthIndex, 1), [currentYear, monthIndex]);
    const daysInMonth = useMemo(() => new Date(currentYear, monthIndex + 1, 0).getDate(), [currentYear, monthIndex]);
    const startWeekday = firstDayOfMonth.getDay();

    const fetchCalendario = async () => {
        if (!aluno) return;
        setIsLoading(true);
        setError(null);
        try {
            const response = await getFrequenciaEscolar(aluno.pes_cod, currentYear, monthIndex + 1);
            setDados(response || []);
        } catch {
            setError('Erro ao carregar a frequência escolar.');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchCalendario(); }, [monthIndex]);

    const colorMap = useMemo(() => {
        const map: Record<string, DayInfo> = {};
        dados.forEach((itemAny) => {
            const item: any = itemAny;
            const rawDate = (item.DATA ?? item.Data ?? item.data ?? '').toString().split('T')[0].trim();
            if (!rawDate) return;
            map[rawDate] = {
                cor: (item.COR ?? item.Cor ?? item.cor ?? '#FFFFFF').toString(),
                status: (item.STATUS_DIA ?? item.StatusDia ?? item.Status ?? '').toString(),
                motivo: item.MOTIVO ?? item.Motivo ?? item.motivo,
            };
        });
        return map;
    }, [dados]);

    const stats = useMemo(() => {
        const total = Object.keys(colorMap).length;
        const presente = Object.values(colorMap).filter(
            (d) => d.cor.toLowerCase() === '#008000' || d.cor.toLowerCase() === '#00ff00'
        ).length;
        const falta = Object.values(colorMap).filter((d) => d.cor.toLowerCase().startsWith('#f')).length;
        return { total, presente, falta };
    }, [colorMap]);

    const grid = useMemo(() => {
        const cells: Array<{ key: string; day?: number; iso?: string }> = [];
        for (let i = 0; i < startWeekday; i++) cells.push({ key: `e-${i}` });
        const pad = (n: number) => String(n).padStart(2, '0');
        for (let d = 1; d <= daysInMonth; d++) {
            const iso = `${currentYear}-${pad(monthIndex + 1)}-${pad(d)}`;
            cells.push({ key: iso, day: d, iso });
        }
        while (cells.length % 7 !== 0) cells.push({ key: `t-${cells.length}` });
        return cells;
    }, [monthIndex, daysInMonth, startWeekday, currentYear]);

    const prev = () => setMonthIndex((i) => (i === 0 ? 11 : i - 1));
    const next = () => setMonthIndex((i) => (i === 11 ? 0 : i + 1));

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchCalendario();
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.paper }}>
            <Header title="Frequência" />

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
                {/* Hero stats */}
                <View
                    style={{
                        backgroundColor: colors.ink,
                        borderRadius: 28,
                        padding: 22,
                    }}
                >
                    <Text
                        style={{
                            color: colors.brand.accent,
                            fontFamily: 'Outfit_700Bold',
                            fontSize: 11,
                            letterSpacing: 2,
                            textTransform: 'uppercase',
                        }}
                    >
                        Mês de {MONTHS[monthIndex]}
                    </Text>
                    <Text
                        style={{
                            color: '#FFFFFF',
                            fontFamily: 'Outfit_700Bold',
                            fontSize: 30,
                            letterSpacing: -1,
                            marginTop: 4,
                        }}
                    >
                        {stats.presente} <Text style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }}>de {stats.total}</Text>
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'Outfit_400Regular', fontSize: 13, marginTop: 2 }}>
                        dias presentes
                    </Text>
                    <View style={{ flexDirection: 'row', marginTop: 14, gap: 8 }}>
                        <MiniBadge color="#22C55E" label={`${stats.presente} presenças`} />
                        <MiniBadge color={colors.brand.primary} label={`${stats.falta} faltas`} />
                    </View>
                </View>

                {/* Mês picker */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 22,
                        marginBottom: 12,
                    }}
                >
                    <NavBtn icon="chevron-left" onPress={prev} disabled={isLoading} />
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
                        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 14, color: colors.ink, letterSpacing: -0.3 }}>
                            {MONTHS[monthIndex]} · {currentYear}
                        </Text>
                    </TouchableOpacity>
                    <NavBtn icon="chevron-right" onPress={next} disabled={isLoading} />
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
                    {/* Weekday header */}
                    <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                        {WEEKDAYS.map((w, idx) => (
                            <View key={`wd-${idx}`} style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
                                <Text
                                    style={{
                                        fontFamily: 'Outfit_700Bold',
                                        fontSize: 11,
                                        color: colors.brand.primary,
                                        letterSpacing: 0.6,
                                    }}
                                >
                                    {w}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {isLoading ? (
                        <View style={{ paddingVertical: 60, alignItems: 'center' }}>
                            <Skeleton width="100%" height={240} borderRadius={16} />
                        </View>
                    ) : error ? (
                        <ErrorState onRetry={fetchCalendario} />
                    ) : (
                        Array.from({ length: grid.length / 7 }).map((_, rowIdx) => (
                            <View key={`row-${rowIdx}`} style={{ flexDirection: 'row' }}>
                                {grid.slice(rowIdx * 7, rowIdx * 7 + 7).map((cell) => {
                                    const info = cell.iso ? colorMap[cell.iso] : undefined;
                                    return (
                                        <View
                                            key={cell.key}
                                            style={{
                                                flex: 1,
                                                aspectRatio: 1,
                                                padding: 3,
                                            }}
                                        >
                                            {cell.day ? (
                                                <View
                                                    style={{
                                                        flex: 1,
                                                        borderRadius: 12,
                                                        backgroundColor: info?.cor ?? colors.paperWarm,
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
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
                                                </View>
                                            ) : null}
                                        </View>
                                    );
                                })}
                            </View>
                        ))
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
                        <LegendItem color="#22C55E" label="Presente" />
                        <LegendItem color="#EF4444" label="Falta" />
                        <LegendItem color="#F59E0B" label="Parcial" />
                        <LegendItem color={colors.paperWarm} label="Não letivo" border />
                    </View>
                </View>
            </ScrollView>

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
                        <Text
                            style={{
                                fontFamily: 'Outfit_700Bold',
                                fontSize: 20,
                                color: colors.ink,
                                marginBottom: 12,
                                letterSpacing: -0.5,
                            }}
                        >
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
                                        onPress={() => {
                                            setMonthIndex(index);
                                            setMonthPickerVisible(false);
                                        }}
                                        style={{
                                            padding: 16,
                                            borderRadius: 16,
                                            backgroundColor: ativo ? colors.brand.primaryLight : '#FFFFFF',
                                            borderWidth: 1,
                                            borderColor: ativo ? colors.brand.primary : colors.hairline,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontFamily: ativo ? 'Outfit_700Bold' : 'Outfit_500Medium',
                                                fontSize: 15,
                                                color: ativo ? colors.brand.primaryDark : colors.ink,
                                            }}
                                        >
                                            {item} {currentYear}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ─── Helpers ────────────────────────────────────────────────────

function MiniBadge({ color, label }: { color: string; label: string }) {
    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.12)',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
            }}
        >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 6 }} />
            <Text style={{ color: '#FFFFFF', fontFamily: 'Outfit_500Medium', fontSize: 11 }}>{label}</Text>
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

function LegendItem({ color, label, border }: { color: string; label: string; border?: boolean }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
                style={{
                    width: 14,
                    height: 14,
                    borderRadius: 5,
                    backgroundColor: color,
                    marginRight: 6,
                    borderWidth: border ? 1 : 0,
                    borderColor: colors.hairline,
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
            <Text
                style={{
                    fontFamily: 'Outfit_700Bold',
                    fontSize: 15,
                    color: colors.ink,
                    marginTop: 8,
                }}
            >
                Erro ao carregar
            </Text>
            <TouchableOpacity
                onPress={onRetry}
                style={{
                    marginTop: 12,
                    backgroundColor: colors.brand.primary,
                    paddingHorizontal: 22,
                    paddingVertical: 10,
                    borderRadius: 999,
                }}
            >
                <Text style={{ color: '#FFFFFF', fontFamily: 'Outfit_700Bold', fontSize: 13 }}>Tentar novamente</Text>
            </TouchableOpacity>
        </View>
    );
}

/** Determina cor de texto contrastante baseada na cor de fundo. */
function lumiText(hex: string): string {
    if (!hex.startsWith('#') || hex.length < 7) return colors.ink;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? colors.ink : '#FFFFFF';
}
