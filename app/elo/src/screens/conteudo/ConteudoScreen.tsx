import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, TextInput, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getConteudos, ListagemConteudo } from '../../services/conteudo/ConteudoService';
import { useAluno } from '../../context/AlunoContext';
import { useAlert } from '../../context/AlertContext';
import { Header } from '../../components/Header';
import { Skeleton } from '../../components/Skeleton';
import { colors } from '../../constants/colors';
import { formatarDataBR } from '../../util/FormatDate';

const TINTAS = [
    { bg: '#FFE7D9', fg: '#E0511C' },
    { bg: '#CFFAFE', fg: '#0E7490' },
    { bg: '#FEF3C7', fg: '#A16207' },
    { bg: '#DCFCE7', fg: '#15803D' },
    { bg: '#EDE9FE', fg: '#6D28D9' },
    { bg: '#FCE7F3', fg: '#BE185D' },
    { bg: '#DBEAFE', fg: '#1D4ED8' },
];

const tintaDe = (s: string) => {
    if (!s) return TINTAS[0];
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
    return TINTAS[Math.abs(h) % TINTAS.length];
};

/**
 * ConteudoScreen Élo — feed cronológico com chip de disciplina
 * tonalmente colorido. Modal slide-up com tipografia editorial.
 */
export default function ConteudoScreen() {
    const { aluno } = useAluno();
    const { showToast } = useAlert();

    const [lista, setLista] = useState<ListagemConteudo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [item, setItem] = useState<ListagemConteudo | null>(null);

    const fetchConteudos = useCallback(async () => {
        if (!aluno) return;
        try {
            setIsLoading(true);
            const dados = await getConteudos(aluno.pes_cod, aluno.ano_selecionado!);
            setLista(dados || []);
        } catch {
            showToast('Não foi possível carregar os conteúdos.', 'error');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [aluno]);

    useEffect(() => { fetchConteudos(); }, [fetchConteudos]);

    const filtrados = useMemo(() => {
        if (!searchText) return lista;
        const t = searchText.toLowerCase();
        return lista.filter(
            (i) =>
                (i.tema && i.tema.toLowerCase().includes(t)) ||
                (i.disciplina && i.disciplina.toLowerCase().includes(t))
        );
    }, [lista, searchText]);

    return (
        <View style={{ flex: 1, backgroundColor: colors.paper }}>
            <Header title="Conteúdo" />

            {/* Search */}
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
                        value={searchText}
                        onChangeText={setSearchText}
                        placeholder="Tema ou disciplina..."
                        placeholderTextColor="#94A3B8"
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

            {/* Counter */}
            <View
                style={{
                    paddingHorizontal: 18,
                    marginTop: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 18, color: colors.ink, letterSpacing: -0.5 }}>
                    Cronograma
                </Text>
                <View
                    style={{
                        backgroundColor: colors.brand.primaryLight,
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderRadius: 999,
                    }}
                >
                    <Text
                        style={{
                            color: colors.brand.primaryDark,
                            fontFamily: 'Outfit_700Bold',
                            fontSize: 11,
                            letterSpacing: 0.6,
                        }}
                    >
                        {isLoading ? '...' : `${filtrados.length} itens`}
                    </Text>
                </View>
            </View>

            <FlatList
                data={isLoading ? [] : filtrados}
                keyExtractor={(it) => String(it.id)}
                contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 140 }}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            fetchConteudos();
                        }}
                        colors={[colors.brand.primary]}
                        tintColor={colors.brand.primary}
                    />
                }
                ListEmptyComponent={
                    isLoading ? (
                        <View style={{ gap: 10 }}>
                            <Skeleton width="100%" height={120} borderRadius={22} />
                            <Skeleton width="100%" height={120} borderRadius={22} />
                            <Skeleton width="100%" height={120} borderRadius={22} />
                        </View>
                    ) : (
                        <Empty searchText={searchText} />
                    )
                }
                renderItem={({ item: it }) => (
                    <ConteudoCard
                        item={it}
                        onPress={() => {
                            setItem(it);
                            setModalVisible(true);
                        }}
                    />
                )}
            />

            <DetailModal visible={modalVisible} item={item} onClose={() => setModalVisible(false)} />
        </View>
    );
}

