import React, { use, useEffect, useState } from 'react';
import { View, ScrollView, Text, Modal, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { useAluno, Aluno } from '../../context/AlunoContext'
import { AlunoCard } from '../../components/AlunoCard';
import { getTiposSolicitacao, getSolicitacoes, deleteSolicitacao } from '../../services/solicitacoes/SolicitacaoService';
import { FormSelect } from '../../components/forms/FormSelect';
import Button from '../../components/forms/Button';
import { CadastroPortadores } from './portadores/CadastroPortadores';
import { AtualizacaoCadastral } from './documentos/AtualizacaoCadastal';
import { useAlert } from '../../context/AlertContext';
import { Skeleton } from '../../components/Skeleton';
import { SolicitacaoCard } from './SolicitacoesCards';

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

export default function SolicitacoesScreen() {
    const { aluno } = useAluno();
    const { showAlert, showToast, showConfirm, setLoading } = useAlert();
    const [tiposSolicitacao, setTiposSolicitacao] = useState<{ id: number; label: string }[]>([]);
    const [isLoadingTipos, setIsLoadingTipos] = useState<boolean>(false);
    const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
    const [isLoadingSolicitacoes, setIsLoadingSolicitacoes] = useState<boolean>(false);
    const [selectedTipo, setSelectedTipo] = useState<{ id: number; label: string } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFormSending, setIsFormSending] = useState(false);
    const [isInsertMode, setIsInsertMode] = useState<boolean>(true);
    const [selectedSolicitacao, setSelectedSolicitacao] = useState<any | null>(null);
    const FORM_COMPONENTS: { [key: number]: React.ForwardRefExoticComponent<any & React.RefAttributes<FormHandle>> } = {
        1: CadastroPortadores,
        2: AtualizacaoCadastral
    };
    const RenderedForm = selectedTipo ? FORM_COMPONENTS[selectedTipo.id] : null;


    const handleEdit = (item: any) => {
        setSelectedSolicitacao(item);
        setIsInsertMode(false);
        setIsModalOpen(true);
    };


    const handleDelete = async (id: number | string) => {
        showConfirm('Atenção', 'Tem certeza que deseja excluir esta solicitação?', async () => {
            try {
                setLoading(true, 'Excluindo solicitação...');
                await deleteSolicitacao(Number(id));
                showToast('Solicitação excluída com sucesso!', 'success');
                // Recaregar a lista de solicitações após a exclusãor
                if (selectedTipo) {
                    const result: any = await getSolicitacoes(selectedTipo.id);
                    setSolicitacoes(result);
                }
            } catch (error: any) {
                showToast(error[0]?.ErrorRetorno || 'Erro ao excluir a solicitação.', 'error');
            }
            finally {
                setLoading(false);
            }

        });
    };

    const formRef = React.useRef<FormHandle>(null);
    useEffect(() => {
        const buscarTipos = async () => {
            try {
                setIsLoadingTipos(true);
                const result = await getTiposSolicitacao();
                setTiposSolicitacao(result);

            } catch (error) {
                showAlert('Erro', 'Não foi possível carregar os tipos de solicitação.', 'error');
            } finally {
                setIsLoadingTipos(false);
            }

        }
        buscarTipos();
    }, []);
    const fetchSolicitacoes = React.useCallback(async () => {
        if (selectedTipo) {
            try {
                setIsLoadingSolicitacoes(true);
                const result: any = await getSolicitacoes(selectedTipo.id);
                setSolicitacoes(result);
            } catch (error) {
                showAlert('Erro', 'Não foi possível carregar as solicitações.', 'error');
            } finally {
                setIsLoadingSolicitacoes(false);
            }
        }
    }, [selectedTipo]);

    useEffect(() => {
        fetchSolicitacoes();
    }, [fetchSolicitacoes]);
    return (
        <View className="flex-1 bg-slate-150">
            <Header title="Solicitações" showBack={true} />
            <View className="flex-1">
                <View>
                    <AlunoCard alunoAtual={aluno!} />
                    <View className="px-4 mt-2 mb-2">
                        <View className='flex-row justify-between items-center mb-3'>
                            <Text className="text-lg font-bold text-slate-700">Minhas Solicitações</Text>
                            <Button
                                label='Nova'
                                size='small'
                                variant='success'
                                disabled={!selectedTipo}
                                onPress={() => { setSelectedSolicitacao(null); setIsInsertMode(true); setIsModalOpen(true); }}
                            />
                        </View>

                        <FormSelect
                            label="Tipo de Solicitação"
                            required={true}
                            options={tiposSolicitacao}
                            placeholder="Selecione o tipo"
                            value={selectedTipo}
                            onSelect={setSelectedTipo}
                            loading={isLoadingTipos}
                        />
                    </View>
                </View>

                <View className="flex-1 ">
                    {isLoadingSolicitacoes ? (<Skeleton width={'90%'} height={'100%'} borderRadius={16} style={{ alignContent: 'center', alignSelf: 'center', }} />) : (
                        <FlatList
                            data={solicitacoes} // Array de objetos que seguem a interface Solicitacao
                            keyExtractor={(item, index) => item.id ? String(item.id) : String(index)}

                            renderItem={({ item }) => <SolicitacaoCard item={item} onEdit={handleEdit} onDelete={handleDelete} />}
                            contentContainerStyle={{ paddingTop: 10, paddingBottom: 30 }}
                            showsVerticalScrollIndicator={false}
                            ListEmptyComponent={() => (
                                <View className="items-center mt-10">
                                    <Text className="text-slate-400">{tiposSolicitacao ? 'Selecione um tipo de solicitação.' : 'Nenhuma solicitação encontrada.'}</Text>
                                </View>
                            )}
                        />
                    )}
                </View>
                <Modal
                    visible={isModalOpen}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setIsModalOpen(false)}
                >
                    <View className="flex-1 justify-end bg-black/20">
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                            className="w-full"
                        >
                            <View className="bg-white p-4 rounded-t-3xl min-h-[450px] shadow-2xl">
                                <Text className="text-xl font-bold mb-4">{selectedTipo?.label}</Text>
                                <View className="flex-1">
                                    {RenderedForm ? (
                                        <RenderedForm
                                            insertMode={isInsertMode}
                                            ref={formRef}
                                            showAlert={showAlert}
                                            showToast={showToast}
                                            onLoading={setIsFormSending}
                                            onSucess={() => { setIsModalOpen(false); fetchSolicitacoes(); }}
                                            aluno={aluno}
                                            tipoSolicitacao={selectedTipo!.id}
                                            dadosSolicitacao={selectedSolicitacao}
                                        />
                                    ) : (
                                        <View className="flex-1 items-center justify-center px-6">
                                            <Text className="text-slate-400 text-center text-base">
                                                Funcionalidade em construção.{"\n"}Em breve disponível.
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <View className="flex-row gap-2 mt-4 pb-6">
                                    <View className="flex-1">
                                        <Button
                                            label="Cancelar"
                                            variant="secondary"
                                            onPress={() => setIsModalOpen(false)}
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Button
                                            label="Enviar"
                                            variant="success"
                                            loading={isFormSending}
                                            onPress={() => { formRef.current?.submit(); }}
                                        />
                                    </View>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </Modal>

            </View>
        </View>
    )
}