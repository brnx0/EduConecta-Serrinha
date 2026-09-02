import React, { useEffect, useState } from 'react';
import { View, Text, Modal, KeyboardAvoidingView, Platform, FlatList, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { useAluno, Aluno } from '../../context/AlunoContext';
import {
    getTiposSolicitacao,
    getSolicitacoes,
    deleteSolicitacao,
} from '../../services/solicitacoes/SolicitacaoService';
import { FormSelect } from '../../components/forms/FormSelect';
import Button from '../../components/forms/Button';
import { CadastroPortadores } from './portadores/CadastroPortadores';
import { AtualizacaoCadastral } from './documentos/AtualizacaoCadastal';
import { useAlert } from '../../context/AlertContext';
import { Skeleton } from '../../components/Skeleton';
import { SolicitacaoCard } from './SolicitacoesCards';
import { colors } from '../../constants/colors';

export interface FormHandle {
    submit: () => void;
    formIsSend?: boolean;
}
export interface FormProps {
    showAlert: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    onLoading?: (isLoading: boolean) => void;
    onSucess?: () => void;
    insertMode: boolean;
    aluno: Aluno | null;
    tipoSolicitacao: number;
    dadosSolicitacao?: any;
}

/**
 * SolicitacoesScreen Élo — feed de solicitações com filtro de tipo
 * + FAB pílula laranja pra criar nova. Modal slide-up pra forms.
 */
export default function SolicitacoesScreen() {
    const { aluno } = useAluno();
    const { showAlert, showToast, showConfirm, setLoading } = useAlert();
    const [tipos, setTipos] = useState<{ id: number; label: string }[]>([]);
    const [isLoadingTipos, setIsLoadingTipos] = useState(false);
    const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
    const [isLoadingSol, setIsLoadingSol] = useState(false);
    const [selectedTipo, setSelectedTipo] = useState<{ id: number; label: string } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFormSending, setIsFormSending] = useState(false);
    const [isInsertMode, setIsInsertMode] = useState(true);
    const [selectedSolicitacao, setSelectedSolicitacao] = useState<any | null>(null);

    const FORMS: { [key: number]: React.ForwardRefExoticComponent<any & React.RefAttributes<FormHandle>> } = {
        1: CadastroPortadores,
        2: AtualizacaoCadastral,
    };
    const RenderedForm = selectedTipo ? FORMS[selectedTipo.id] : null;
    const formRef = React.useRef<FormHandle>(null);

    useEffect(() => {
        const buscarTipos = async () => {
            try {
                setIsLoadingTipos(true);
                const result = await getTiposSolicitacao();
                setTipos(result);
            } catch {
                showAlert('Erro', 'Não foi possível carregar os tipos.', 'error');
            } finally {
                setIsLoadingTipos(false);
            }
        };
        buscarTipos();
    }, []);

    const fetchSolicitacoes = React.useCallback(async () => {
        if (!selectedTipo) return;
        try {
            setIsLoadingSol(true);
            const result: any = await getSolicitacoes(selectedTipo.id);
            setSolicitacoes(result);
        } catch {
            showAlert('Erro', 'Não foi possível carregar.', 'error');
        } finally {
            setIsLoadingSol(false);
        }
    }, [selectedTipo]);

    useEffect(() => { fetchSolicitacoes(); }, [fetchSolicitacoes]);

    const handleEdit = (item: any) => {
        setSelectedSolicitacao(item);
        setIsInsertMode(false);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number | string) => {
        showConfirm('Excluir solicitação?', 'Esta ação não pode ser desfeita.', async () => {
            try {
                setLoading(true, 'Excluindo...');
                await deleteSolicitacao(Number(id));
                showToast('Solicitação excluída!', 'success');
                if (selectedTipo) {
                    const result: any = await getSolicitacoes(selectedTipo.id);
                    setSolicitacoes(result);
                }
            } catch (error: any) {
                showToast(error.message || 'Erro ao excluir.', 'error');
            } finally {
                setLoading(false);
            }
        });
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.paper }}>
            <Header title="Solicitações" />

            <View style={{ paddingHorizontal: 18, paddingTop: 18 }}>
                <FormSelect
                    label="Tipo de solicitação"
                    required
                    options={tipos}
                    placeholder="Escolha um tipo"
                    value={selectedTipo}
                    onSelect={setSelectedTipo}
                    loading={isLoadingTipos}
                />
            </View>

            {selectedTipo ? (
                <View style={{ flex: 1 }}>
                    <View
                        style={{
                            paddingHorizontal: 18,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 8,
                        }}
                    >
                        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 18, color: colors.ink, letterSpacing: -0.5 }}>
                            Suas solicitações
                        </Text>
                        <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 12, color: colors.inkSoft }}>
                            {isLoadingSol ? '...' : `${solicitacoes.length} item${solicitacoes.length === 1 ? '' : 's'}`}
                        </Text>
                    </View>

                    <FlatList
                        data={isLoadingSol ? [] : solicitacoes}
                        keyExtractor={(item, idx) => (item.id ? String(item.id) : String(idx))}
                        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                        contentContainerStyle={{ paddingBottom: 160 }}
                        renderItem={({ item }) => (
                            <SolicitacaoCard item={item} onEdit={handleEdit} onDelete={handleDelete} />
                        )}
                        ListEmptyComponent={
                            isLoadingSol ? (
                                <View style={{ paddingHorizontal: 18, gap: 10 }}>
                                    <Skeleton width="100%" height={140} borderRadius={22} />
                                    <Skeleton width="100%" height={140} borderRadius={22} />
                                </View>
                            ) : (
                                <Empty />
                            )
                        }
                    />
                </View>
            ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
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
                        <Feather name="file-text" size={32} color={colors.brand.primary} />
                    </View>
                    <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 17, color: colors.ink }}>
                        Escolha um tipo
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
                        Selecione acima pra ver suas solicitações.
                    </Text>
                </View>
            )}

            {/* FAB criar */}
            {selectedTipo && (
                <TouchableOpacity
                    onPress={() => {
                        setSelectedSolicitacao(null);
                        setIsInsertMode(true);
                        setIsModalOpen(true);
                    }}
                    activeOpacity={0.85}
                    style={{
                        position: 'absolute',
                        right: 18,
                        bottom: 100,
                        backgroundColor: colors.brand.primary,
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 18,
                        paddingVertical: 14,
                        borderRadius: 999,
                        elevation: 8,
                        shadowColor: colors.brand.primary,
                        shadowOpacity: 0.4,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 6 },
                    }}
                >
                    <Feather name="plus" size={18} color="#FFFFFF" />
                    <Text
                        style={{
                            color: '#FFFFFF',
                            fontFamily: 'Outfit_700Bold',
                            fontSize: 14,
                            marginLeft: 6,
                        }}
                    >
                        Nova
                    </Text>
                </TouchableOpacity>
            )}

            {/* Modal formulário */}
            <Modal visible={isModalOpen} transparent animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setIsModalOpen(false)} activeOpacity={1} />
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                        <View
                            style={{
                                backgroundColor: colors.paper,
                                borderTopLeftRadius: 32,
                                borderTopRightRadius: 32,
                                padding: 20,
                                minHeight: 480,
                                maxHeight: '90%',
                            }}
                        >
                            <View style={{ width: 48, height: 4, backgroundColor: colors.hairline, borderRadius: 999, alignSelf: 'center', marginBottom: 16 }} />

                            <Text
                                style={{
                                    fontFamily: 'Outfit_500Medium',
                                    fontSize: 11,
                                    color: colors.inkSoft,
                                    letterSpacing: 1,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {isInsertMode ? 'Nova' : 'Editar'} solicitação
                            </Text>
                            <Text
                                style={{
                                    fontFamily: 'Outfit_700Bold',
                                    fontSize: 22,
                                    color: colors.ink,
                                    letterSpacing: -0.6,
                                    marginTop: 2,
                                    marginBottom: 16,
                                }}
                            >
                                {selectedTipo?.label}
                            </Text>

                            <View style={{ flex: 1 }}>
                                {RenderedForm ? (
                                    <RenderedForm
                                        insertMode={isInsertMode}
                                        ref={formRef}
                                        showAlert={showAlert}
                                        showToast={showToast}
                                        onLoading={setIsFormSending}
                                        onSucess={() => {
                                            setIsModalOpen(false);
                                            fetchSolicitacoes();
                                        }}
                                        aluno={aluno}
                                        tipoSolicitacao={selectedTipo!.id}
                                        dadosSolicitacao={selectedSolicitacao}
                                    />
                                ) : (
                                    <Text>Carregando...</Text>
                                )}
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                                <View style={{ flex: 1 }}>
                                    <Button
                                        label="Cancelar"
                                        variant="secondary"
                                        onPress={() => setIsModalOpen(false)}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Button
                                        label="Enviar"
                                        variant="primary"
                                        loading={isFormSending}
                                        onPress={() => formRef.current?.submit()}
                                    />
                                </View>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
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
                    width: 72,
                    height: 72,
                    borderRadius: 24,
                    backgroundColor: colors.paperWarm,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 14,
                }}
            >
                <Feather name="inbox" size={28} color={colors.inkSoft} />
            </View>
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 16, color: colors.ink }}>
                Sem solicitações
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
                Toque em "Nova" pra criar.
            </Text>
        </View>
    );
}
