import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';

/**
 * MenuSheet — bottom sheet global com TODAS as opções do app.
 *
 * Pensado pra usuários leigos: cada item tem ícone tonal grande, label claro
 * e descrição curta explicando o que faz. Acesso de qualquer tela via botão
 * "Menu" no Topbar/Header.
 *
 * Implementação: Provider + hook `useMenuSheet().open()`.
 */

interface MenuItem {
    icon: keyof typeof Feather.glyphMap;
    label: string;
    desc: string;
    route: string;
    tint: string;
}

const ITEMS: MenuItem[] = [
    { icon: 'home', label: 'Início', desc: 'Resumo do seu filho e atalhos', route: 'HomeScreen', tint: '#FF6B35' },
    { icon: 'bar-chart-2', label: 'Boletim', desc: 'Notas e situação por disciplina', route: 'BoletimEscolarScreen', tint: '#7C3AED' },
    { icon: 'check-circle', label: 'Frequência', desc: 'Calendário de presenças', route: 'FrequenciaScreen', tint: '#16A34A' },
    { icon: 'calendar', label: 'Calendário', desc: 'Atividades e dias letivos', route: 'CalendarioEscolarScreen', tint: '#0EA5E9' },
    { icon: 'clock', label: 'Horários', desc: 'Grade semanal de aulas', route: 'HorariosScreen', tint: '#F97316' },
    { icon: 'book', label: 'Conteúdo', desc: 'Cronograma de matérias', route: 'ConteudoScreen', tint: '#06B6D4' },
    { icon: 'bell', label: 'Avisos', desc: 'Mural da escola', route: 'MuralAvisosScreen', tint: '#FCD34D' },
    { icon: 'alert-circle', label: 'Ocorrências', desc: 'Comunicados de comportamento', route: 'OcorrenciaScreen', tint: '#DC2626' },
    { icon: 'key', label: 'Autorizações', desc: 'Aprovar passeios e eventos', route: 'AutorizacoesScreen', tint: '#A855F7' },
    { icon: 'file-text', label: 'Solicitações', desc: 'Pedir portador, atualização', route: 'SolicitacoesScreen', tint: '#EC4899' },
];

interface MenuSheetCtx {
    open: () => void;
    close: () => void;
}

const Ctx = createContext<MenuSheetCtx>({ open: () => {}, close: () => {} });

export function useMenuSheet() {
    return useContext(Ctx);
}

export function MenuSheetProvider({ children }: { children: React.ReactNode }) {
    const [visible, setVisible] = useState(false);
    const navigation = useNavigation<any>();
    const { signOut } = useAuth();
    const { showConfirm } = useAlert();

    const open = useCallback(() => setVisible(true), []);
    const close = useCallback(() => setVisible(false), []);

    const handleNavigate = (route: string) => {
        close();
        // Pequeno delay pra animação de fechar do modal terminar antes da navegação
        setTimeout(() => {
            navigation.navigate(route);
        }, 150);
    };

    const handleLogout = () => {
        close();
        setTimeout(() => {
            showConfirm('Saindo?', 'Deseja realmente desconectar?', () => signOut());
        }, 150);
    };

    const ctxValue = useMemo(() => ({ open, close }), [open, close]);

    return (
        <Ctx.Provider value={ctxValue}>
            {children}
            <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={close} activeOpacity={1} />
                    <View
                        style={{
                            backgroundColor: colors.paper,
                            borderTopLeftRadius: 32,
                            borderTopRightRadius: 32,
                            maxHeight: '90%',
                            paddingBottom: Platform.OS === 'ios' ? 34 : 16,
                        }}
                    >
                        {/* Drag handle */}
                        <View
                            style={{
                                width: 48,
                                height: 4,
                                backgroundColor: colors.hairline,
                                borderRadius: 999,
                                alignSelf: 'center',
                                marginTop: 12,
                                marginBottom: 8,
                            }}
                        />

                        {/* Header */}
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingHorizontal: 24,
                                paddingTop: 8,
                                paddingBottom: 16,
                            }}
                        >
                            <View>
                                <Text
                                    style={{
                                        fontFamily: 'Outfit_500Medium',
                                        fontSize: 11,
                                        color: colors.inkSoft,
                                        letterSpacing: 1.5,
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Menu
                                </Text>
                                <Text
                                    style={{
                                        fontFamily: 'Outfit_700Bold',
                                        fontSize: 24,
                                        color: colors.ink,
                                        letterSpacing: -0.7,
                                        marginTop: 2,
                                    }}
                                >
                                    Para onde vamos?
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={close}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: colors.paperWarm,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Feather name="x" size={18} color={colors.ink} />
                            </TouchableOpacity>
                        </View>

                        {/* Items */}
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 12 }}
                        >
                            {ITEMS.map((item) => (
                                <TouchableOpacity
                                    key={item.route}
                                    onPress={() => handleNavigate(item.route)}
                                    activeOpacity={0.85}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        backgroundColor: '#FFFFFF',
                                        borderRadius: 18,
                                        padding: 14,
                                        marginBottom: 8,
                                        borderWidth: 1,
                                        borderColor: colors.hairline,
                                    }}
                                >
                                    <View
                                        style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 14,
                                            backgroundColor: `${item.tint}1F`,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: 14,
                                        }}
                                    >
                                        <Feather name={item.icon} size={22} color={item.tint} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text
                                            style={{
                                                fontFamily: 'Outfit_700Bold',
                                                fontSize: 15,
                                                color: colors.ink,
                                                letterSpacing: -0.3,
                                            }}
                                        >
                                            {item.label}
                                        </Text>
                                        <Text
                                            style={{
                                                fontFamily: 'Outfit_400Regular',
                                                fontSize: 12,
                                                color: colors.inkSoft,
                                                marginTop: 2,
                                                lineHeight: 16,
                                            }}
                                            numberOfLines={2}
                                        >
                                            {item.desc}
                                        </Text>
                                    </View>
                                    <Feather name="chevron-right" size={18} color={colors.inkSoft} />
                                </TouchableOpacity>
                            ))}

                            {/* Item especial: Sair */}
                            <TouchableOpacity
                                onPress={handleLogout}
                                activeOpacity={0.85}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: '#FEE2E2',
                                    borderRadius: 18,
                                    padding: 14,
                                    marginTop: 6,
                                    marginBottom: 4,
                                }}
                            >
                                <View
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 14,
                                        backgroundColor: '#FECACA',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 14,
                                    }}
                                >
                                    <Feather name="log-out" size={22} color="#B91C1C" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text
                                        style={{
                                            fontFamily: 'Outfit_700Bold',
                                            fontSize: 15,
                                            color: '#B91C1C',
                                            letterSpacing: -0.3,
                                        }}
                                    >
                                        Sair
                                    </Text>
                                    <Text
                                        style={{
                                            fontFamily: 'Outfit_400Regular',
                                            fontSize: 12,
                                            color: '#B91C1C',
                                            marginTop: 2,
                                            opacity: 0.75,
                                        }}
                                    >
                                        Desconectar do app
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </Ctx.Provider>
    );
}

/**
 * Botão padrão pra abrir o MenuSheet. Usa no Header de qualquer tela.
 */
export function MenuButton() {
    const { open } = useMenuSheet();
    return (
        <TouchableOpacity
            onPress={open}
            activeOpacity={0.7}
            style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.paperWarm,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Feather name="grid" size={20} color={colors.ink} />
        </TouchableOpacity>
    );
}
