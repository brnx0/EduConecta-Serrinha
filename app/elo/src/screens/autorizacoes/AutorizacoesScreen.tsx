import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, ScrollView, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
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
import { colors } from '../../constants/colors';

const tomDoStatus = (status: Autorizacao['status']) => {
    switch (status) {
        case 'pendente':
            return { bg: colors.brand.primaryLight, fg: colors.brand.primaryDark, dot: colors.brand.primary };
        case 'aprovado':
        case 'confirmada':
            return { bg: '#DCFCE7', fg: '#15803D', dot: '#16A34A' };
        case 'recusado':
        case 'nao_comparecera':
            return { bg: '#FEE2E2', fg: '#B91C1C', dot: '#DC2626' };
    }
};

/**
 * AutorizacoesScreen Élo — feed de pílulas com status visíveis,
 * modal slide-up com botões grandes pra ações pendentes.
 */
export default function AutorizacoesScreen() {
    const { aluno } = useAluno();
    const { user } = useAuth();
    const { showAlert } = useAlert();

    const [autorizacoes, setAutorizacoes] = useState<Autorizacao[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Autorizacao | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const carregar = async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);
        try {
            if (aluno?.pes_cod) {
                const dados = await getAutorizacoes(aluno.pes_cod);
                setAutorizacoes(dados || []);
            }
        } catch (e: any) {
            showAlert('Ops', e.message || 'Erro ao carregar.', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { carregar(); }, [aluno?.pes_cod]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        carregar(true);
    }, [aluno?.pes_cod]);

    const handleAcao = async (acao: AutorizacaoAcao) => {
        if (!selectedItem || !aluno || !user) return;
        try {
            setActionLoading(true);
            await postAutorizacao(selectedItem, aluno.pes_cod, acao);
            showAlert('Sucesso', 'Ação registrada com sucesso.', 'success');
            await carregar(true);
            setModalVisible(false);
        } catch (e: any) {
            showAlert('Ops', e.message || 'Erro ao registrar.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const pendentes = autorizacoes.filter((a) => a.status === 'pendente').length;

    return (
        <View style={{ flex: 1, backgroundColor: colors.paper }}>
            <Header title="Autorizações" />

            <FlatList
                data={loading ? [] : autorizacoes}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 140 }}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.brand.primary]}
                        tintColor={colors.brand.primary}
                    />
                }
                ListHeaderComponent={
                    <View style={{ marginBottom: 16 }}>
                        <View
                            style={{
                                backgroundColor: pendentes > 0 ? colors.brand.primary : colors.ink,
                                borderRadius: 28,
                                padding: 22,
                            }}
                        >
                            <Text
                                style={{
                                    color: pendentes > 0 ? colors.brand.accent : 'rgba(255,255,255,0.7)',
                                    fontFamily: 'Outfit_700Bold',
                                    fontSize: 11,
                                    letterSpacing: 1.5,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {pendentes > 0 ? 'Aguardando você' : 'Tudo respondido'}
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
                                {pendentes > 0
                                    ? `${pendentes} pendente${pendentes > 1 ? 's' : ''}`
                                    : `${autorizacoes.length} autorização${autorizacoes.length === 1 ? '' : 'es'}`}
                            </Text>
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    loading ? (
                        <View style={{ gap: 10 }}>
                            <Skeleton width="100%" height={90} borderRadius={20} />
                            <Skeleton width="100%" height={90} borderRadius={20} />
                            <Skeleton width="100%" height={90} borderRadius={20} />
                        </View>
                    ) : (
                        <Empty />
                    )
                }
                renderItem={({ item }) => {
                    const tom = tomDoStatus(item.status);
                    return (
                        <TouchableOpacity
                            onPress={() => {
                                setSelectedItem(item);
                                setModalVisible(true);
                            }}
                            activeOpacity={0.85}
                            style={{
                                backgroundColor: '#FFFFFF',
                                borderRadius: 20,
                                padding: 16,
                                flexDirection: 'row',
                                alignItems: 'center',
                                borderWidth: 1,
                                borderColor: colors.hairline,
                            }}
                        >
                            <View
                                style={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: 6,
                                    backgroundColor: tom.dot,
                                    marginRight: 14,
                                }}
                            />
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={{
                                        fontFamily: 'Outfit_700Bold',
                                        fontSize: 15,
                                        color: colors.ink,
                                        letterSpacing: -0.3,
                                    }}
                                    numberOfLines={2}
                                >
                                    {item.titulo}
                                </Text>
                                <Text
                                    style={{
                                        fontFamily: 'Outfit_500Medium',
                                        fontSize: 11,
                                        color: colors.inkSoft,
                                        marginTop: 4,
                                    }}
                                >
                                    {item.data} · {item.tipo === 'A' ? 'Aprovação' : 'Presença'}
                                </Text>
                            </View>
                            <View
                                style={{
                                    backgroundColor: tom.bg,
                                    paddingHorizontal: 10,
                                    paddingVertical: 4,
                                    borderRadius: 999,
                                }}
                            >
                                <Text
                                    style={{
                                        color: tom.fg,
                                        fontFamily: 'Outfit_700Bold',
                                        fontSize: 9,
                                        letterSpacing: 0.6,
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    {statusLabel(item.status)}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />

            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => !actionLoading && setModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => !actionLoading && setModalVisible(false)}
                        activeOpacity={1}
                    />
                    <View
                        style={{
                            backgroundColor: colors.paper,
                            borderTopLeftRadius: 32,
                            borderTopRightRadius: 32,
                            padding: 24,
                            maxHeight: '85%',
                        }}
                    >
                        {selectedItem && (() => {
                            const tom = tomDoStatus(selectedItem.status);
                            return (
                                <>
                                    <View style={{ width: 48, height: 4, backgroundColor: colors.hairline, borderRadius: 999, alignSelf: 'center', marginBottom: 16 }} />

                                    <View
                                        style={{
                                            alignSelf: 'flex-start',
                                            backgroundColor: tom.bg,
                                            paddingHorizontal: 12,
                                            paddingVertical: 5,
                                            borderRadius: 999,
                                            marginBottom: 12,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: tom.fg,
                                                fontFamily: 'Outfit_700Bold',
                                                fontSize: 11,
                                                letterSpacing: 1,
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            {selectedItem.tipo === 'A' ? 'Aprovação' : 'Presença'} · {statusLabel(selectedItem.status)}
                                        </Text>
                                    </View>

                                    <Text
                                        style={{
                                            fontFamily: 'Outfit_700Bold',
                                            fontSize: 24,
                                            color: colors.ink,
                                            letterSpacing: -0.6,
                                            lineHeight: 28,
                                        }}
                                    >
                                        {selectedItem.titulo}
                                    </Text>

                                    <Text
                                        style={{
                                            fontFamily: 'Outfit_500Medium',
                                            fontSize: 12,
                                            color: colors.inkSoft,
                                            marginTop: 6,
                                        }}
                                    >
                                        Recebida em {selectedItem.data}
                                    </Text>

                                    <ScrollView
                                        style={{ maxHeight: 200, marginTop: 16 }}
                                        showsVerticalScrollIndicator={false}
                                    >
                                        <Text
                                            style={{
                                                fontFamily: 'Outfit_400Regular',
                                                fontSize: 14,
                                                color: colors.ink,
                                                lineHeight: 22,
                                            }}
                                        >
                                            {selectedItem.detalhes}
                                        </Text>
                                    </ScrollView>

                                    <View style={{ marginTop: 20 }}>
                                        {selectedItem.status === 'pendente' ? (
                                            selectedItem.tipo === 'A' ? (
                                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                                    <View style={{ flex: 1 }}>
                                                        <Button
                                                            onPress={() => handleAcao('recusado')}
                                                            label="Recusar"
                                                            variant="danger"
                                                            loading={actionLoading}
                                                        />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Button
                                                            onPress={() => handleAcao('aprovado')}
                                                            label="Aprovar"
                                                            variant="primary"
                                                            loading={actionLoading}
                                                        />
                                                    </View>
                                                </View>
                                            ) : (
                                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                                    <View style={{ flex: 1 }}>
                                                        <Button
                                                            onPress={() => handleAcao('nao_comparecera')}
                                                            label="Não vai"
                                                            variant="danger"
                                                            loading={actionLoading}
                                                        />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Button
                                                            onPress={() => handleAcao('confirmada')}
                                                            label="Confirmar"
                                                            variant="success"
                                                            loading={actionLoading}
                                                        />
                                                    </View>
                                                </View>
                                            )
                                        ) : (
                                            <View
                                                style={{
                                                    backgroundColor: colors.paperWarm,
                                                    paddingVertical: 16,
                                                    borderRadius: 18,
                                                    alignItems: 'center',
                                                    flexDirection: 'row',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <Feather name="check-circle" size={16} color={tom.fg} />
                                                <Text
                                                    style={{
                                                        color: tom.fg,
                                                        fontFamily: 'Outfit_700Bold',
                                                        fontSize: 13,
                                                        letterSpacing: 0.5,
                                                        marginLeft: 8,
                                                    }}
                                                >
                                                    Já respondida: {statusLabel(selectedItem.status)}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </>
                            );
                        })()}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function Empty() {
    return (
        <View style={{ alignItems: 'center', padding: 40 }}>
            <View
                style={{
                    width: 80,
                    height: 80,
                    borderRadius: 28,
                    backgroundColor: colors.brand.primaryLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                }}
            >
                <Feather name="key" size={32} color={colors.brand.primary} />
            </View>
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 17, color: colors.ink }}>
                Sem autorizações
            </Text>
            <Text
                style={{
                    fontFamily: 'Outfit_400Regular',
                    fontSize: 13,
                    color: colors.inkSoft,
                    marginTop: 6,
                    textAlign: 'center',
                }}
            >
                Quando a escola pedir, aparece aqui.
            </Text>
        </View>
    );
}
