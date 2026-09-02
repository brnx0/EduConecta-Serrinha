import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { useAluno } from '../../context/AlunoContext';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { getOcorrencias, ListagemOcorrencia, postOcorrenciaCiente } from '../../services/ocorrencia/OcorrenciaService';
import { Header } from '../../components/Header';
import { Skeleton } from '../../components/Skeleton';
import { colors } from '../../constants/colors';
import { formatDatePTBR } from '../../util/FormatDate';

/**
 * OcorrenciaScreen Élo — feed de cards com edge color status,
 * modal slide-up com termo de ciência. Hero counter de pendentes.
 */
export default function OcorrenciasScreen() {
    const { aluno, atualizarOcorrenciaPendente } = useAluno();
    const { showToast } = useAlert();
    const { user } = useAuth();

    const [lista, setLista] = useState<ListagemOcorrencia[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [item, setItem] = useState<ListagemOcorrencia | null>(null);

    const fetchDados = useCallback(async () => {
        if (!aluno) return;
        try {
            if (!refreshing) setIsLoading(true);
            const dados = await getOcorrencias(aluno.pes_cod, aluno.ano_selecionado!);
            setLista(dados || []);
        } catch {
            showToast('Erro ao carregar ocorrências.', 'error');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [aluno, refreshing]);

    useFocusEffect(
        useCallback(() => { fetchDados(); }, [aluno])
    );

    const handleConfirmar = async (id: number) => {
        try {
            await postOcorrenciaCiente(id, Number(user?.usr_codigo));
            atualizarOcorrenciaPendente();
            showToast('Ocorrência confirmada!', 'success');
            await fetchDados();
        } catch {
            showToast('Erro ao confirmar.', 'error');
        }
    };

    const pendentes = lista.filter((i) => i.exige_conhecimento && i.ciente !== 'Sim').length;

    return (
        <View style={{ flex: 1, backgroundColor: colors.paper }}>
            <Header title="Ocorrências" />

            <ScrollView
                contentContainerStyle={{ paddingBottom: 140, paddingHorizontal: 18, paddingTop: 18 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            fetchDados();
                        }}
                        colors={[colors.brand.primary]}
                        tintColor={colors.brand.primary}
                    />
                }
            >
                {/* Hero status */}
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
                        {pendentes > 0 ? 'Atenção' : 'Tudo em dia'}
                    </Text>
                    <Text
                        style={{
                            color: '#FFFFFF',
                            fontFamily: 'Outfit_700Bold',
                            fontSize: 30,
                            letterSpacing: -1,
                            marginTop: 4,
                            lineHeight: 34,
                        }}
                    >
                        {pendentes > 0
                            ? `${pendentes} pendente${pendentes > 1 ? 's' : ''} de ciência`
                            : `${lista.length} ocorrência${lista.length === 1 ? '' : 's'}`}
                    </Text>
                    <Text
                        style={{
                            color: 'rgba(255,255,255,0.8)',
                            fontFamily: 'Outfit_400Regular',
                            fontSize: 13,
                            marginTop: 4,
                        }}
                    >
                        {pendentes > 0
                            ? 'Confirme a ciência das ocorrências marcadas.'
                            : 'Sem pendências no histórico.'}
                    </Text>
                </View>

                {/* Lista */}
                <View style={{ marginTop: 18, gap: 10 }}>
                    {isLoading ? (
                        <View style={{ gap: 10 }}>
                            <Skeleton width="100%" height={120} borderRadius={22} />
                            <Skeleton width="100%" height={120} borderRadius={22} />
                            <Skeleton width="100%" height={120} borderRadius={22} />
                        </View>
                    ) : lista.length === 0 ? (
                        <Empty />
                    ) : (
                        lista.map((it) => (
                            <OcorrenciaCard
                                key={it.ocorrencia_id}
                                item={it}
                                onPress={() => {
                                    setItem(it);
                                    setModalVisible(true);
                                }}
                            />
                        ))
                    )}
                </View>
            </ScrollView>

            <DetailModal
                visible={modalVisible}
                item={item}
                onClose={() => setModalVisible(false)}
                onConfirm={handleConfirmar}
            />
        </View>
    );
}

function OcorrenciaCard({ item, onPress }: { item: ListagemOcorrencia; onPress: () => void }) {
    const isCiente = item.ciente === 'Sim';
    const exige = !!item.exige_conhecimento;

    let edge = colors.brand.secondary;
    let label = 'Informativo';
    let labelBg = colors.brand.secondaryLight;
    let labelFg = colors.brand.secondaryDark;
    let icon: keyof typeof Feather.glyphMap = 'info';

    if (exige) {
        if (isCiente) {
            edge = '#16A34A';
            label = 'Ciente';
            labelBg = '#DCFCE7';
            labelFg = '#15803D';
            icon = 'check-circle';
        } else {
            edge = colors.brand.primary;
            label = 'Pendente';
            labelBg = colors.brand.primaryLight;
            labelFg = colors.brand.primaryDark;
            icon = 'alert-circle';
        }
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.85}
            style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 22,
                overflow: 'hidden',
                flexDirection: 'row',
                borderWidth: 1,
                borderColor: colors.hairline,
            }}
        >
            <View style={{ width: 5, backgroundColor: edge }} />
            <View style={{ flex: 1, padding: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Feather name="calendar" size={11} color={colors.inkSoft} />
                        <Text
                            style={{
                                fontFamily: 'Outfit_500Medium',
                                fontSize: 11,
                                color: colors.inkSoft,
                                marginLeft: 4,
                            }}
                        >
                            {item.data_ocorrencia}
                        </Text>
                    </View>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: labelBg,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 999,
                        }}
                    >
                        <Feather name={icon} size={10} color={labelFg} />
                        <Text
                            style={{
                                color: labelFg,
                                fontFamily: 'Outfit_700Bold',
                                fontSize: 9,
                                marginLeft: 4,
                                letterSpacing: 0.6,
                                textTransform: 'uppercase',
                            }}
                        >
                            {label}
                        </Text>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <View
                        style={{
                            backgroundColor: colors.paperWarm,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 999,
                            marginRight: 6,
                        }}
                    >
                        <Text
                            style={{
                                fontFamily: 'Outfit_700Bold',
                                fontSize: 9,
                                color: colors.ink,
                                letterSpacing: 0.6,
                                textTransform: 'uppercase',
                            }}
                        >
                            {item.tipo}
                        </Text>
                    </View>
                </View>

                <Text
                    style={{
                        fontFamily: 'Outfit_700Bold',
                        fontSize: 15,
                        color: colors.ink,
                        marginBottom: 8,
                        lineHeight: 19,
                        letterSpacing: -0.3,
                    }}
                    numberOfLines={2}
                >
                    {item.titulo}
                </Text>

                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingTop: 8,
                        borderTopWidth: 1,
                        borderTopColor: colors.hairline,
                    }}
                >
                    <Feather name="user" size={11} color={colors.inkSoft} />
                    <Text
                        style={{
                            fontFamily: 'Outfit_500Medium',
                            fontSize: 11,
                            color: colors.inkSoft,
                            marginLeft: 4,
                            flex: 1,
                        }}
                        numberOfLines={1}
                    >
                        Prof. {item.professor}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

