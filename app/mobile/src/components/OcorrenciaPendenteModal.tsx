import React from 'react';
import { View, Text, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface OcorrenciaPendenteModalProps {
    visible: boolean;
    onNavigate: () => void;
}

export function OcorrenciaPendenteModal({ visible, onNavigate }: OcorrenciaPendenteModalProps) {
    if (!visible) return null;

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            // onRequestClose vazio impede que o botão "Voltar" do Android feche o modal
            onRequestClose={() => null} 
        >
            {/* Fundo escuro bloqueante (sem onPress para fechar) */}
            <View className="flex-1 bg-black/80 justify-center items-center px-6">
                
                <View className="bg-white w-full rounded-3xl p-6 items-center shadow-2xl">
                    
                    {/* Ícone de Alerta Animado ou Estático */}
                    <View className="w-16 h-16 bg-amber-100 rounded-full items-center justify-center mb-4 border-4 border-amber-50">
                        <Feather name="alert-triangle" size={32} color="#d97706" />
                    </View>

                    <Text className="text-slate-800 text-xl font-bold text-center mb-2">
                        Atenção, Responsável!
                    </Text>

                    <Text className="text-slate-500 text-center mb-6 leading-6">
                        Identificamos uma nova ocorrência disciplinar pendente de ciência para este aluno.
                        {'\n\n'}
                        Por favor, acesse a área de ocorrências para visualizar os detalhes e confirmar a leitura.
                    </Text>

                    {/* Botão Único de Ação */}
                    <TouchableOpacity
                        onPress={onNavigate}
                        activeOpacity={0.8}
                        className="w-full bg-amber-600 py-4 rounded-xl flex-row justify-center items-center shadow-lg shadow-amber-200"
                    >
                        <Text className="text-white font-bold text-base mr-2">
                            Ir para Ocorrências
                        </Text>
                        <Feather name="arrow-right" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}