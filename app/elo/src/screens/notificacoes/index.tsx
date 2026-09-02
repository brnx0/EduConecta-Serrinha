import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Text,
    Pressable,
    Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
    listarNotificacoes,
    marcarLida,
    marcarTodasLidas,
    simularPresencaDev,
    type NotificacaoDTO,
} from '../../services/notificacoes';
import { useAluno } from '../../context/AlunoContext';
import { NotificacaoItem } from './NotificacaoItem';
import { EmptyState } from './EmptyState';
import { colors } from '../../constants/colors';

export function NotificacoesScreen() {
    const { aluno } = useAluno();
    const [items, setItems] = useState<NotificacaoDTO[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [simulando, setSimulando] = useState(false);

    const carregarPagina = useCallback(
        async (reset = false, currentCursor: string | null = null) => {
            if (loading) return;
            setLoading(true);
            try {
                const res = await listarNotificacoes({
                    cursor: reset ? undefined : currentCursor ?? undefined,
                    limit: 20,
                });
                setItems((prev) => (reset ? res.items : [...prev, ...res.items]));
                setCursor(res.nextCursor);
                setHasMore(!!res.nextCursor);
            } catch (err) {
                console.warn('[NotificacoesScreen] erro', err);
            } finally {
                setLoading(false);
            }
        },
        [loading]
    );

    useEffect(() => {
        carregarPagina(true);
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        setCursor(null);
        setHasMore(true);
        await carregarPagina(true);
        setRefreshing(false);
    };

    const onPressItem = async (n: NotificacaoDTO) => {
        if (!n.lidaEm) {
            try {
                await marcarLida(n.id);
                setItems((prev) =>
                    prev.map((it) => (it.id === n.id ? { ...it, lidaEm: new Date().toISOString() } : it))
                );
            } catch {
                // UX não-bloqueante
            }
        }
    };

    const onMarcarTodas = async () => {
        try {
            await marcarTodasLidas();
            const agora = new Date().toISOString();
            setItems((prev) => prev.map((it) => (it.lidaEm ? it : { ...it, lidaEm: agora })));
        } catch {
            // ignora
        }
    };

    const onSimular = async () => {
        if (!aluno?.pes_cod || simulando) return;
        setSimulando(true);
        try {
            const res = await simularPresencaDev({
                pesCodAluno: aluno.pes_cod,
                tipo: 'entrada',
            });
            Alert.alert('Simulação', res.mensagem);
            setCursor(null);
            setHasMore(true);
            await carregarPagina(true);
        } catch (err: any) {
            Alert.alert('Erro', err?.response?.data?.error ?? err?.message ?? 'falha');
        } finally {
            setSimulando(false);
        }
    };

    const naoLidas = items.filter((it) => !it.lidaEm).length;

    return (
        <View style={{ flex: 1, backgroundColor: colors.paper }}>
            {/* Resumo strip */}
            <View
                style={{
                    paddingHorizontal: 18,
                    paddingTop: 14,
                    paddingBottom: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottomWidth: 1,
                    borderBottomColor: colors.hairline,
                }}
            >
                <View>
                    <Text
                        style={{
                            fontFamily: 'Outfit_500Medium',
                            fontSize: 11,
                            color: colors.inkSoft,
                            letterSpacing: 1,
                            textTransform: 'uppercase',
                        }}
                    >
                        Caixa
                    </Text>
                    <Text
                        style={{
                            fontFamily: 'Outfit_700Bold',
                            fontSize: 18,
                            color: colors.ink,
                            letterSpacing: -0.4,
                        }}
                    >
                        {naoLidas > 0 ? `${naoLidas} não lida${naoLidas === 1 ? '' : 's'}` : 'Tudo em dia'}
                    </Text>
                </View>
                {naoLidas > 0 && (
                    <Pressable
                        onPress={onMarcarTodas}
                        style={{
                            backgroundColor: colors.brand.primaryLight,
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 999,
                        }}
                    >
                        <Text
                            style={{
                                fontFamily: 'Outfit_700Bold',
                                fontSize: 12,
                                color: colors.brand.primaryDark,
                            }}
                        >
                            Marcar todas
                        </Text>
                    </Pressable>
                )}
            </View>

            {/* DEV simular */}
            {__DEV__ && aluno?.pes_cod && (
                <Pressable
                    onPress={onSimular}
                    disabled={simulando}
                    style={{
                        marginHorizontal: 18,
                        marginTop: 12,
                        paddingVertical: 12,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.paperWarm,
                        borderWidth: 1,
                        borderColor: colors.hairline,
                        borderStyle: 'dashed',
                        flexDirection: 'row',
                    }}
                >
                    <Feather name="zap" size={14} color={colors.inkSoft} />
                    <Text
                        style={{
                            fontFamily: 'Outfit_500Medium',
                            fontSize: 12,
                            color: colors.inkSoft,
                            marginLeft: 6,
                        }}
                    >
                        {simulando ? 'Simulando…' : `Simular presença (${aluno.nome?.split(' ')[0] ?? 'aluno'})`}
                    </Text>
                </Pressable>
            )}

            <FlatList
                data={items}
                keyExtractor={(it) => it.id}
                renderItem={({ item }) => <NotificacaoItem notificacao={item} onPress={onPressItem} />}
                ListEmptyComponent={!loading ? <EmptyState /> : null}
                ListFooterComponent={
                    loading && items.length > 0 ? (
                        <ActivityIndicator color={colors.brand.primary} style={{ marginVertical: 16 }} />
                    ) : null
                }
                onEndReached={() => hasMore && !loading && carregarPagina(false, cursor)}
                onEndReachedThreshold={0.5}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.brand.primary]}
                        tintColor={colors.brand.primary}
                    />
                }
                contentContainerStyle={[
                    { paddingTop: 6, paddingBottom: 40 },
                    items.length === 0 ? { flex: 1 } : null,
                ]}
            />
        </View>
    );
}

export default NotificacoesScreen;