function DetailModal({
    visible,
    item,
    onClose,
    onConfirm,
}: {
    visible: boolean;
    item: ListagemOcorrencia | null;
    onClose: () => void;
    onConfirm: (id: number) => Promise<void>;
}) {
    const [aceito, setAceito] = useState(false);
    const [confirmando, setConfirmando] = useState(false);

    useEffect(() => {
        if (visible) {
            setAceito(false);
            setConfirmando(false);
        }
    }, [visible, item]);

    if (!item) return null;
    const exige = !!item.exige_conhecimento;
    const isCiente = item.ciente === 'Sim';
    const isPendente = exige && !isCiente;

    const handleConfirmar = async () => {
        if (!item.ocorrencia_id) return;
        try {
            setConfirmando(true);
            await onConfirm(item.ocorrencia_id);
            onClose();
        } catch {
            setConfirmando(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
                <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
                <View
                    style={{
                        backgroundColor: colors.paper,
                        borderTopLeftRadius: 32,
                        borderTopRightRadius: 32,
                        maxHeight: '88%',
                        overflow: 'hidden',
                    }}
                >
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 16 }}>
                        <View style={{ width: 48, height: 4, backgroundColor: colors.hairline, borderRadius: 999, alignSelf: 'center', marginBottom: 16 }} />

                        <Text
                            style={{
                                fontFamily: 'Outfit_500Medium',
                                fontSize: 11,
                                color: colors.brand.primary,
                                letterSpacing: 1,
                                textTransform: 'uppercase',
                            }}
                        >
                            {item.tipo}
                        </Text>
                        <Text
                            style={{
                                fontFamily: 'Outfit_700Bold',
                                fontSize: 24,
                                color: colors.ink,
                                letterSpacing: -0.6,
                                marginTop: 6,
                                lineHeight: 28,
                            }}
                        >
                            {item.titulo}
                        </Text>

                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginTop: 12,
                                gap: 14,
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Feather name="clock" size={12} color={colors.inkSoft} />
                                <Text
                                    style={{
                                        fontFamily: 'Outfit_500Medium',
                                        fontSize: 12,
                                        color: colors.inkSoft,
                                        marginLeft: 4,
                                    }}
                                >
                                    {item.data_ocorrencia}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Feather name="user" size={12} color={colors.inkSoft} />
                                <Text
                                    style={{
                                        fontFamily: 'Outfit_500Medium',
                                        fontSize: 12,
                                        color: colors.inkSoft,
                                        marginLeft: 4,
                                    }}
                                    numberOfLines={1}
                                >
                                    {item.professor}
                                </Text>
                            </View>
                        </View>

                        <View
                            style={{
                                marginTop: 22,
                                backgroundColor: '#FFFFFF',
                                borderRadius: 18,
                                padding: 16,
                                borderWidth: 1,
                                borderColor: colors.hairline,
                            }}
                        >
                            <Text
                                style={{
                                    fontFamily: 'Outfit_500Medium',
                                    fontSize: 10,
                                    color: colors.inkSoft,
                                    letterSpacing: 1,
                                    textTransform: 'uppercase',
                                    marginBottom: 8,
                                }}
                            >
                                Descrição do fato
                            </Text>
                            <Text
                                style={{
                                    fontFamily: 'Outfit_400Regular',
                                    fontSize: 14,
                                    color: colors.ink,
                                    lineHeight: 22,
                                }}
                            >
                                {item.descricao || 'Sem descrição detalhada disponível.'}
                            </Text>
                        </View>

                        {isPendente && (
                            <TouchableOpacity
                                onPress={() => setAceito(!aceito)}
                                activeOpacity={0.85}
                                style={{
                                    marginTop: 16,
                                    backgroundColor: aceito ? colors.brand.primaryLight : colors.paperWarm,
                                    borderRadius: 18,
                                    padding: 16,
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    borderWidth: 1.5,
                                    borderColor: aceito ? colors.brand.primary : 'transparent',
                                }}
                            >
                                <View
                                    style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: 6,
                                        backgroundColor: aceito ? colors.brand.primary : '#FFFFFF',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 12,
                                        borderWidth: 1.5,
                                        borderColor: aceito ? colors.brand.primary : colors.hairline,
                                    }}
                                >
                                    {aceito && <Feather name="check" size={14} color="#FFFFFF" />}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 14, color: colors.ink }}>
                                        Declaro ciência
                                    </Text>
                                    <Text
                                        style={{
                                            fontFamily: 'Outfit_400Regular',
                                            fontSize: 12,
                                            color: colors.inkSoft,
                                            marginTop: 4,
                                            lineHeight: 17,
                                        }}
                                    >
                                        Confirmo que li e estou ciente do registro desta ocorrência.
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}

                        {isCiente && (
                            <View
                                style={{
                                    marginTop: 16,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: '#DCFCE7',
                                    borderRadius: 18,
                                    padding: 14,
                                }}
                            >
                                <Feather name="check-circle" size={18} color="#15803D" />
                                <Text
                                    style={{
                                        color: '#15803D',
                                        fontFamily: 'Outfit_700Bold',
                                        fontSize: 12,
                                        marginLeft: 8,
                                    }}
                                >
                                    Ciência confirmada em {item.dt_confirmacao ? formatDatePTBR(item.dt_confirmacao) : '—'}
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.hairline }}>
                        {isPendente ? (
                            <TouchableOpacity
                                onPress={handleConfirmar}
                                disabled={!aceito || confirmando}
                                style={{
                                    backgroundColor: aceito ? colors.brand.primary : colors.paperWarm,
                                    paddingVertical: 14,
                                    borderRadius: 999,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: !aceito ? 0.6 : 1,
                                }}
                            >
                                {confirmando ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Feather name="check" size={18} color={aceito ? '#FFFFFF' : colors.inkSoft} />
                                        <Text
                                            style={{
                                                color: aceito ? '#FFFFFF' : colors.inkSoft,
                                                fontFamily: 'Outfit_700Bold',
                                                fontSize: 14,
                                                marginLeft: 8,
                                            }}
                                        >
                                            Confirmar ciência
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                onPress={onClose}
                                style={{
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
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function Empty() {
    return (
        <View
            style={{
                marginTop: 30,
                alignItems: 'center',
                padding: 32,
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                borderWidth: 1,
                borderColor: colors.hairline,
                borderStyle: 'dashed',
            }}
        >
            <View
                style={{
                    width: 72,
                    height: 72,
                    borderRadius: 24,
                    backgroundColor: '#DCFCE7',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 14,
                }}
            >
                <Feather name="thumbs-up" size={28} color="#15803D" />
            </View>
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 17, color: colors.ink }}>
                Nada por aqui
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
                Nenhuma ocorrência registrada no período.
            </Text>
        </View>
    );
}