function ConteudoCard({ item, onPress }: { item: ListagemConteudo; onPress: () => void }) {
    const tinta = tintaDe(item.disciplina || 'Geral');
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
            <View style={{ width: 5, backgroundColor: tinta.fg }} />
            <View style={{ flex: 1, padding: 16 }}>
                <View
                    style={{
                        alignSelf: 'flex-start',
                        backgroundColor: tinta.bg,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 999,
                        marginBottom: 8,
                    }}
                >
                    <Text
                        style={{
                            color: tinta.fg,
                            fontFamily: 'Outfit_700Bold',
                            fontSize: 10,
                            letterSpacing: 0.6,
                            textTransform: 'uppercase',
                        }}
                    >
                        {item.disciplina || 'Geral'}
                    </Text>
                </View>
                <Text
                    style={{
                        fontFamily: 'Outfit_700Bold',
                        fontSize: 16,
                        color: colors.ink,
                        letterSpacing: -0.4,
                        lineHeight: 20,
                    }}
                    numberOfLines={2}
                >
                    {item.tema}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                    <Feather name="calendar" size={11} color={colors.inkSoft} />
                    <Text
                        style={{
                            fontFamily: 'Outfit_500Medium',
                            fontSize: 11,
                            color: colors.inkSoft,
                            marginLeft: 4,
                        }}
                    >
                        {formatarDataBR(item.data_inicio)}
                        {item.data_fim ? `  →  ${formatarDataBR(item.data_fim)}` : ''}
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
}: {
    visible: boolean;
    item: ListagemConteudo | null;
    onClose: () => void;
}) {
    if (!item) return null;
    const tinta = tintaDe(item.disciplina || 'Geral');
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

                        <View
                            style={{
                                alignSelf: 'flex-start',
                                backgroundColor: tinta.bg,
                                paddingHorizontal: 12,
                                paddingVertical: 5,
                                borderRadius: 999,
                                marginBottom: 14,
                            }}
                        >
                            <Text
                                style={{
                                    color: tinta.fg,
                                    fontFamily: 'Outfit_700Bold',
                                    fontSize: 11,
                                    letterSpacing: 1,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {item.disciplina}
                            </Text>
                        </View>

                        <Text
                            style={{
                                fontFamily: 'Outfit_700Bold',
                                fontSize: 26,
                                color: colors.ink,
                                letterSpacing: -1,
                                lineHeight: 30,
                            }}
                        >
                            {item.tema}
                        </Text>

                        <View
                            style={{
                                flexDirection: 'row',
                                gap: 10,
                                marginTop: 16,
                            }}
                        >
                            <DateChip label="Início" value={formatarDataBR(item.data_inicio)} />
                            <DateChip label="Fim" value={formatarDataBR(item.data_fim) || '—'} />
                        </View>

                        <View style={{ marginTop: 24 }}>
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
                                Conteúdo
                            </Text>
                            <Text
                                style={{
                                    fontFamily: 'Outfit_400Regular',
                                    fontSize: 15,
                                    color: colors.ink,
                                    lineHeight: 24,
                                }}
                            >
                                {item.conteudo}
                            </Text>
                        </View>

                        {item.desenvolvimento && (
                            <View
                                style={{
                                    marginTop: 22,
                                    backgroundColor: colors.paperWarm,
                                    borderRadius: 18,
                                    padding: 16,
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
                                    Desenvolvimento
                                </Text>
                                <Text
                                    style={{
                                        fontFamily: 'Outfit_400Regular',
                                        fontSize: 14,
                                        color: colors.ink,
                                        lineHeight: 22,
                                        fontStyle: 'italic',
                                    }}
                                >
                                    {item.desenvolvimento}
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.hairline }}>
                        <TouchableOpacity
                            onPress={onClose}
                            style={{
                                backgroundColor: colors.ink,
                                paddingVertical: 14,
                                borderRadius: 999,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#FFFFFF', fontFamily: 'Outfit_700Bold', fontSize: 14 }}>Fechar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function DateChip({ label, value }: { label: string; value: string }) {
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: colors.hairline,
                borderRadius: 16,
                padding: 12,
            }}
        >
            <Text
                style={{
                    fontFamily: 'Outfit_500Medium',
                    fontSize: 10,
                    color: colors.inkSoft,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                }}
            >
                {label}
            </Text>
            <Text
                style={{
                    fontFamily: 'Outfit_700Bold',
                    fontSize: 14,
                    color: colors.ink,
                    marginTop: 2,
                }}
            >
                {value}
            </Text>
        </View>
    );
}

function Empty({ searchText }: { searchText: string }) {
    return (
        <View style={{ alignItems: 'center', padding: 40 }}>
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
                <Feather name="book-open" size={32} color={colors.inkSoft} />
            </View>
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 17, color: colors.ink }}>
                {searchText ? 'Nada encontrado' : 'Sem conteúdos'}
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
                {searchText ? 'Tente outros termos.' : 'Aguarde lançamentos do professor.'}
            </Text>
        </View>
    );
}
