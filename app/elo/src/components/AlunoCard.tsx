import React from 'react';
import { View, Text } from 'react-native';
import { ListagemAlunos } from '../services/home/HomeService';
import { normalizarNomePessoal } from '../util/FormatarNome';
import { colors } from '../constants/colors';

interface AlunoCardProps {
    alunoAtual: ListagemAlunos;
}

/**
 * AlunoCard Élo — paper background, avatar com inicial em laranja
 * sólido, badges em pílulas amarelas/teal. Sem dégradé.
 */
export function AlunoCard({ alunoAtual }: AlunoCardProps) {
    const inicial = alunoAtual?.nome?.charAt(0).toUpperCase() ?? '?';

    return (
        <View
            className="mx-4 mt-4 p-4 flex-row items-center"
            style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                borderWidth: 1,
                borderColor: colors.hairline,
            }}
        >
            <View
                className="w-14 h-14 items-center justify-center mr-4 flex-none"
                style={{
                    backgroundColor: colors.brand.primary,
                    borderRadius: 18,
                }}
            >
                <Text
                    style={{
                        fontFamily: 'Outfit_700Bold',
                        fontSize: 22,
                        color: '#FFFFFF',
                    }}
                >
                    {inicial}
                </Text>
            </View>
            <View className="flex-1 gap-y-1">
                <Text
                    style={{
                        fontFamily: 'Outfit_700Bold',
                        fontSize: 16,
                        color: colors.ink,
                        letterSpacing: -0.3,
                    }}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                >
                    {normalizarNomePessoal(alunoAtual?.nome)}
                </Text>

                <View className="flex-row flex-wrap items-center mt-2 gap-2">
                    <Pill text={`${alunoAtual?.serie ?? ''} • ${alunoAtual?.turma ?? ''}`} />
                    <Pill text={alunoAtual?.turno ?? ''} variant="secondary" />
                    <Pill text={String(alunoAtual?.ano_letivo ?? '')} variant="accent" />
                </View>
            </View>
        </View>
    );
}

function Pill({
    text,
    variant = 'primary',
}: {
    text: string;
    variant?: 'primary' | 'secondary' | 'accent';
}) {
    const palette = {
        primary: { bg: colors.brand.primaryLight, fg: colors.brand.primaryDark },
        secondary: { bg: colors.brand.secondaryLight, fg: colors.brand.secondaryDark },
        accent: { bg: '#FFF5C8', fg: colors.brand.accentDark },
    }[variant];
    return (
        <View
            style={{
                backgroundColor: palette.bg,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
            }}
        >
            <Text
                style={{
                    color: palette.fg,
                    fontFamily: 'Outfit_600SemiBold',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                }}
                numberOfLines={1}
            >
                {text}
            </Text>
        </View>
    );
}
