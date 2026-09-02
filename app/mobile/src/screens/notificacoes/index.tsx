import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Text,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  listarNotificacoes,
  marcarLida,
  marcarTodasLidas,
  type NotificacaoDTO,
} from '../../services/notificacoes';
import { NotificacaoItem } from './NotificacaoItem';
import { EmptyState } from './EmptyState';

export function NotificacoesScreen() {
  const [items, setItems] = useState<NotificacaoDTO[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

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
        // eslint-disable-next-line no-console
        console.warn('[NotificacoesScreen] erro ao carregar', err);
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  useEffect(() => {
    carregarPagina(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          prev.map((it) =>
            it.id === n.id ? { ...it, lidaEm: new Date().toISOString() } : it
          )
        );
      } catch {
        // UX não-bloqueante
      }
    }
  };

  const onPressMarcarTodas = async () => {
    try {
      await marcarTodasLidas();
      const agora = new Date().toISOString();
      setItems((prev) =>
        prev.map((it) => (it.lidaEm ? it : { ...it, lidaEm: agora }))
      );
    } catch {
      // ignora
    }
  };

  const temNaoLidas = items.some((it) => !it.lidaEm);

  return (
    <SafeAreaView className="flex-1 bg-white">
      {temNaoLidas && (
        <View className="flex-row items-center justify-end px-4 py-3 border-b border-gray-200">
          <Pressable onPress={onPressMarcarTodas}>
            <Text className="text-sm text-blue-600 font-medium">
              Marcar todas como lidas
            </Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => (
          <NotificacaoItem notificacao={item} onPress={onPressItem} />
        )}
        ListEmptyComponent={!loading ? <EmptyState /> : null}
        ListFooterComponent={
          loading && items.length > 0 ? (
            <ActivityIndicator className="my-4" />
          ) : null
        }
        onEndReached={() => hasMore && !loading && carregarPagina(false, cursor)}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={items.length === 0 ? { flex: 1 } : undefined}
      />
    </SafeAreaView>
  );
}

export default NotificacoesScreen;
