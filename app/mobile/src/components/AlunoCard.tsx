// src/components/AlunoCard.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { ListagemAlunos } from '../services/home/HomeService';
import { normalizarNomePessoal } from '../util/FormatarNome';
import { colors } from '../constants/colors';

interface AlunoCardProps {
    alunoAtual: ListagemAlunos;
}

/**
 * Chip de metadado. Tinta escura sobre véu preto: no dourado, texto branco
 * fica em 1.96:1 e some.
 */
function Chip({ children }: { children: React.ReactNode }) {
    return (
        <View className="bg-black/10 px-2.5 py-1 rounded-lg shrink-0">
            <Text
                className="text-[11px] font-bold uppercase"
                numberOfLines={1}
                style={{ color: colors.edu.onPrimary, letterSpacing: 0.4 }}
            >
                {children}
            </Text>
        </View>
    );
}

export function AlunoCard({ alunoAtual }: AlunoCardProps) {
    const inicial = alunoAtual?.nome?.charAt(0).toUpperCase() ?? '?';

    return (
        <View
            className="mx-4 mt-4 rounded-2xl p-4 flex-row items-center"
            style={{
                backgroundColor: colors.edu.primary,
                elevation: 4,
                shadowColor: colors.shadowColor,
                shadowOpacity: 0.25,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
            }}
        >
            {/* Avatar no azul complementar: é o contraponto frio do card
                dourado e o único ponto que aceita texto branco. */}
            <View
                className="w-14 h-14 rounded-full items-center justify-center mr-4 flex-none"
                style={{ backgroundColor: colors.edu.accent }}
            >
                <Text className="text-2xl font-bold" style={{ color: colors.white }}>
                    {inicial}
                </Text>
            </View>

            <View className="flex-1">
                <Text
                    className="font-bold text-base"
                    style={{ color: colors.edu.onPrimary }}
                    numberOfLines={2}
                >
                    {normalizarNomePessoal(alunoAtual?.nome)}
                </Text>

                <View className="flex-row flex-wrap items-center mt-2.5 gap-2">
                    <Chip>{alunoAtual?.serie} - {alunoAtual?.turma}</Chip>
                    <Chip>{alunoAtual?.turno}</Chip>
                    <Chip>{alunoAtual?.ano_letivo}</Chip>
                </View>
            </View>
        </View>
    );
}
