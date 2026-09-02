import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { NotificacaoDTO } from '../../services/notificacoes';
import { colors } from '../../constants/colors';

interface Props {
    notificacao: NotificacaoDTO;
    onPress: (n: NotificacaoDTO) => void;
}

function formatarHora(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatarData(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function NotificacaoItem({ notificacao, onPress }: Props) {
    const naoLida = !notificacao.lidaEm;
    const isSaida = notificacao.tipo === 'saida';
    const dataRef = notificacao.ocorridoEm ?? notificacao.criadaEm;

    const tom = isSaida
        ? { bg: '#FEF3C7', fg: '#A16207', icon: 'log-out' as const }
        : { bg: colors.brand.secondaryLight, fg: colors.brand.secondaryDark, icon: 'log-in' as const };

    return (
        <Pressable
            onPress={() => onPress(notificacao)}
            style={{
                marginHorizontal: 18,
                marginVertical: 4,
                backgroundColor: naoLida ? '#FFFFFF' : colors.paperWarm,
                borderRadius: 20,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'flex-start',
                borderWidth: 1,
                borderColor: naoLida ? colors.brand.primary : colors.hairline,
                opacity: naoLida ? 1 : 0.85,
            }}
        >
            <View
                style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: tom.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                }}
            >
                <Feather name={tom.icon} size={20} color={tom.fg} />
            </View>

            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text
                        style={{
                            flex: 1,
                            fontFamily: 'Outfit_700Bold',
                            fontSize: 14,
                            color: colors.ink,
                            letterSpacing: -0.3,
                        }}
                        numberOfLines={1}
                    >
                        {notificacao.titulo}
                    </Text>
                    {naoLida && (
                        <View
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: colors.brand.primary,
                                marginLeft: 8,
                            }}
                        />
                    )}
                </View>
                <Text
                    style={{
                        fontFamily: 'Outfit_400Regular',
                        fontSize: 13,
                        color: colors.inkSoft,
                        marginTop: 2,
                        lineHeight: 18,
                    }}
                    numberOfLines={2}
                >
                    {notificacao.corpo}
                </Text>
                <Text
                    style={{
                        fontFamily: 'Outfit_500Medium',
                        fontSize: 11,
                        color: colors.inkSoft,
                        marginTop: 6,
                        opacity: 0.75,
                    }}
                >
                    {formatarData(dataRef)} · {formatarHora(dataRef)}
                </Text>
            </View>
        </Pressable>
    );
}
