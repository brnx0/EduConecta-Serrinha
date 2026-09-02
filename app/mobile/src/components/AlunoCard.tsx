// src/components/Forms/AlunoCard.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { ListagemAlunos } from '../services/home/HomeService'; // Ajuste o caminho se necessário
import { normalizarNomePessoal } from '../util/FormatarNome'; // Ajuste o caminho se necessário

interface AlunoCardProps {
    alunoAtual: ListagemAlunos;
}

export function AlunoCard({ alunoAtual }: AlunoCardProps) {

    return (
        <View className="mx-4 mt-4 bg-edu-primary rounded-2xl p-4 shadow-sm border border-slate-100 flex-row items-center">
            <View className="w-14 h-14 rounded-full bg-blue-100 items-center justify-center mr-4 flex-none">
                <Text className="text-xl font-bold text-blue-600">
                    {alunoAtual?.nome?.charAt(0).toUpperCase()}
                </Text>
            </View>
            <View className="flex-1 gap-y-1">
                <Text 
                    className="text-white font-bold text-base mr-2" 
                    numberOfLines={2}
                    adjustsFontSizeToFit 
                >
                    {normalizarNomePessoal(alunoAtual?.nome)}
                </Text>

                <View className="flex-row flex-wrap items-center mt-2 gap-2">
                    <View className="bg-blue-100 px-2 py-0.5 rounded-md shrink-0">
                        <Text className="text-slate-600 text-xs font-bold uppercase" numberOfLines={1}>
                            {alunoAtual?.serie} - {alunoAtual?.turma}
                        </Text>
                    </View>
                    <View className="bg-blue-100 px-2 py-0.5 rounded-md shrink-0">
                        <Text className="text-slate-600 text-xs font-bold uppercase" numberOfLines={1}>
                            {alunoAtual?.turno}
                        </Text>
                    </View>
                    <View className="bg-blue-100 px-2 py-0.5 rounded-md shrink-0">
                        <Text className="text-slate-600 text-xs font-bold uppercase">
                            {alunoAtual?.ano_letivo}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}