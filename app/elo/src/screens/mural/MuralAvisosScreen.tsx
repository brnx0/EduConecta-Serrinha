import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Modal,
    Image,
    RefreshControl,
    Dimensions,
    FlatList,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { Skeleton } from '../../components/Skeleton';
import { colors } from '../../constants/colors';
import { useAluno } from '../../context/AlunoContext';
import { getMuralAvisos, ListagemAvisos } from '../../services/mural/MuralAvisoService';

const removerTagsHtml = (s?: string) => (s ?? '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
const criarData = (s: string) => new Date(s ? s.replace(' ', 'T') : new Date().toISOString());
const isNovo = (s: string) => (Date.now() - criarData(s).getTime()) / (1000 * 60 * 60) < 48;
const formatarData = (s: string) => {
    const d = criarData(s);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const getImageSource = (b64: string | null) =>
    b64 ? { uri: b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}` } : null;

/**
 * MuralAvisosScreen Élo — feed estilo magazine.
 *
 * Hero card destaca aviso mais recente (com imagem se houver).
 * Restante em cards alternados (com/sem imagem) com tipografia editorial.
 * Search bar com radius 999, modal detalhe com hero image.
 */
export default function MuralAvisosScreen() {
    const { aluno } = useAluno();
    const [isLoading, setIsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [listaAvisos, setListaAvisos] = useState<ListagemAvisos[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [searchText, setSearchText] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [zoomVisible, setZoomVisible] = useState(false);
    const [avisoSelecionado, setAvisoSelecionado] = useState<ListagemAvisos | null>(null);

    const fetchAvisos = useCallback(async () => {
        if (!aluno?.escola_cod) return;
        if (!refreshing) setIsLoading(true);
        setError(null);
        try {
            const result = await getMuralAvisos(aluno.escola_cod, aluno.pes_cod);
            if (result) setListaAvisos(result);
        } catch {
            setError('Não foi possível carregar os avisos.');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [aluno, refreshing]);

    useEffect(() => { fetchAvisos(); }, [aluno]);

    const avisosFiltrados = useMemo(() => {
        if (!searchText) return listaAvisos;
        const q = searchText.toLowerCase();
        return listaAvisos.filter(
            (i) =>
                i.titulo.toLowerCase().includes(q) ||
                removerTagsHtml(i.descricao).toLowerCase().includes(q)
        );
    }, [listaAvisos, searchText]);

    const [destaque, ...resto] = avisosFiltrados;

    const handleOpen = (item: ListagemAvisos) => {
        setAvisoSelecionado(item);
        setZoomVisible(false);
        setModalVisible(true);
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.paper }}>
            <Header title="Mural" />

            {/* Search bar */}
            <View style={{ paddingHorizontal: 18, paddingTop: 18 }}>
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#FFFFFF',
                        borderRadius: 999,
                        paddingHorizontal: 16,
                        height: 50,
                        borderWidth: 1,
                        borderColor: colors.hairline,
                    }}
                >
                    <Feather name="search" size={18} color={colors.inkSoft} />
                    <TextInput
                        placeholder="Buscar avisos..."
                        placeholderTextColor="#94A3B8"
                        value={searchText}
                        onChangeText={setSearchText}
                        style={{
                            flex: 1,
                            marginLeft: 10,
                            fontFamily: 'Outfit_500Medium',
                            fontSize: 14,
                            color: colors.ink,
                        }}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchText('')}>
                            <Feather name="x" size={16} color={colors.inkSoft} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {isLoading && !refreshing ? (
                <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18 }}>
                    <Skeleton width="100%" height={220} borderRadius={28} />
                    <View style={{ height: 14 }} />
                    <Skeleton width="100%" height={130} borderRadius={22} />
                    <View style={{ height: 14 }} />
                    <Skeleton width="100%" height={130} borderRadius={22} />
                </ScrollView>
            ) : error ? (
                <View style={{ padding: 18 }}>
                    <ErrorState onRetry={fetchAvisos} />
                </View>
            ) : avisosFiltrados.length === 0 ? (
                <Empty searchText={searchText} />
            ) : (
                <FlatList
                    data={resto}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 140 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                fetchAvisos();
                            }}
                            colors={[colors.brand.primary]}
                            tintColor={colors.brand.primary}
                        />
                    }
                    ListHeaderComponent={destaque ? <DestaqueCard item={destaque} onPress={handleOpen} /> : null}
                    ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                    renderItem={({ item }) => <NoticeCard item={item} onPress={handleOpen} />}
                />
            )}

            {/* Detalhe modal */}
            <Modal
                visible={modalVisible && !zoomVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setModalVisible(false)} activeOpacity={1} />
                    <View
                        style={{
                            backgroundColor: colors.paper,
                            borderTopLeftRadius: 32,
                            borderTopRightRadius: 32,
                            maxHeight: '88%',
                            overflow: 'hidden',
                        }}
                    >
                        {avisoSelecionado && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {avisoSelecionado.imagem && (
                                    <TouchableOpacity activeOpacity={0.9} onPress={() => setZoomVisible(true)}>
                                        <Image
                                            source={getImageSource(avisoSelecionado.imagem)!}
                                            style={{ width: '100%', height: 240 }}
                                            resizeMode="cover"
                                        />
                                        <View
                                            style={{
                                                position: 'absolute',
                                                bottom: 12,
                                                right: 12,
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                backgroundColor: 'rgba(0,0,0,0.6)',
                                                paddingHorizontal: 10,
                                                paddingVertical: 6,
                                                borderRadius: 999,
                                            }}
                                        >
                                            <Feather name="maximize-2" size={12} color="#FFFFFF" />
                                            <Text
                                                style={{
                                                    color: '#FFFFFF',
                                                    marginLeft: 6,
                                                    fontFamily: 'Outfit_500Medium',
                                                    fontSize: 11,
                                                }}
                                            >
                                                Ampliar
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                <View style={{ padding: 24 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                        {isNovo(avisoSelecionado.data_cadastro) && (
                                            <View
                                                style={{
                                                    backgroundColor: colors.brand.accent,
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 3,
                                                    borderRadius: 999,
                                                    marginRight: 8,
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        color: colors.ink,
                                                        fontFamily: 'Outfit_700Bold',
                                                        fontSize: 9,
                                                        letterSpacing: 0.5,
                                                    }}
                                                >
                                                    NOVO
                                                </Text>
                                            </View>
                                        )}
                                        <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 11, color: colors.inkSoft }}>
                                            {formatarData(avisoSelecionado.data_cadastro)}
                                        </Text>
                                    </View>
                                    <Text
                                        style={{
                                            fontFamily: 'Outfit_700Bold',
                                            fontSize: 24,
                                            color: colors.ink,
                                            letterSpacing: -0.8,
                                            lineHeight: 28,
                                        }}
                                    >
                                        {avisoSelecionado.titulo}
                                    </Text>
                                    <View
                                        style={{
                                            height: 1,
                                            backgroundColor: colors.hairline,
                                            marginVertical: 16,
                                        }}
                                    />
                                    <Text
                                        style={{
                                            fontFamily: 'Outfit_400Regular',
                                            fontSize: 15,
                                            color: colors.ink,
                                            lineHeight: 24,
                                        }}
                                    >
                                        {removerTagsHtml(avisoSelecionado.descricao)}
                                    </Text>
                                </View>
                            </ScrollView>
                        )}
                        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.hairline }}>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
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
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Zoom */}
            <Modal visible={zoomVisible} transparent animationType="fade" onRequestClose={() => setZoomVisible(false)} statusBarTranslucent>
                <View style={{ flex: 1, backgroundColor: '#000' }}>
                    <SafeAreaView style={{ flex: 1, position: 'relative' }}>
                        <TouchableOpacity
                            onPress={() => setZoomVisible(false)}
                            style={{
                                position: 'absolute',
                                top: 16,
                                right: 16,
                                zIndex: 50,
                                width: 44,
                                height: 44,
                                borderRadius: 22,
                                backgroundColor: 'rgba(255,255,255,0.15)',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Feather name="x" size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                        <ScrollView
                            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                            maximumZoomScale={3}
                            minimumZoomScale={1}
                            centerContent
                        >
                            {avisoSelecionado?.imagem && (
                                <Image
                                    source={getImageSource(avisoSelecionado.imagem)!}
                                    style={{
                                        width: Dimensions.get('window').width,
                                        height: Dimensions.get('window').height,
                                    }}
                                    resizeMode="contain"
                                />
                            )}
                        </ScrollView>
                    </SafeAreaView>
                </View>
            </Modal>
        </View>
    );
}

// ─── Cards ──────────────────────────────────────────────────────

function DestaqueCard({ item, onPress }: { item: ListagemAvisos; onPress: (i: ListagemAvisos) => void }) {
    const ehNovo = isNovo(item.data_cadastro);
    const img = getImageSource(item.imagem);

    return (
        <TouchableOpacity
            onPress={() => onPress(item)}
            activeOpacity={0.9}
            style={{
                backgroundColor: colors.brand.primary,
                borderRadius: 28,
                overflow: 'hidden',
                marginBottom: 14,
            }}
        >
            {img && (
                <Image source={img} style={{ width: '100%', height: 180 }} resizeMode="cover" />
            )}
            <View style={{ padding: 22 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    {ehNovo && (
                        <View
                            style={{
                                backgroundColor: colors.brand.accent,
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 999,
                                marginRight: 8,
                            }}
                        >
                            <Text style={{ color: colors.ink, fontFamily: 'Outfit_700Bold', fontSize: 9, letterSpacing: 0.6 }}>
                                MAIS RECENTE
                            </Text>
                        </View>
                    )}
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'Outfit_500Medium', fontSize: 11 }}>
                        {formatarData(item.data_cadastro)}
                    </Text>
                </View>
                <Text
                    style={{
                        color: '#FFFFFF',
                        fontFamily: 'Outfit_700Bold',
                        fontSize: 22,
                        letterSpacing: -0.8,
                        lineHeight: 26,
                    }}
                    numberOfLines={3}
                >
                    {item.titulo}
                </Text>
                <Text
                    style={{
                        color: 'rgba(255,255,255,0.85)',
                        fontFamily: 'Outfit_400Regular',
                        fontSize: 13,
                        marginTop: 8,
                        lineHeight: 18,
                    }}
                    numberOfLines={3}
                >
                    {removerTagsHtml(item.descricao)}
                </Text>
                <View
                    style={{
                        marginTop: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        alignSelf: 'flex-start',
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        paddingHorizontal: 14,
                        paddingVertical: 6,
                        borderRadius: 999,
                    }}
                >
                    <Text style={{ color: '#FFFFFF', fontFamily: 'Outfit_700Bold', fontSize: 12, marginRight: 4 }}>
                        Ler aviso
                    </Text>
                    <Feather name="arrow-right" size={14} color="#FFFFFF" />
                </View>
            </View>
        </TouchableOpacity>
    );
}

function NoticeCard({ item, onPress }: { item: ListagemAvisos; onPress: (i: ListagemAvisos) => void }) {
    const ehNovo = isNovo(item.data_cadastro);
    const img = getImageSource(item.imagem);

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onPress(item)}
            style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 22,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.hairline,
                flexDirection: 'row',
            }}
        >
            <View style={{ flex: 1, paddingRight: img ? 12 : 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    {ehNovo && (
                        <View
                            style={{
                                backgroundColor: colors.brand.accent,
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 999,
                                marginRight: 6,
                            }}
                        >
                            <Text style={{ color: colors.ink, fontFamily: 'Outfit_700Bold', fontSize: 9, letterSpacing: 0.5 }}>
                                NOVO
                            </Text>
                        </View>
                    )}
                    <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 11, color: colors.inkSoft }}>
                        {formatarData(item.data_cadastro)}
                    </Text>
                </View>
                <Text
                    style={{
                        fontFamily: 'Outfit_700Bold',
                        fontSize: 15,
                        color: colors.ink,
                        marginBottom: 4,
                        letterSpacing: -0.3,
                        lineHeight: 19,
                    }}
                    numberOfLines={2}
                >
                    {item.titulo}
                </Text>
                <Text
                    style={{
                        fontFamily: 'Outfit_400Regular',
                        fontSize: 12,
                        color: colors.inkSoft,
                        lineHeight: 17,
                    }}
                    numberOfLines={3}
                >
                    {removerTagsHtml(item.descricao)}
                </Text>
            </View>
            {img && (
                <Image
                    source={img}
                    style={{ width: 84, height: 84, borderRadius: 16 }}
                    resizeMode="cover"
                />
            )}
        </TouchableOpacity>
    );
}

function Empty({ searchText }: { searchText: string }) {
    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <View
                style={{
                    width: 80,
                    height: 80,
                    borderRadius: 28,
                    backgroundColor: colors.paperWarm,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                }}
            >
                <Feather name="inbox" size={32} color={colors.inkSoft} />
            </View>
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 17, color: colors.ink }}>
                {searchText ? 'Nada encontrado' : 'Mural vazio'}
            </Text>
            <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 13, color: colors.inkSoft, marginTop: 6, textAlign: 'center' }}>
                {searchText ? 'Tente outros termos.' : 'Volte mais tarde — novos avisos aparecem aqui.'}
            </Text>
        </View>
    );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <View style={{ alignItems: 'center', padding: 40 }}>
            <Feather name="alert-triangle" size={28} color={colors.brand.primary} />
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: colors.ink, marginTop: 8 }}>
                Erro ao carregar
            </Text>
            <TouchableOpacity
                onPress={onRetry}
                style={{
                    marginTop: 12,
                    backgroundColor: colors.brand.primary,
                    paddingHorizontal: 22,
                    paddingVertical: 10,
                    borderRadius: 999,
                }}
            >
                <Text style={{ color: '#FFFFFF', fontFamily: 'Outfit_700Bold', fontSize: 13 }}>Tentar novamente</Text>
            </TouchableOpacity>
        </View>
    );
}
