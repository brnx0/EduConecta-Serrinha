import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatDatePTBR } from '../../util/FormatDate';

interface SolicitacaoCardProps {
    item: Solicitacao;
    onEdit?: (item: Solicitacao) => void; // Função que recebe o item completo
    onDelete?: (id: number | string) => void;
}

export interface Solicitacao {
    id: number | string;
    data: string;
    andamento: 'pendente' | 'aprovado' | 'reprovado';
    tipo: number
    payload: {
        nome?: string;
        cpf?: string;
        parentesco?: string;
        descricao?: string;
        rota?: string;
        [key: string]: any; // Permite outros campos genéricos
    };
}

const statusConfig = {
    pendente: { label: 'Pendente', color: 'bg-amber-100 text-amber-700', icon: 'clock' },
    aprovado: { label: 'Aprovado', color: 'bg-green-100 text-green-700', icon: 'check-circle' },
    reprovado: { label: 'Rejeitado', color: 'bg-red-100 text-red-700', icon: 'x-circle' },
};

export const SolicitacaoCard = ({ item, onEdit, onDelete }: SolicitacaoCardProps) => {
    const config = statusConfig[item.andamento] || statusConfig.pendente;

    const getParsedPayload = () => {
        try {
            return typeof item.payload === 'string'
                ? JSON.parse(item.payload)
                : item.payload;
        } catch (error) {
            console.error("Erro ao converter payload:", error);
            // Se falhar o parse, retornamos o payload original como descrição se for string, ou vazio
            return typeof item.payload === 'string' ? { descricao: item.payload } : {};
        }
    };
    const data = getParsedPayload();
    const RenderContent = () => {
        switch (item.tipo) {
            case 1: // Portador
                return (
                    <View key={data.id}>
                        <Text className="text-slate-900 font-bold text-base leading-tight mb-1">
                            Nome: {data.nome}
                        </Text>
                        <View className="mt-1">
                            <Text className="text-slate-500 text-sm">Parentesco: {data.parentesco}</Text>
                            <Text className="text-slate-500 text-sm">CPF: {data.cpf}</Text>
                            {data.telefone && <Text className="text-slate-500 text-sm">Tel: {data.telefone}</Text>}
                        </View>
                    </View>
                );
            case 2:
                return (
                    <View key={data.id || 'desc'}>
                        <Text className="text-slate-900 font-bold text-base leading-tight mb-1">
                            Descrição:
                        </Text>
                        <Text className="text-slate-700 text-sm">{data?.descricao || 'Sem descrição'}</Text>
                    </View>
                );

        }
    };
    return (
        <TouchableOpacity
            activeOpacity={0.8}
            className="bg-white mx-4 mb-2 p-4 rounded-2xl border border-slate-200 shadow-sm"
        >
            {/* Cabeçalho do Card */}
            <View className="flex-row justify-between items-center mb-2">
                <View className={`flex-row items-center px-2 py-1 rounded-lg ${config.color.split(' ')[0]}`}>
                    <Feather name={config.icon as any} size={12} className={config.color.split(' ')[1]} />
                    <Text className={`ml-1.5 text-[10px] font-bold uppercase ${config.color.split(' ')[1]}`}>
                        {config.label}
                    </Text>
                </View>
                <Text className="text-slate-400 text-[11px] font-medium">{formatDatePTBR(item.data)}</Text>
            </View>

            {/* Conteúdo específico */}
            <View className="py-1">
                <RenderContent />
            </View>

            {/* Rodapé com ID e Botões de Ação */}
            <View className="mt-2 pt-3 border-t border-slate-50 flex-row justify-between items-center">
                <Text className="text-slate-400 text-[10px]">ID: #{item.id}</Text>

                {/* Contentor dos Botões */}
                {item.andamento === 'pendente' && (
                    <View className="flex-row items-center gap-x-4">
                        {/* Botão Editar */}
                        <TouchableOpacity
                            onPress={() => onEdit?.(item)}
                            className="flex-row items-center"
                        >
                            <Feather name="edit-2" size={14} color="#64748b" />
                            <Text className="text-slate-500 text-[12px] ml-1 font-medium">Editar</Text>
                        </TouchableOpacity>

                        {/* Botão Excluir */}
                        <TouchableOpacity
                            onPress={() => onDelete?.(item.id)}
                            className="flex-row items-center"
                        >
                            <Feather name="trash-2" size={14} color="#ef4444" />
                            <Text className="text-red-500 text-[12px] ml-1 font-medium">Excluir</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}