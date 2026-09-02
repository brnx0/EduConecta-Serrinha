import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Header } from '../../components/Header';
import { FormSelect } from '../../components/forms/FormSelect';
import { Skeleton } from '../../components/Skeleton';
import { getBoletimEscolar, ListagemBoletimEscolar } from '../../services/boletim/BoletimEscolarService';
import { useAluno } from '../../context/AlunoContext';
import { colors } from '../../constants/colors';

/**
 * BoletimEscolarScreen Élo — cards verticais por disciplina.
 *
 * Refatoração radical: troca tabela horizontal-scroll-densa por
 * grid de cards expansíveis. Cada disciplina vira um card com:
 *   • Bar de média (gauge laranja se aprovando, vermelho se reprovando)
 *   • Mini grid de bimestres (chips)
 *   • Ícone de status (aprovado/reprovado/cursando)
 *
 * Resumo geral fica no hero card laranja no topo.
 */

const tomDaNota = (nota: number, mediaMin: number, dtFim: string | null) => {
    if (!dtFim || new Date(dtFim) > new Date()) {
        return { bg: '#F1F5F9', fg: '#475569' }; // ainda em curso
    }
    return nota >= mediaMin
        ? { bg: '#DCFCE7', fg: '#15803D' }
        : { bg: '#FEE2E2', fg: '#B91C1C' };
};

function getSituacaoItem(item: ListagemBoletimEscolar) {
    const hoje = new Date();
    const fimAno = new Date(item.data_fim_ano_letivo);
    if (hoje <= fimAno) return 'Cursando';
    return item.media_final >= item.media_para_aprovacao ? 'Aprovado' : 'Reprovado';
}

