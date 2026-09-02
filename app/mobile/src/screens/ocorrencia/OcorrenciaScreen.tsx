import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, Dimensions, ActivityIndicator } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Context & Services
import { useAluno } from '../../context/AlunoContext';
import { useAlert } from '../../context/AlertContext';
import { getOcorrencias, ListagemOcorrencia, postOcorrenciaCiente } from '../../services/ocorrencia/OcorrenciaService';

// Components
import { Header } from '../../components/Header';
import { AlunoCard } from '../../components/AlunoCard';
import { Skeleton } from '../../components/Skeleton';
import { colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { formatDatePTBR, formatDateShort } from '../../util/FormatDate';
import { useFocusEffect } from '@react-navigation/native';

// --- Sub-Components ---

// 1. Card da Ocorrência
function OcorrenciaCard({ item, onPress }: { item: ListagemOcorrencia, onPress: () => void }) {
    const isCiente = item.ciente === 'Sim';

    let statusColor = 'bg-blue-500'; // Neutro (Padrão)
    let badgeBg = 'bg-blue-50 border-blue-100';
    let badgeText = 'text-blue-700';
    let iconName: any = 'info';
    let iconColor = '#2563eb';
    let statusText = 'Informativo';

    if (item.exige_conhecimento) {
        if (isCiente) {
            statusColor = 'bg-green-500';
            badgeBg = 'bg-green-50 border-green-100';
            badgeText = 'text-green-700';
            iconName = 'check-circle';
            iconColor = '#16a34a';
            statusText = 'Ciente';
        } else {
            statusColor = 'bg-amber-500';
            badgeBg = 'bg-amber-50 border-amber-100';
            badgeText = 'text-amber-700';
            iconName = 'alert-circle';
            iconColor = '#d97706';
            statusText = 'Pendente';
        }
    }

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-4 overflow-hidden flex-row"
        >
            {/* Faixa Lateral de Status */}
            <View className={`w-1.5 ${statusColor}`} />

            <View className="flex-1 p-4">
                {/* Header: Data e Tipo */}
                <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-row items-center bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                        <Feather name="calendar" size={10} color="#64748b" />
                        <Text className="text-slate-500 text-[10px] font-bold ml-1.5">
                            {item.data_ocorrencia}
                        </Text>
                    </View>

                    {/* Badge do Tipo */}
                    <View className={`px-2 py-1 rounded-md border ${badgeBg}`}>
                        <Text className={`text-[10px] font-bold uppercase tracking-wide ${badgeText}`}>
                            {item.tipo}
                        </Text>
                    </View>
                </View>

                {/* Título */}
                <Text className="text-slate-800 font-bold text-base mb-2 leading-tight" numberOfLines={2}>
                    {item.titulo}
                </Text>

                {/* Footer: Professor e Status */}
                <View className="flex-row items-center justify-between mt-1 pt-2 border-t border-slate-50">
                    <View className="flex-row items-center flex-1 mr-2">
                        <Feather name="user" size={12} color="#94a3b8" />
                        <Text className="text-slate-500 text-xs ml-1" numberOfLines={1}>
                            Prof. {item.professor}
                        </Text>
                    </View>

                    <View className="flex-row items-center">
                        <Feather name={iconName} size={12} color={iconColor} />
                        <Text style={{ color: iconColor }} className="text-[10px] font-bold ml-1 uppercase">
                            {statusText}
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

// 2. Modal de Detalhes
function OcorrenciaDetailModal({
    visible,
    item,
    onClose,
    onConfirmarCiencia
}: {
    visible: boolean,
    item: ListagemOcorrencia | null,
    onClose: () => void,
    onConfirmarCiencia: (id: number) => Promise<void>
}) {
    const insets = useSafeAreaInsets();
    const [termosAceitos, setTermosAceitos] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);

    useEffect(() => {
        if (visible) {
            setTermosAceitos(false);
            setIsConfirming(false);
        }
    }, [visible, item]);

    if (!item) return null;

    const exigeCiencia = item.exige_conhecimento === 1;
    const isCiente = item.ciente === 'Sim';

    // Se não exige ciência OU já está ciente, o "status pendente" é falso
    const isPendente = item.exige_conhecimento && !isCiente;

    const handleConfirmar = async () => {
        if (!item.ocorrencia_id) return;
        try {
            setIsConfirming(true);
            await onConfirmarCiencia(item.ocorrencia_id);
            onClose();
        } catch (error) {
            console.error("Erro ao confirmar", error);
            setIsConfirming(false);
        }
    };

    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose} statusBarTranslucent>
            <View className="flex-1 bg-black/60 justify-end">
                <View className="bg-white w-full rounded-t-3xl h-[90%] overflow-hidden shadow-2xl flex-col" style={{ paddingBottom: insets.bottom }}>

                    {/* Header Modal */}
                    <View className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex-row justify-between items-center shrink-0">
                        <View className="flex-1 pr-4">
                            <Text className="text-slate-400 text-xs uppercase font-bold mb-1">Detalhes da Ocorrência</Text>
                            <Text className="text-slate-800 font-bold text-lg" numberOfLines={1}>{item.tipo}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} className="w-8 h-8 bg-white border border-slate-200 rounded-full items-center justify-center">
                            <Ionicons name="close" size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

                        {/* Título */}
                        <View className="mb-2">
                            <Text className="text-slate-800 text-xl font-bold leading-tight">
                                {item.titulo}
                            </Text>
                        </View>

                        <View className="flex-row items-center mb-6 flex-wrap">
                            <Feather name="clock" size={14} color="#64748b" />
                            <Text className="text-slate-500 text-sm ml-2">
                                Ocorrido em <Text className="font-bold text-slate-700">{item.data_ocorrencia}</Text>
                            </Text>
                        </View>

                        {/* Informações Contextuais */}
                        <View className="space-y-4 mb-6">
                            <InfoRow label="Professor(a)" value={item.professor} icon="user" />
                        </View>

                        <View className="h-[1px] bg-slate-100 w-full mb-6" />

                        {/* Descrição */}
                        <View className="mb-6">
                            <Text className="text-slate-400 text-xs font-bold uppercase mb-2 flex-row items-center">
                                <Feather name="file-text" size={12} />  Descrição do Fato
                            </Text>
                            <View className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <Text className="text-slate-700 text-base leading-7 text-justify">
                                    {item.descricao || "Sem descrição detalhada disponível."}
                                </Text>
                            </View>
                        </View>

                        {/* Área de Checkbox (Apenas se EXIGE ciência e ainda NÃO está ciente) */}
                        {isPendente && (
                            <View className="mt-4 bg-amber-50 p-4 rounded-xl border border-amber-100">
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => setTermosAceitos(!termosAceitos)}
                                    className="flex-row items-start"
                                >
                                    <View className={`w-6 h-6 rounded border mr-3 items-center justify-center ${termosAceitos ? 'bg-amber-500 border-amber-600' : 'bg-white border-slate-300'}`}>
                                        {termosAceitos && <Feather name="check" size={16} color="white" />}
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-slate-700 font-bold text-sm leading-5">
                                            Declaro ciência
                                        </Text>
                                        <Text className="text-slate-500 text-xs leading-4 mt-1">
                                            Confirmo que li e estou ciente do registro desta ocorrência disciplinar referente ao aluno.
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Mensagem de Confirmação (Se já ciente) */}
                        {isCiente && exigeCiencia && (
                            <View className="mt-2 bg-green-50 p-4 rounded-xl border border-green-100 flex-row items-center justify-center">
                                <Feather name="check-circle" size={20} color="#16a34a" />
                                <Text className="text-green-800 font-bold ml-2">
                                    Você já confirmou ciência em {formatDatePTBR(item.dt_confirmacao!)}
                                </Text>
                            </View>
                        )}

                    </ScrollView>

                    {/* Footer */}
                    <View className="p-4 border-t border-slate-100 bg-white shrink-0 safe-pb">
                        {isPendente ? (
                            // Botão de Confirmar (Só aparece se exige ciência e não está ciente)
                            <TouchableOpacity
                                onPress={handleConfirmar}
                                disabled={!termosAceitos || isConfirming}
                                className={`w-full py-3.5 rounded-xl items-center shadow-sm flex-row justify-center ${(!termosAceitos || isConfirming) ? 'bg-slate-200' : 'bg-blue-600 shadow-blue-300'}`}
                            >
                                {isConfirming ? (
                                    <ActivityIndicator size="small" color={termosAceitos ? "#64748b" : "#fff"} />
                                ) : (
                                    <>
                                        <Feather name="check-square" size={18} color={(!termosAceitos) ? "#94a3b8" : "white"} />
                                        <Text className={`font-bold text-base ml-2 ${(!termosAceitos) ? 'text-slate-400' : 'text-white'}`}>
                                            Confirmar Ciência
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        ) : (
                            // Botão de Fechar (Neutro ou Já Ciente)
                            <TouchableOpacity onPress={onClose} className="w-full bg-slate-100 py-3.5 rounded-xl items-center active:bg-slate-200">
                                <Text className="text-slate-700 font-bold text-base">Fechar</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// Componente auxiliar para linhas de informação no modal
const InfoRow = ({ label, value, icon }: { label: string, value: string, icon: any }) => (
    <View className="flex-row items-center">
        <View className="w-8 h-8 bg-slate-50 rounded-full items-center justify-center mr-3 border border-slate-100">
            <Feather name={icon} size={14} color="#64748b" />
        </View>
        <View>
            <Text className="text-slate-400 text-[10px] font-bold uppercase">{label}</Text>
            <Text className="text-slate-700 text-sm font-medium">{value}</Text>
        </View>
    </View>
);

// 3. Skeleton
function OcorrenciaSkeleton() {
    return (
        <View className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-4">
            <View className="flex-row justify-between mb-3">
                <Skeleton width={80} height={20} borderRadius={4} />
                <Skeleton width={60} height={20} borderRadius={4} />
            </View>
            <Skeleton width="100%" height={20} borderRadius={4} style={{ marginBottom: 8 }} />
            <Skeleton width="60%" height={16} borderRadius={4} style={{ marginBottom: 12 }} />
            <View className="flex-row justify-between pt-2 border-t border-slate-50">
                <Skeleton width={100} height={14} borderRadius={4} />
                <Skeleton width={60} height={14} borderRadius={4} />
            </View>
        </View>
    );
}

// --- Tela Principal ---

export default function OcorrenciasScreen() {
    const { aluno, atualizarOcorrenciaPendente } = useAluno();
    const { showToast } = useAlert();
    const { user } = useAuth();

    const [listaOcorrencias, setListaOcorrencias] = useState<ListagemOcorrencia[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isSendingDados, setSendingDados] = useState(false);

    // Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [itemSelecionado, setItemSelecionado] = useState<ListagemOcorrencia | null>(null);

    const fetchDados = useCallback(async () => {
        if (!aluno) return;

        try {
            if (!refreshing) setIsLoading(true);

            const dados = await getOcorrencias(aluno.pes_cod, aluno.ano_selecionado!);
            setListaOcorrencias(dados || []);

        } catch (error) {
            console.error(error);
            showToast("Erro ao carregar ocorrências.", "error");
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [aluno, refreshing]);

    useFocusEffect(
        useCallback(() => {
            fetchDados();
        }, [aluno])
    );

    const onRefresh = () => {
        setRefreshing(true);
        setIsLoading(true); // Força skeleton
        fetchDados();
    };

    const handleOpenDetails = (item: ListagemOcorrencia) => {
        setItemSelecionado(item);
        setModalVisible(true);
    };

    const handleConfirmarCiencia = async (idOcorrencia: number) => {

        try {
            await postOcorrenciaCiente(idOcorrencia, Number(user?.usr_codigo));
            atualizarOcorrenciaPendente();
            showToast("Ocorrência atualizada com sucesso!", "success");
            await fetchDados();
        } catch {
            showToast("Ocorreu um erro ao tentar processar sua solicitação, tente novamente!", "error");
        }
    };

    return (
        <View className="flex-1 bg-slate-150">
            <Header title="Ocorrências Disciplinares" showBack={true} />
            <StatusBar style="dark" backgroundColor="transparent" translucent />
            <View className="flex-1">


                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingBottom: 40 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colors.edu.primary]}
                            tintColor={colors.edu.primary}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    <AlunoCard alunoAtual={aluno!} />

                    <View className="px-6 mt-4">
                        {/* Header da Lista */}
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-slate-800 font-bold text-lg">Histórico</Text>
                            <View className="bg-slate-200 px-3 py-1 rounded-full">
                                <Text className="text-slate-600 font-bold text-xs">
                                    {isLoading ? '...' : `${listaOcorrencias.length} registros`}
                                </Text>
                            </View>
                        </View>

                        {/* Lista */}
                        {isLoading ? (
                            <View className="space-y-3">
                                <OcorrenciaSkeleton />
                                <OcorrenciaSkeleton />
                                <OcorrenciaSkeleton />
                            </View>
                        ) : listaOcorrencias.length === 0 ? (
                            <View className="items-center justify-center py-10 opacity-50 bg-white rounded-2xl border border-slate-100 border-dashed">
                                <Feather name="thumbs-up" size={48} color="#94a3b8" />
                                <Text className="text-slate-500 text-sm mt-3 font-medium text-center px-10">
                                    Nenhuma ocorrência registrada para este aluno no período letivo.
                                </Text>
                            </View>
                        ) : (
                            listaOcorrencias.map((item) => (
                                <OcorrenciaCard
                                    key={item.ocorrencia_id}
                                    item={item}
                                    onPress={() => handleOpenDetails(item)}
                                />
                            ))
                        )}
                    </View>
                </ScrollView>
            </View>

            {/* Modal */}
            <OcorrenciaDetailModal
                visible={modalVisible}
                item={itemSelecionado}
                onClose={() => setModalVisible(false)}
                onConfirmarCiencia={handleConfirmarCiencia}
            />
        </View>
    );
}