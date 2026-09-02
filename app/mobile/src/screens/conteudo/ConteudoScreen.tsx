import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, TextInput, Platform } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Services & Context
import { getConteudos, ListagemConteudo } from '../../services/conteudo/ConteudoService';
import { useAluno } from '../../context/AlunoContext';
import { useAlert } from '../../context/AlertContext';

// Components
import { Header } from '../../components/Header';
import { AlunoCard } from '../../components/AlunoCard';
import { Skeleton } from '../../components/Skeleton';
import { colors } from '../../constants/colors';
import { formatarDataBR } from '../../util/FormatDate';

// --- Sub-Components ---

// 1. Componente do Card da Lista
function ContentCard({ item, onPress }: { item: ListagemConteudo, onPress: () => void }) {
    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-4 overflow-hidden"
        >
            <View className="flex-row">
                <View className="w-1.5 bg-blue-500" />
                <View className="flex-1 p-4">
                    <View className="flex-row justify-between items-start mb-2">
                        <View className="bg-blue-50 px-2 py-1 rounded-md self-start border border-blue-100">
                            <Text className="text-blue-700 text-[10px] font-bold uppercase tracking-wide">
                                {item.disciplina || 'Geral'}
                            </Text>
                        </View>
                    </View>
                    <Text className="text-slate-800 font-bold text-lg mb-2 leading-tight">
                        {item.tema}
                    </Text>
                    <View className="flex-row items-center mb-3">
                        <Feather name="calendar" size={14} color="#64748b" />
                        <Text className="text-slate-500 text-xs ml-1.5 font-medium">
                            {formatarDataBR(item.data_inicio)}
                            {item.data_fim ? `  até  ${formatarDataBR(item.data_fim)}` : ''}
                        </Text>
                    </View>
                    <View className="flex-row items-center justify-end mt-1">
                        <Text className="text-blue-600 text-xs font-bold mr-1">Ver detalhes</Text>
                        <Feather name="arrow-right" size={14} color="#2563eb" />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

// 2. Componente de Filtro de Texto (SearchBar)
function SearchFilter({ value, onChangeText, onClear }: { value: string, onChangeText: (text: string) => void, onClear: () => void }) {
    return (
        <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-4 h-12 shadow-sm mb-4">
            <Feather name="search" size={20} color="#94a3b8" />
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder="Buscar por tema ou disciplina..."
                placeholderTextColor="#cbd5e1"
                className="flex-1 ml-3 text-slate-700 text-base font-medium"
                autoCapitalize="none"
                autoCorrect={false}
            />
            {value.length > 0 && (
                <TouchableOpacity onPress={onClear} className="p-1">
                    <Feather name="x-circle" size={18} color="#cbd5e1" />
                </TouchableOpacity>
            )}
        </View>
    );
}

// 3. Modal de Detalhes
function ContentDetailModal({ visible, item, onClose }: { visible: boolean, item: ListagemConteudo | null, onClose: () => void }) {
    const insets = useSafeAreaInsets();
    if (!item) return null;

    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose} statusBarTranslucent>
            <View className="flex-1 bg-black/60 justify-end">
                <View className="bg-white w-full rounded-t-3xl h-[85%] overflow-hidden shadow-2xl" style={{ paddingBottom: insets.bottom }}>
                    <View className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex-row justify-between items-center">
                        <View className="flex-1 pr-4">
                            <Text className="text-slate-400 text-xs uppercase font-bold mb-1">Detalhes do Conteúdo</Text>
                            <Text className="text-slate-800 font-bold text-lg" numberOfLines={1}>{item.disciplina}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} className="w-8 h-8 bg-white border border-slate-200 rounded-full items-center justify-center">
                            <Ionicons name="close" size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                        <View className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6 flex-row items-center justify-between">
                            <View>
                                <Text className="text-blue-400 text-[10px] uppercase font-bold mb-1">Data Início</Text>
                                <Text className="text-blue-800 font-bold text-sm">{formatarDataBR(item.data_inicio)}</Text>
                            </View>
                            <View className="h-8 w-[1px] bg-blue-200 mx-4" />
                            <View>
                                <Text className="text-blue-400 text-[10px] uppercase font-bold mb-1">Data Fim</Text>
                                <Text className="text-blue-800 font-bold text-sm">{formatarDataBR(item.data_fim)}</Text>
                            </View>
                            <View className="flex-1 items-end justify-center">
                                <Feather name="clock" size={24} color="#93C5FD" />
                            </View>
                        </View>

                        <Text className="text-slate-800 text-2xl font-bold mb-6 leading-tight">{item.tema}</Text>

                        <View className="mb-6">
                            <Text className="text-slate-400 text-xs font-bold uppercase mb-2 flex-row items-center">
                                <Feather name="book-open" size={12} />  Conteúdo Programático
                            </Text>
                            <Text className="text-slate-600 text-base leading-7 text-justify">
                                {item.conteudo}
                            </Text>
                        </View>

                        {item.desenvolvimento && <View className="h-[1px] bg-slate-100 w-full mb-6" />}

                        {item.desenvolvimento && (
                            <View>
                                <Text className="text-slate-400 text-xs font-bold uppercase mb-2 flex-row items-center">
                                    <Feather name="align-left" size={12} />  Observações / Desenvolvimento
                                </Text>
                                <View className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <Text className="text-slate-600 text-sm leading-6 italic">
                                        {item.desenvolvimento}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    <View className="p-4 border-t border-slate-100 bg-white">
                        <TouchableOpacity onPress={onClose} className="w-full bg-blue-600 py-3.5 rounded-xl items-center shadow-lg shadow-blue-300">
                            <Text className="text-white font-bold text-base">Fechar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// 4. Skeleton
function SkeletonContent() {
    return (
        <View className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-4">
            <View className="flex-row justify-between mb-4">
                <Skeleton width={80} height={20} borderRadius={6} />
            </View>
            <Skeleton width="90%" height={24} borderRadius={4} style={{ marginBottom: 12 }} />
            <Skeleton width="60%" height={16} borderRadius={4} style={{ marginBottom: 16 }} />
            <View className="flex-row justify-end">
                <Skeleton width={80} height={14} borderRadius={4} />
            </View>
        </View>
    );
}

// --- Main Screen ---

export default function ConteudoScreen() {
    const { aluno } = useAluno();
    const { showToast } = useAlert();

    // Estado de Dados
    const [listaTotal, setListaTotal] = useState<ListagemConteudo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Estado de Filtro e Modal
    const [searchText, setSearchText] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [conteudoSelecionado, setConteudoSelecionado] = useState<ListagemConteudo | null>(null);

    // Busca de Dados
    const fetchConteudos = useCallback(async () => {
        if (!aluno) return;
        try {
            setIsLoading(true);
            const dados = await getConteudos(aluno.pes_cod, aluno.ano_selecionado!);
            setListaTotal(dados || []);
        } catch (error) {
            console.error(error);
            showToast("Não foi possível carregar os conteúdos.", "error");
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [aluno]);

    useEffect(() => {
        fetchConteudos();
    }, [fetchConteudos]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchConteudos();
    };

    // Nova Lógica de Filtro por Texto
    const conteudosFiltrados = useMemo(() => {
        if (!searchText) return listaTotal;

        const termo = searchText.toLowerCase();
        
        return listaTotal.filter(item => 
            (item.tema && item.tema.toLowerCase().includes(termo)) ||
            (item.disciplina && item.disciplina.toLowerCase().includes(termo))
        );
    }, [listaTotal, searchText]);

    const handleOpenDetails = (item: ListagemConteudo) => {
        setConteudoSelecionado(item);
        setModalVisible(true);
    };

    return (
        <View className="flex-1 bg-slate-150">
            <Header title="Conteúdos Programáticos" showBack={true} />
            <StatusBar style="dark" backgroundColor="transparent" translucent />
            
            <View className="flex-1">
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingBottom: 40 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.edu.primary]} tintColor={colors.edu.primary} />
                    }
                    keyboardShouldPersistTaps="handled" // Importante para fechar teclado ao clicar fora
                    showsVerticalScrollIndicator={false}
                >
                    <AlunoCard alunoAtual={aluno!} />

                    <View className="px-6 mt-4">
                        
                        {/* Filtro de Texto */}
                        <Text className="text-slate-800 font-bold text-lg mb-2">Buscar</Text>
                        <SearchFilter 
                            value={searchText} 
                            onChangeText={setSearchText} 
                            onClear={() => setSearchText('')} 
                        />

                        {/* Título da Lista + Contador */}
                        <View className="flex-row justify-between items-center mb-4 mt-2">
                            <Text className="text-slate-800 font-bold text-lg">Cronograma</Text>
                            <View className="bg-blue-100 px-3 py-1 rounded-full">
                                <Text className="text-blue-700 font-bold text-xs">
                                    {isLoading ? '...' : `${conteudosFiltrados.length} itens`}
                                </Text>
                            </View>
                        </View>

                        {/* Lista ou Loading */}
                        {isLoading ? (
                            <View className="space-y-3">
                                <SkeletonContent /><SkeletonContent /><SkeletonContent />
                            </View>
                        ) : conteudosFiltrados.length === 0 ? (
                            <View className="items-center justify-center py-10 opacity-50 bg-white rounded-2xl border border-slate-100 border-dashed">
                                <Feather name="search" size={48} color="#94a3b8" />
                                <Text className="text-slate-500 text-sm mt-3 font-medium text-center px-10">
                                    {searchText 
                                        ? "Nenhum conteúdo encontrado para esta busca." 
                                        : "Nenhum conteúdo registrado."}
                                </Text>
                            </View>
                        ) : (
                            conteudosFiltrados.map((item) => (
                                <ContentCard key={item.id} item={item} onPress={() => handleOpenDetails(item)} />
                            ))
                        )}
                    </View>
                </ScrollView>
            </View>

            <ContentDetailModal 
                visible={modalVisible} 
                item={conteudoSelecionado} 
                onClose={() => setModalVisible(false)} 
            />
        </View>
    );
}