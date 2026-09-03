import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Image, RefreshControl, Dimensions, FlatList, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';

// Components & Services
import { Header } from '../../components/Header';
import { Skeleton } from '../../components/Skeleton';
import { colors } from '../../constants/colors';
import { useAluno } from '../../context/AlunoContext';
import { getMuralAvisos, ListagemAvisos } from '../../services/mural/MuralAvisoService';

// --- Utils (Helpers) ---
const removerTagsHtml = (htmlString?: string): string => {
    if (!htmlString) return '';
    return htmlString.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
};

const criarData = (dataString: string): Date => {
    const dataSegura = dataString ? dataString.replace(' ', 'T') : new Date().toISOString();
    return new Date(dataSegura);
};

const formatarDataExibicao = (dataString: string): string => {
    const data = criarData(dataString);
    return `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth() + 1).toString().padStart(2, '0')}/${data.getFullYear()} às ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}`;
};

const isNovo = (dataString: string): boolean => {
    const diffMs = new Date().getTime() - criarData(dataString).getTime();
    return (diffMs / (1000 * 60 * 60)) < 48;
};

const getImageSource = (base64String: string | null) => {
    if (!base64String) return null;
    return { uri: base64String.startsWith('data:') ? base64String : `data:image/jpeg;base64,${base64String}` };
};

// --- Sub-Components ---