export default function BoletimEscolarScreen() {
    const { aluno } = useAluno();
    const [isLoading, setIsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [dados, setDados] = useState<ListagemBoletimEscolar[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [anoLocal, setAnoLocal] = useState<{ id: number; label: string } | null>(
        () => aluno?.anos_disponiveis?.find((a) => a.id === aluno.ano_selecionado) || null
    );

    useEffect(() => {
        if (aluno) {
            const padrao = aluno.anos_disponiveis?.find((a) => a.id === aluno.ano_selecionado);
            setAnoLocal(padrao || null);
        }
    }, [aluno]);

    useEffect(() => { fetchBoletim(); }, [anoLocal]);

    const fetchBoletim = async () => {
        if (!aluno || !anoLocal) return;
        setIsLoading(true);
        setError(null);
        setDados([]);
        try {
            const result = await getBoletimEscolar(aluno.pes_cod, anoLocal.id);
            if (result) setDados(result);
        } catch {
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

    const infoGeral = useMemo(() => {
        if (!dados.length) return null;
        const base = dados[0];
        const faltasTotais = dados.reduce((acc, i) => acc + (i.total_faltas || 0), 0);
        const freq = base.total_aulas_anual
            ? ((base.total_aulas_anual - faltasTotais) / base.total_aulas_anual) * 100
            : 100;
        return {
            curso: aluno!.curso,
            totalAulas: base.total_aulas_anual,
            mediaMinima: base.media_para_aprovacao,
            freqMinima: base.perc_frequencia_minima,
            faltasTotais,
            freq: Math.max(0, Math.min(100, freq)),
            disciplinas: dados.length,
            aprovadas: dados.filter((i) => i.media_final >= i.media_para_aprovacao).length,
        };
    }, [dados, aluno]);

    const unidadesVisiveis = useMemo(() => {
        if (!dados.length) return [] as number[];
        const { semestre_inicial, is_encerramento_semestral, qtd_unidades } = dados[0];
        if (is_encerramento_semestral) {
            return Array.from({ length: Math.ceil(qtd_unidades / 2) }, (_, i) => i + 1);
        }
        if (semestre_inicial === 2) {
            const metade = Math.ceil(qtd_unidades / 2);
            return Array.from({ length: qtd_unidades - metade }, (_, i) => i + metade + 1);
        }
        return Array.from({ length: qtd_unidades }, (_, i) => i + 1);
    }, [dados]);

    return (
        <View style={{ flex: 1, backgroundColor: colors.paper }}>
            <Header title="Boletim" />

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
                {/* Hero resumo */}
                {infoGeral ? (
                    <ResumoHero info={infoGeral} aluno={aluno?.nome} />
                ) : (
                    <Skeleton width="100%" height={170} borderRadius={28} />
                )}

                {/* Filtro */}
                <View style={{ marginTop: 18 }}>
                    <FormSelect
                        label="Ano letivo"
                        value={anoLocal}
                        options={aluno?.anos_disponiveis ?? []}
                        onSelect={setAnoLocal}
                    />
                </View>

                {/* Lista disciplinas */}
                <View style={{ marginTop: 6, gap: 12 }}>
                    {isLoading ? (
                        <DisciplinasSkeleton />
                    ) : error ? (
                        <ErrorState onRetry={fetchBoletim} />
                    ) : dados.length === 0 ? (
                        <EmptyState />
                    ) : (
                        dados.map((item, idx) => (
                            <DisciplinaCard
                                key={`${item.disciplina}-${idx}`}
                                item={item}
                                unidades={unidadesVisiveis}
                            />
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

// ─── Hero ───────────────────────────────────────────────────────

function ResumoHero({
    info,
    aluno,
}: {
    info: NonNullable<ReturnType<typeof useResumoStub>>;
    aluno?: string;
}) {
    const aprovadasPct = info.disciplinas
        ? Math.round((info.aprovadas / info.disciplinas) * 100)
        : 0;
    return (
        <View
            style={{
                backgroundColor: colors.brand.primary,
                borderRadius: 28,
                padding: 22,
            }}
        >
            <Text
                style={{
                    color: 'rgba(255,255,255,0.85)',
                    fontFamily: 'Outfit_500Medium',
                    fontSize: 11,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                }}
            >
                Boletim · {info.curso}
            </Text>
            <Text
                style={{
                    color: '#FFFFFF',
                    fontFamily: 'Outfit_700Bold',
                    fontSize: 28,
                    letterSpacing: -1,
                    lineHeight: 32,
                    marginTop: 6,
                }}
                numberOfLines={1}
            >
                {aluno ?? 'Aluno'}
            </Text>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <HeroStat
                    big={`${aprovadasPct}%`}
                    label="aprovadas"
                    sub={`${info.aprovadas}/${info.disciplinas}`}
                />
                <HeroStat
                    big={`${info.freq.toFixed(1)}%`}
                    label="frequência"
                    sub={`min ${info.freqMinima}%`}
                />
                <HeroStat
                    big={String(info.faltasTotais)}
                    label="faltas"
                    sub={`${info.totalAulas} aulas`}
                />
            </View>
        </View>
    );
}

function HeroStat({ big, label, sub }: { big: string; label: string; sub: string }) {
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderRadius: 18,
                padding: 12,
            }}
        >
            <Text
                style={{
                    color: '#FFFFFF',
                    fontFamily: 'Outfit_700Bold',
                    fontSize: 22,
                    letterSpacing: -0.8,
                    lineHeight: 24,
                }}
            >
                {big}
            </Text>
            <Text
                style={{
                    color: 'rgba(255,255,255,0.85)',
                    fontFamily: 'Outfit_500Medium',
                    fontSize: 10,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    marginTop: 2,
                }}
            >
                {label}
            </Text>
            <Text
                style={{
                    color: 'rgba(255,255,255,0.7)',
                    fontFamily: 'Outfit_400Regular',
                    fontSize: 11,
                    marginTop: 4,
                }}
            >
                {sub}
            </Text>
        </View>
    );
}

// ─── Card disciplina ────────────────────────────────────────────

function DisciplinaCard({
    item,
    unidades,
}: {
    item: ListagemBoletimEscolar;
    unidades: number[];
}) {
    const situacao = getSituacaoItem(item);
    const tomFinal =
        situacao === 'Aprovado'
            ? { bg: '#DCFCE7', fg: '#15803D', icon: 'check-circle' as const }
            : situacao === 'Reprovado'
                ? { bg: '#FEE2E2', fg: '#B91C1C', icon: 'x-circle' as const }
                : { bg: colors.brand.secondaryLight, fg: colors.brand.secondaryDark, icon: 'clock' as const };

    return (
        <View
            style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 22,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.hairline,
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text
                    style={{
                        flex: 1,
                        fontFamily: 'Outfit_700Bold',
                        fontSize: 15,
                        color: colors.ink,
                        letterSpacing: -0.3,
                    }}
                    numberOfLines={2}
                >
                    {item.disciplina}
                </Text>
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: tomFinal.bg,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 999,
                        marginLeft: 8,
                    }}
                >
                    <Feather name={tomFinal.icon} size={11} color={tomFinal.fg} />
                    <Text
                        style={{
                            color: tomFinal.fg,
                            fontFamily: 'Outfit_700Bold',
                            fontSize: 10,
                            marginLeft: 4,
                            letterSpacing: 0.4,
                            textTransform: 'uppercase',
                        }}
                    >
                        {situacao}
                    </Text>
                </View>
            </View>

            {/* Bimestres */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                {unidades.map((u) => {
                    const nota = item[`nota_${u}` as keyof typeof item] as number;
                    const falta = item[`falta_${u}` as keyof typeof item] as number;
                    const dtInicio = item[`dt_inicio_unidade_${u}` as keyof typeof item] as string;
                    const tom = tomDaNota(nota, item.media_para_aprovacao, dtInicio);
                    return (
                        <View
                            key={u}
                            style={{
                                backgroundColor: tom.bg,
                                borderRadius: 14,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                minWidth: 76,
                            }}
                        >
                            <Text
                                style={{
                                    color: tom.fg,
                                    fontFamily: 'Outfit_500Medium',
                                    fontSize: 9,
                                    letterSpacing: 0.6,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {u}º bim
                            </Text>
                            <Text
                                style={{
                                    color: tom.fg,
                                    fontFamily: 'Outfit_700Bold',
                                    fontSize: 18,
                                    letterSpacing: -0.5,
                                }}
                            >
                                {nota?.toString().replace('.', ',') ?? '—'}
                            </Text>
                            <Text style={{ color: tom.fg, fontFamily: 'Outfit_400Regular', fontSize: 9, opacity: 0.8 }}>
                                {falta} faltas
                            </Text>
                        </View>
                    );
                })}
            </View>

            {/* Linha final */}
            <View
                style={{
                    flexDirection: 'row',
                    marginTop: 14,
                    paddingTop: 14,
                    borderTopWidth: 1,
                    borderTopColor: colors.hairline,
                    gap: 10,
                }}
            >
                <FinalChip label="Média" value={String(item.media ?? '—').replace('.', ',')} />
                {Number(item.nota_recuperacao) > 0 && (
                    <FinalChip label="Recup" value={String(item.nota_recuperacao).replace('.', ',')} />
                )}
                <FinalChip
                    label="Final"
                    value={String(item.media_final ?? '—').replace('.', ',')}
                    highlight
                />
                <FinalChip label="Faltas" value={String(item.total_faltas ?? 0)} muted />
            </View>
        </View>
    );
}

function FinalChip({
    label,
    value,
    highlight,
    muted,
}: {
    label: string;
    value: string;
    highlight?: boolean;
    muted?: boolean;
}) {
    const bg = highlight ? colors.brand.primary : muted ? colors.paperWarm : colors.brand.secondaryLight;
    const fg = highlight ? '#FFFFFF' : muted ? colors.inkSoft : colors.brand.secondaryDark;
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: bg,
                borderRadius: 14,
                padding: 8,
                alignItems: 'center',
            }}
        >
            <Text
                style={{
                    color: fg,
                    fontFamily: 'Outfit_500Medium',
                    fontSize: 9,
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    opacity: 0.85,
                }}
            >
                {label}
            </Text>
            <Text
                style={{
                    color: fg,
                    fontFamily: 'Outfit_700Bold',
                    fontSize: 14,
                    letterSpacing: -0.3,
                }}
            >
                {value}
            </Text>
        </View>
    );
}

// ─── States ─────────────────────────────────────────────────────

function DisciplinasSkeleton() {
    return (
        <View style={{ gap: 12 }}>
            {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} width="100%" height={150} borderRadius={22} />
            ))}
        </View>
    );
}

function EmptyState() {
    return (
        <View
            style={{
                marginTop: 40,
                alignItems: 'center',
                padding: 32,
            }}
        >
            <View
                style={{
                    width: 80,
                    height: 80,
                    borderRadius: 28,
                    backgroundColor: colors.paperWarm,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                }}
            >
                <Feather name="book-open" size={32} color={colors.inkSoft} />
            </View>
            <Text
                style={{
                    fontFamily: 'Outfit_700Bold',
                    fontSize: 17,
                    color: colors.ink,
                    letterSpacing: -0.4,
                }}
            >
                Sem boletim ainda
            </Text>
            <Text
                style={{
                    fontFamily: 'Outfit_400Regular',
                    fontSize: 13,
                    color: colors.inkSoft,
                    textAlign: 'center',
                    marginTop: 6,
                }}
            >
                Não encontramos notas pro ano letivo selecionado.
            </Text>
        </View>
    );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <View
            style={{
                marginTop: 24,
                backgroundColor: '#FEE2E2',
                borderRadius: 22,
                padding: 20,
                alignItems: 'center',
            }}
        >
            <Feather name="alert-triangle" size={24} color="#B91C1C" />
            <Text
                style={{
                    fontFamily: 'Outfit_700Bold',
                    fontSize: 15,
                    color: '#B91C1C',
                    marginTop: 8,
                }}
            >
                Erro ao carregar
            </Text>
            <TouchableOpacity
                onPress={onRetry}
                style={{
                    marginTop: 12,
                    backgroundColor: '#B91C1C',
                    paddingHorizontal: 22,
                    paddingVertical: 10,
                    borderRadius: 999,
                }}
            >
                <Text style={{ color: '#FFFFFF', fontFamily: 'Outfit_700Bold', fontSize: 13 }}>
                    Tentar novamente
                </Text>
            </TouchableOpacity>
        </View>
    );
}

// type helper pra typing do ResumoHero
function useResumoStub(): {
    curso: string;
    totalAulas: number;
    mediaMinima: number;
    freqMinima: number;
    faltasTotais: number;
    freq: number;
    disciplinas: number;
    aprovadas: number;
} {
    throw new Error('only for typing');
}
