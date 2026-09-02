import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GetHorarios, ListagemHorarios } from '../../services/horario/HorariosService';
import { useAluno } from '../../context/AlunoContext';
import { Header } from '../../components/Header';
import { Skeleton } from '../../components/Skeleton';
import { colors } from '../../constants/colors';

interface HorarioSemanal {
    [dia: string]: { [periodo: string]: ListagemHorarios | null };
}

const PERIODOS_TODOS = ['1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º', '9º', '10º', '11º', '12º'];
const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_FULL = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const MAPA_DIA_NOME: Record<number, string> = {
    1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado',
};

const MAPA_TEMPO_PERIODO: Record<number, string> = {
    1: '1º', 2: '2º', 3: '3º', 4: '4º', 5: '5º', 6: '6º',
    7: '7º', 8: '8º', 9: '9º', 10: '10º', 11: '11º', 12: '12º',
};

// Paleta tonal Élo — usa só hues que harmonizam com brand
const TINTAS = [
    { bg: '#FFE7D9', fg: '#E0511C' }, // laranja
    { bg: '#CFFAFE', fg: '#0E7490' }, // teal
    { bg: '#FEF3C7', fg: '#A16207' }, // amarelo
    { bg: '#DCFCE7', fg: '#15803D' }, // verde
    { bg: '#EDE9FE', fg: '#6D28D9' }, // violeta
    { bg: '#FCE7F3', fg: '#BE185D' }, // rosa
    { bg: '#DBEAFE', fg: '#1D4ED8' }, // azul
    { bg: '#F1F5F9', fg: '#475569' }, // cinza
];

const tintaDe = (nome: string) => {
    if (!nome) return TINTAS[0];
    let h = 0;
    for (let i = 0; i < nome.length; i++) h = (h << 5) - h + nome.charCodeAt(i);
    return TINTAS[Math.abs(h) % TINTAS.length];
};

const transformar = (dados: ListagemHorarios[]) => {
    const e: HorarioSemanal = {};
    DIAS_FULL.forEach((d) => {
        e[d] = {};
        PERIODOS_TODOS.forEach((p) => (e[d][p] = null));
    });
    dados.forEach((aula) => {
        const dn = MAPA_DIA_NOME[aula.dia_semana - 1];
        const pn = MAPA_TEMPO_PERIODO[aula.tempo];
        if (dn && pn) e[dn][pn] = aula;
    });
    return e;
};

/**
 * HorariosScreen Élo — grade visual com células coloridas tonalmente
 * harmonizadas com brand. Toggle manhã/tarde como segmented pílula.
 * Modal detalhe slide-up.
 */