function SearchBar({ value, onChange, onClear }: { value: string, onChange: (text: string) => void, onClear: () => void }) {
    return (
        <View className="px-6 mb-2 mt-6">
            <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-4 h-12 shadow-sm">
                <Feather name="search" size={20} color="#94a3b8" />
                <TextInput
                    placeholder="Buscar avisos..."
                    placeholderTextColor="#94a3b8"
                    className="flex-1 ml-2 text-slate-700"
                    value={value}
                    onChangeText={onChange}
                />
                {value.length > 0 && (
                    <TouchableOpacity onPress={onClear}>
                        <Feather name="x" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

function NoticeCard({ item, onPress }: { item: ListagemAvisos, onPress: (item: ListagemAvisos) => void }) {
    const ehNovo = isNovo(item.data_cadastro);
    const imageSource = getImageSource(item.imagem);

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onPress(item)}
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-4 mx-6"
        >
            <View className="flex-row">
                <View className="flex-1 pr-2">
                    <View className="flex-row items-center mb-2 flex-wrap">
                        {ehNovo && (
                            <View className="bg-yellow-100 px-2 py-0.5 rounded mr-2 mb-1">
                                <Text className="text-yellow-700 text-[10px] font-bold">NOVO</Text>
                            </View>
                        )}
                        <Text className="text-slate-400 text-[10px]">
                            {formatarDataExibicao(item.data_cadastro)}
                        </Text>
                    </View>
                    <Text className="text-slate-800 font-bold text-base mb-1" numberOfLines={2}>{item.titulo}</Text>
                    <Text className="text-slate-500 text-xs leading-4" numberOfLines={3}>{removerTagsHtml(item.descricao)}</Text>
                    <Text className="text-blue-500 text-xs font-bold mt-2">Ler mais...</Text>
                </View>
                {imageSource && (
                    <View className="w-20 h-20 bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                        <Image source={imageSource} className="w-full h-full" resizeMode="cover" />
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

function NoticeSkeleton() {
    return (
        <View className="px-6 space-y-4 pt-4">
            {[1, 2, 3].map((key) => (
                <View key={key} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex-row">
                    <View className="flex-1 mr-3 space-y-2">
                        <Skeleton width="40%" height={12} borderRadius={4} />
                        <Skeleton width="90%" height={18} borderRadius={4} />
                        <Skeleton width="100%" height={12} borderRadius={4} />
                        <Skeleton width="80%" height={12} borderRadius={4} />
                    </View>
                    <Skeleton width={80} height={80} borderRadius={12} />
                </View>
            ))}
        </View>
    );
}

function NoticeDetailModal({ visible, aviso, onClose, onZoom }: { visible: boolean, aviso: ListagemAvisos | null, onClose: () => void, onZoom: () => void }) {
    if (!aviso) return null;
    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose} statusBarTranslucent={true}>
            <View className="flex-1 bg-black/60 justify-center items-center relative">
                <View className="bg-white w-[90%] max-h-[85%] rounded-3xl overflow-hidden shadow-2xl">
                    <View className="absolute top-4 right-4 z-10">
                        <TouchableOpacity onPress={onClose} className="w-10 h-10 bg-black/50 rounded-full items-center justify-center">
                            <Ionicons name="close" size={24} color="white" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                        {aviso.imagem && (
                            <TouchableOpacity activeOpacity={0.9} onPress={onZoom} className="bg-slate-900 w-full h-64 items-center justify-center">
                                <Image source={getImageSource(aviso.imagem)!} className="w-full h-full" resizeMode="contain" />
                                <View className="absolute bottom-2 right-2 bg-black/50 px-2 py-1 rounded-md flex-row items-center">
                                    <Feather name="maximize-2" size={12} color="white" />
                                    <Text className="text-white text-[10px] ml-1">Ampliar</Text>
                                </View>
                            </TouchableOpacity>
                        )}

                        <View className="p-6">
                            <View className="flex-row items-center mb-3">
                                {isNovo(aviso.data_cadastro) && (
                                    <View className="bg-yellow-100 px-3 py-1 rounded-md mr-3">
                                        <Text className="text-yellow-700 text-xs font-bold">NOVO</Text>
                                    </View>
                                )}
                                <Text className="text-slate-400 text-sm">{formatarDataExibicao(aviso.data_cadastro)}</Text>
                            </View>
                            <Text className="text-slate-800 text-xl font-bold mb-4 leading-tight">{aviso.titulo}</Text>
                            <View className="h-[1px] bg-slate-100 w-full mb-4" />
                            <Text className="text-slate-600 text-base leading-7 text-justify">{removerTagsHtml(aviso.descricao)}</Text>
                        </View>
                    </ScrollView>

                    <View className="p-4 border-t border-slate-100">
                        <TouchableOpacity onPress={onClose} className="w-full bg-slate-100 py-3 rounded-xl items-center">
                            <Text className="text-slate-700 font-bold">Fechar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function ImageZoomModal({ visible, imageBase64, onClose }: { visible: boolean, imageBase64?: string, onClose: () => void }) {
    if (!imageBase64) return null;
    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose} statusBarTranslucent={true}>
            <View className="flex-1 bg-black pt-6">
                <SafeAreaView className="flex-1 relative">
                    <TouchableOpacity onPress={onClose} className="absolute top-4 right-4 z-50 w-12 h-12 bg-neutral-800/80 rounded-full items-center justify-center border border-neutral-700">
                        <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>
                    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} maximumZoomScale={3} minimumZoomScale={1} centerContent={true}>
                        <Image source={getImageSource(imageBase64)!} style={{ width: Dimensions.get('window').width, height: Dimensions.get('window').height }} resizeMode="contain" />
                    </ScrollView>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

// --- Main Screen ---

export default function MuralAvisosScreen() {
    const { aluno } = useAluno();

    // States
    const [isLoading, setIsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [listaAvisos, setListaAvisos] = useState<ListagemAvisos[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [searchText, setSearchText] = useState('');

    // Modal States
    const [modalVisible, setModalVisible] = useState(false);
    const [zoomVisible, setZoomVisible] = useState(false);
    const [avisoSelecionado, setAvisoSelecionado] = useState<ListagemAvisos | null>(null);

    // Logic
    const fetchAvisos = useCallback(async () => {
        if (!aluno?.escola_cod) return;
        if (!refreshing) setIsLoading(true);
        setError(null);
        try {
            const result = await getMuralAvisos(aluno.escola_cod, aluno.pes_cod);
            if (result) setListaAvisos(result);
        } catch (err) {
            console.error(err);
            setError('Não foi possível carregar os avisos.');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [aluno, refreshing]);

    useEffect(() => { fetchAvisos(); }, [aluno]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAvisos();
    };

    const avisosFiltrados = useMemo(() => {
        if (!searchText) return listaAvisos;
        const lowerSearch = searchText.toLowerCase();
        return listaAvisos.filter(item =>
            item.titulo.toLowerCase().includes(lowerSearch) ||
            removerTagsHtml(item.descricao).toLowerCase().includes(lowerSearch)
        );
    }, [listaAvisos, searchText]);

    const handleOpenAviso = (item: ListagemAvisos) => {
        setAvisoSelecionado(item);
        setZoomVisible(false); // Garante que o zoom comece fechado
        setModalVisible(true);
    };

    return (
        <View className="flex-1 bg-slate-150">
            <Header title="Mural de Avisos" showBack={true} />

            <SearchBar value={searchText} onChange={setSearchText} onClear={() => setSearchText('')} />

            {isLoading && !refreshing ? (
                <NoticeSkeleton />
            ) : (
                <FlatList
                    data={avisosFiltrados}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => <NoticeCard item={item} onPress={handleOpenAviso} />}
                    contentContainerStyle={{ paddingBottom: 40, paddingTop: 10 }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View className="items-center justify-center py-10 opacity-50">
                            <Feather name="inbox" size={40} color="#94a3b8" />
                            <Text className="text-slate-500 text-sm mt-2">
                                {searchText ? "Nenhum aviso encontrado para sua busca." : "Nenhum aviso no mural."}
                            </Text>
                        </View>
                    }
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.edu.dark]} />
                    }
                />
            )}

            <NoticeDetailModal
                visible={modalVisible && !zoomVisible}
                aviso={avisoSelecionado}
                onClose={() => setModalVisible(false)}
                onZoom={() => setZoomVisible(true)}
            />

            <ImageZoomModal
                visible={zoomVisible}
                imageBase64={avisoSelecionado?.imagem}
                onClose={() => setZoomVisible(false)}
            />
        </View>
    );
}