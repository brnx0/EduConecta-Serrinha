import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatDatePTBR } from '../../util/FormatDate';
import { colors } from '../../constants/colors';

export interface Solicitacao {
    id: number | string;
    data: string;
    andamento: 'pendente' | 'aprovado' | 'reprovado';
    tipo: number;
    payload: {
        nome?: string;
        cpf?: string;
        parentesco?: string;
        descricao?: string;
        rota?: string;
        telefone?: string;
        [key: string]: any;
    };
}

interface SolicitacaoCardProps {
    item: Solicitacao;
    onEdit?: (item: Solicitacao) => void;
    onDelete?: (id: number | string) => void;
}

const statusConfig = {
    pendente: {
        label: 'Pendente',
        bg: colors.brand.primaryLight,
        fg: colors.brand.primaryDark,
        edge: colors.brand.primary,
        icon: 'clock' as const,
    },
    aprovado: {
        label: 'Aprovado',
        bg: '#DCFCE7',
        fg: '#15803D',
        edge: '#16A34A',
        icon: 'check-circle' as const,
    },
    reprovado: {
        label: 'Recusado',
        bg: '#FEE2E2',
        fg: '#B91C1C',
        edge: '#DC2626',
        icon: 'x-circle' as const,
    },
};

export const SolicitacaoCard = ({ item, onEdit, onDelete }: SolicitacaoCardProps) => {
    const cfg = statusConfig[item.andamento] || statusConfig.pendente;
    const data = (() => {
        try {
            return typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload;
        } catch {
            return typeof item.payload === 'string' ? { descricao: item.payload } : {};
        }
    })();

    return (
        <View
            style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 22,
                marginHorizontal: 18,
                overflow: 'hidden',
                flexDirection: 'row',
                borderWidth: 1,
                borderColor: colors.hairline,
            }}
        >
            <View style={{ width: 5, backgroundColor: cfg.edge }} />
            <View style={{ flex: 1, padding: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: cfg.bg,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 999,
                        }}
                    >
                        <Feather name={cfg.icon} size={11} color={cfg.fg} />
                        <Text
                            style={{
                                color: cfg.fg,
                                fontFamily: 'Outfit_700Bold',
                                fontSize: 10,
                                marginLeft: 4,
                                letterSpacing: 0.6,
                                textTransform: 'uppercase',
                            }}
                        >
                            {cfg.label}
                        </Text>
                    </View>
                    <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 11, color: colors.inkSoft }}>
                        {formatDatePTBR(item.data)}
                    </Text>
                </View>

                {item.tipo === 1 ? (
                    <View>
                        <Text
                            style={{
                                fontFamily: 'Outfit_700Bold',
                                fontSize: 15,
                                color: colors.ink,
                                letterSpacing: -0.3,
                            }}
                            numberOfLines={1}
                        >
                            {data.nome || 'Portador'}
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                            {data.parentesco && <Tag label={data.parentesco} />}
                            {data.cpf && <Tag label={`CPF ${data.cpf}`} />}
                            {data.telefone && <Tag label={data.telefone} />}
                        </View>
                    </View>
                ) : (
                    <View>
                        <Text
                            style={{
                                fontFamily: 'Outfit_500Medium',
                                fontSize: 11,
                                color: colors.inkSoft,
                                letterSpacing: 0.6,
                                textTransform: 'uppercase',
                                marginBottom: 4,
                            }}
                        >
                            Descrição
                        </Text>
                        <Text
                            style={{
                                fontFamily: 'Outfit_500Medium',
                                fontSize: 13,
                                color: colors.ink,
                                lineHeight: 18,
                            }}
                            numberOfLines={3}
                        >
                            {data?.descricao || 'Sem descrição'}
                        </Text>
                    </View>
                )}

                <View
                    style={{
                        marginTop: 12,
                        paddingTop: 10,
                        borderTopWidth: 1,
                        borderTopColor: colors.hairline,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 10, color: colors.inkSoft }}>
                        #{item.id}
                    </Text>
                    {item.andamento === 'pendente' && (
                        <View style={{ flexDirection: 'row', gap: 14 }}>
                            <TouchableOpacity
                                onPress={() => onEdit?.(item)}
                                style={{ flexDirection: 'row', alignItems: 'center' }}
                            >
                                <Feather name="edit-2" size={12} color={colors.inkSoft} />
                                <Text
                                    style={{
                                        fontFamily: 'Outfit_700Bold',
                                        fontSize: 11,
                                        color: colors.inkSoft,
                                        marginLeft: 4,
                                    }}
                                >
                                    Editar
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => onDelete?.(item.id)}
                                style={{ flexDirection: 'row', alignItems: 'center' }}
                            >
                                <Feather name="trash-2" size={12} color={colors.error} />
                                <Text
                                    style={{
                                        fontFamily: 'Outfit_700Bold',
                                        fontSize: 11,
                                        color: colors.error,
                                        marginLeft: 4,
                                    }}
                                >
                                    Excluir
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

function Tag({ label }: { label: string }) {
    return (
        <View
            style={{
                backgroundColor: colors.paperWarm,
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 999,
            }}
        >
            <Text
                style={{
                    color: colors.ink,
                    fontFamily: 'Outfit_500Medium',
                    fontSize: 10,
                    letterSpacing: 0.4,
                }}
            >
                {label}
            </Text>
        </View>
    );
}
