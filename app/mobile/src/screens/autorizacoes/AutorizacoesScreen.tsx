import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Modal,
    Pressable,
    ScrollView,
    RefreshControl
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    Autorizacao,
    AutorizacaoAcao,
    getAutorizacoes,
    postAutorizacao,
    statusLabel,
} from '../../services/autorizacoes/AutorizacaoService';
import { Header } from '../../components/Header';
import { Skeleton } from '../../components/Skeleton';
import { useAluno } from '../../context/AlunoContext';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/forms/Button';

// Componente de item extraído para evitar re-renderizações desnecessárias
const AutorizacaoItem = React.memo(({ item, onPress }: { item: Autorizacao; onPress: (item: Autorizacao) => void }) => {
    const negativo = item.status === 'recusado' || item.status === 'nao_comparecera';
    const positivo = item.status === 'aprovado' || item.status === 'confirmada';
    const pendente = !negativo && !positivo;

    const dot = pendente ? 'bg-amber-500' : negativo ? 'bg-red-500' : 'bg-emerald-500';
    const pillBg = pendente ? 'bg-amber-50' : negativo ? 'bg-red-50' : 'bg-emerald-50';
    const pillText = pendente ? 'text-amber-600' : negativo ? 'text-red-600' : 'text-emerald-600';

    return (
        <TouchableOpacity
            onPress={() => onPress(item)}
            activeOpacity={0.7}
            className="bg-white mb-3 p-4 rounded-2xl flex-row items-center border border-gray-100 shadow-sm"
        >
            <View className={`w-3 h-3 rounded-full ${dot}`} />
            <View className="ml-4 flex-1">
                <Text className="text-gray-800 font-bold text-base">{item.titulo}</Text>
                <Text className="text-gray-500 text-xs">
                    {item.data} • {item.tipo === 'A' ? 'Aprovação' : 'Presença'}
                </Text>
            </View>
            <View className={`px-3 py-1 rounded-full ${pillBg}`}>
                <Text className={`text-[10px] font-bold uppercase ${pillText}`}>
                    {statusLabel(item.status)}
                </Text>
            </View>
        </TouchableOpacity>
    );
});

export default function AutorizacoesScreen() {
    const insets = useSafeAreaInsets();
    const { aluno } = useAluno();
    const { user } = useAuth();
    const { showAlert } = useAlert();

    const [autorizacoes, setAutorizacoes] = useState<Autorizacao[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [selectedItem, setSelectedItem] = useState<Autorizacao | null>(null);
    const [actionLoading, setActionLoading] = useState<boolean>(false);

    const carregarAutorizacoes = async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);
        try {
            if (aluno?.pes_cod) {
                const dados = await getAutorizacoes(aluno.pes_cod);
                setAutorizacoes(dados || []);
            }
        } catch (error: any) {
            showAlert('Ops...', error.message || 'Erro ao carregar autorizações.', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        carregarAutorizacoes();
    }, [aluno?.pes_cod]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        carregarAutorizacoes(true);
    }, [aluno?.pes_cod]);

    const abrirDetalhes = useCallback((item: Autorizacao) => {
        setSelectedItem(item);
        setModalVisible(true);
    }, []);

    const handleAcao = async (novaAcao: AutorizacaoAcao) => {
        if (!selectedItem || !aluno || !user) return;

        try {
            setActionLoading(true);
            await postAutorizacao(selectedItem, aluno.pes_cod, novaAcao);

            showAlert('Sucesso', 'Ação registrada com sucesso.', 'success');
            await carregarAutorizacoes(true);
            setModalVisible(false);
        } catch (error: any) {
            showAlert('Ops...', error.message || 'Erro ao registrar ação.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const renderEmpty = () => (
        <View className="flex-1 items-center justify-center mt-20">
            <Text className="text-gray-500 text-base">Nenhuma autorização encontrada.</Text>
        </View>
    );

    return (
        <View className="flex-1 bg-slate-100">
            <Header title="Autorizações" />

            <SafeAreaView className="flex-1 px-4" edges={['bottom']}>
                {loading && !refreshing ? (
                    <View className="gap-3 mt-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} width={'100%'} height={80} />
                        ))}
                    </View>
                ) : (
                    <FlatList
                        data={autorizacoes}
                        keyExtractor={(item) => String(item.id)}
                        renderItem={({ item }) => (
                            <AutorizacaoItem item={item} onPress={abrirDetalhes} />
                        )}
                        ListEmptyComponent={renderEmpty}
                        contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10b981']} />
                        }
                    />
                )}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => !actionLoading && setModalVisible(false)}
                >
                    <Pressable
                        className="flex-1 bg-black/50 justify-end"
                        onPress={() => !actionLoading && setModalVisible(false)}
                    >
                        <View className="bg-white rounded-t-3xl p-6 shadow-2xl" style={{ paddingBottom: insets.bottom + 24 }}>
                            <View className="w-12 h-1 bg-gray-200 rounded-full self-center mb-6" />

                            {selectedItem && (
                                <View className="w-full">
                                    <Text className="text-xl font-black text-gray-900 mb-4">
                                        {selectedItem.titulo}
                                    </Text>

                                    <ScrollView className="max-h-40 mb-6" showsVerticalScrollIndicator={false}>
                                        <Text className="text-gray-600 leading-6 text-base">
                                            {selectedItem.detalhes}
                                        </Text>
                                    </ScrollView>
                                    {selectedItem.status === 'pendente' ? (
                                        <View className="flex-row gap-2 justify-center p-1">
                                            {selectedItem.tipo === 'A' ? (
                                                <View className="flex-row flex-1 gap-2">
                                                    <View className="flex-1">
                                                        <Button
                                                            onPress={() => handleAcao('recusado')}
                                                            label='REPROVAR'
                                                            variant='danger'
                                                            loading={actionLoading}
                                                        />
                                                    </View>
                                                    <View className="flex-1">
                                                        <Button
                                                            label='APROVAR'
                                                            onPress={() => handleAcao('aprovado')}
                                                            variant='primary'
                                                            loading={actionLoading}
                                                        />
                                                    </View>
                                                </View>
                                            ) : (
                                                <View className="flex-row flex-1 gap-2 justify-center p-1">
                                                    <View className="">
                                                        <Button
                                                            onPress={() => handleAcao('nao_comparecera')}
                                                            label='NÃO COMPARECERÁ'
                                                            variant='danger'
                                                            loading={actionLoading}
                                                        />
                                                    </View>
                                                    <View className="">
                                                        <Button
                                                            label='CONFIRMAR'
                                                            onPress={() => handleAcao('confirmada')}
                                                            variant='success'
                                                            loading={actionLoading}
                                                        />
                                                    </View>
                                                </View>
                                            )}
                                        </View>
                                    ) : (
                                        <View className="bg-gray-100 py-4 rounded-2xl items-center border border-gray-200">
                                            <Text className="text-gray-500 font-bold uppercase tracking-widest">
                                                Status: {statusLabel(selectedItem.status)}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    </Pressable>
                </Modal>
            </SafeAreaView>
        </View>
    );
}