export default function HorariosScreen() {
    const { aluno } = useAluno();
    const [horarios, setHorarios] = useState<HorarioSemanal>({});
    const [modalVisible, setModalVisible] = useState(false);
    const [aulaSelecionada, setAulaSelecionada] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filtro, setFiltro] = useState<'manha' | 'tarde'>('manha');
    const [refreshing, setRefreshing] = useState(false);

    const periodos = useMemo(
        () => (filtro === 'manha' ? PERIODOS_TODOS.slice(0, 6) : PERIODOS_TODOS.slice(6, 12)),
        [filtro]
    );

    const fetchHorarios = useCallback(async () => {
        if (!aluno) return;
        setIsLoading(true);
        setError(null);
        try {
            const dados = await GetHorarios(aluno.pes_cod, aluno.ano_selecionado!);
            if (dados) setHorarios(transformar(dados));
        } catch {
            setError('Não foi possível carregar.');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [aluno]);

    useEffect(() => { fetchHorarios(); }, [aluno]);

    return (
        <View style={{ flex: 1, backgroundColor: colors.paper }}>
            <Header title="Horários" />

            <ScrollView
                contentContainerStyle={{ paddingBottom: 140, paddingHorizontal: 18, paddingTop: 18 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            fetchHorarios();
                        }}
                        colors={[colors.brand.primary]}
                        tintColor={colors.brand.primary}
                    />
                }
            >
                {/* Toggle período */}
                <View
                    style={{
                        flexDirection: 'row',
                        backgroundColor: colors.paperWarm,
                        borderRadius: 999,
                        padding: 4,
                        marginBottom: 16,
                    }}
                >
                    <SegBtn label="Manhã" sub="1º–6º" active={filtro === 'manha'} onPress={() => setFiltro('manha')} />
                    <SegBtn label="Tarde" sub="7º–12º" active={filtro === 'tarde'} onPress={() => setFiltro('tarde')} />
                </View>

                {isLoading ? (
                    <View style={{ gap: 8 }}>
                        <Skeleton width="100%" height={48} borderRadius={16} />
                        <Skeleton width="100%" height={300} borderRadius={22} />
                    </View>
                ) : error ? (
                    <ErrorState onRetry={fetchHorarios} />
                ) : (
                    <View
                        style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: 22,
                            padding: 12,
                            borderWidth: 1,
                            borderColor: colors.hairline,
                        }}
                    >
                        {/* Header dias */}
                        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                            <View style={{ width: 32 }} />
                            {DIAS_SEMANA.map((d) => (
                                <View key={d} style={{ flex: 1, alignItems: 'center' }}>
                                    <Text
                                        style={{
                                            fontFamily: 'Outfit_700Bold',
                                            fontSize: 10,
                                            color: colors.brand.primary,
                                            letterSpacing: 1,
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        {d}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* Linhas */}
                        {periodos.map((p) => (
                            <View key={p} style={{ flexDirection: 'row', marginBottom: 4, alignItems: 'stretch' }}>
                                <View
                                    style={{
                                        width: 32,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontFamily: 'Outfit_700Bold',
                                            fontSize: 11,
                                            color: colors.inkSoft,
                                        }}
                                    >
                                        {p}
                                    </Text>
                                </View>
                                {DIAS_FULL.map((dia) => {
                                    const aula = horarios[dia]?.[p];
                                    return (
                                        <View key={`${dia}-${p}`} style={{ flex: 1, padding: 2 }}>
                                            {aula ? (
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setAulaSelecionada({ aula, dia, periodo: p });
                                                        setModalVisible(true);
                                                    }}
                                                    activeOpacity={0.8}
                                                    style={{
                                                        backgroundColor: tintaDe(aula.disciplina).bg,
                                                        borderRadius: 10,
                                                        height: 56,
                                                        paddingHorizontal: 4,
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        position: 'relative',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    <View
                                                        style={{
                                                            position: 'absolute',
                                                            left: 0,
                                                            top: 0,
                                                            bottom: 0,
                                                            width: 3,
                                                            backgroundColor: tintaDe(aula.disciplina).fg,
                                                        }}
                                                    />
                                                    <Text
                                                        style={{
                                                            fontFamily: 'Outfit_700Bold',
                                                            fontSize: 10,
                                                            color: tintaDe(aula.disciplina).fg,
                                                            letterSpacing: -0.2,
                                                        }}
                                                        numberOfLines={1}
                                                    >
                                                        {aula.disciplina.slice(0, 4).toUpperCase()}
                                                    </Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <View
                                                    style={{
                                                        height: 56,
                                                        backgroundColor: colors.paperWarm,
                                                        borderRadius: 10,
                                                        opacity: 0.5,
                                                    }}
                                                />
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        ))}
                    </View>
                )}

                <Text
                    style={{
                        fontFamily: 'Outfit_400Regular',
                        fontSize: 11,
                        color: colors.inkSoft,
                        textAlign: 'center',
                        marginTop: 14,
                    }}
                >
                    Toque em uma aula pra ver detalhes
                </Text>
            </ScrollView>

            {/* Modal detalhe */}
            <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setModalVisible(false)} activeOpacity={1} />
                    {aulaSelecionada && (() => {
                        const { aula, dia, periodo } = aulaSelecionada;
                        const tinta = tintaDe(aula.disciplina);
                        return (
                            <View
                                style={{
                                    backgroundColor: colors.paper,
                                    borderTopLeftRadius: 32,
                                    borderTopRightRadius: 32,
                                    padding: 24,
                                }}
                            >
                                <View style={{ width: 48, height: 4, backgroundColor: colors.hairline, borderRadius: 999, alignSelf: 'center', marginBottom: 16 }} />

                                <View
                                    style={{
                                        backgroundColor: tinta.bg,
                                        borderRadius: 22,
                                        padding: 18,
                                        marginBottom: 16,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: tinta.fg,
                                            fontFamily: 'Outfit_500Medium',
                                            fontSize: 11,
                                            letterSpacing: 1,
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        {dia} · {periodo}
                                    </Text>
                                    <Text
                                        style={{
                                            color: tinta.fg,
                                            fontFamily: 'Outfit_700Bold',
                                            fontSize: 24,
                                            letterSpacing: -0.6,
                                            marginTop: 4,
                                            lineHeight: 28,
                                        }}
                                    >
                                        {aula.disciplina}
                                    </Text>
                                </View>

                                <DetailRow icon="user" label="Professor" value={aula.professor || '—'} />
                                <DetailRow icon="users" label="Turma" value={aula.turma} />
                                <DetailRow icon="calendar" label="Ano letivo" value={String(aula.ano_letivo)} />

                                <TouchableOpacity
                                    onPress={() => setModalVisible(false)}
                                    style={{
                                        marginTop: 20,
                                        backgroundColor: colors.ink,
                                        paddingVertical: 14,
                                        borderRadius: 999,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ color: '#FFFFFF', fontFamily: 'Outfit_700Bold', fontSize: 14 }}>
                                        Fechar
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        );
                    })()}
                </View>
            </Modal>
        </View>
    );
}

function SegBtn({ label, sub, active, onPress }: { label: string; sub: string; active: boolean; onPress: () => void }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: active ? '#FFFFFF' : 'transparent',
                alignItems: 'center',
            }}
            activeOpacity={0.85}
        >
            <Text
                style={{
                    fontFamily: 'Outfit_700Bold',
                    fontSize: 13,
                    color: active ? colors.ink : colors.inkSoft,
                }}
            >
                {label}
            </Text>
            <Text
                style={{
                    fontFamily: 'Outfit_400Regular',
                    fontSize: 10,
                    color: active ? colors.brand.primary : colors.inkSoft,
                }}
            >
                {sub}
            </Text>
        </TouchableOpacity>
    );
}

function DetailRow({
    icon,
    label,
    value,
}: {
    icon: keyof typeof Feather.glyphMap;
    label: string;
    value: string;
}) {
    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.hairline,
            }}
        >
            <View
                style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: colors.paperWarm,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Feather name={icon} size={16} color={colors.ink} />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
                <Text
                    style={{
                        fontFamily: 'Outfit_500Medium',
                        fontSize: 10,
                        color: colors.inkSoft,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                    }}
                >
                    {label}
                </Text>
                <Text
                    style={{
                        fontFamily: 'Outfit_700Bold',
                        fontSize: 15,
                        color: colors.ink,
                        marginTop: 2,
                        letterSpacing: -0.3,
                    }}
                >
                    {value}
                </Text>
            </View>
        </View>
    );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Feather name="alert-triangle" size={28} color={colors.brand.primary} />
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
