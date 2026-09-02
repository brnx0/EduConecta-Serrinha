import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

interface ActionCardsProps {
  qtdMoradores: number;
  hasResponsavel: boolean;
  qtdAnimais: number;
  onPressMoradores: () => void;
  onPressAnimais: () => void;
}

export function ActionCards({ 
  qtdMoradores, 
  hasResponsavel, 
  qtdAnimais, 
  onPressMoradores, 
  onPressAnimais 
}: ActionCardsProps) {
  
  return (
    <View className="mt-6 mb-4">
      <Text className="text-teal-700 font-bold text-lg mb-3 border-b border-teal-100 pb-2">
        Complementos do Cadastro
      </Text>

      {/* CARD MORADORES */}
      <TouchableOpacity
        onPress={onPressMoradores}
        className={`border rounded-xl p-4 mb-3 flex-row items-center justify-between shadow-sm active:bg-slate-50
          ${!hasResponsavel ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}
        `}
      >
        <View className="flex-row items-center flex-1">
          <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 
            ${!hasResponsavel ? 'bg-red-100' : 'bg-teal-50'}`}>
             <Feather name="users" size={24} color={!hasResponsavel ? "#dc2626" : "#0d9488"} />
          </View>
          <View>
            <Text className={`font-bold text-lg ${!hasResponsavel ? 'text-red-700' : 'text-slate-700'}`}>
              Moradores
            </Text>
            {!hasResponsavel ? (
              <Text className="text-red-500 text-xs font-bold">⚠️ Responsável Obrigatório</Text>
            ) : (
              <Text className="text-slate-400 text-xs">{qtdMoradores} cadastrado(s)</Text>
            )}
          </View>
        </View>
        <Feather name="chevron-right" size={20} color="#94a3b8" />
      </TouchableOpacity>

      {/* CARD ANIMAIS */}
      <TouchableOpacity
        onPress={onPressAnimais}
        className="bg-white border border-slate-200 rounded-xl p-4 flex-row items-center justify-between shadow-sm active:bg-slate-50"
      >
        <View className="flex-row items-center flex-1">
          <View className="w-12 h-12 bg-amber-50 rounded-full items-center justify-center mr-4">
             {/* Ícone de Pata (MaterialCommunityIcons é ótimo pra isso) */}
             <MaterialCommunityIcons name="paw" size={24} color="#d97706" />
          </View>
          <View>
            <Text className="text-slate-700 font-bold text-lg">Animais</Text>
            <Text className="text-slate-400 text-xs">
              {qtdAnimais > 0 ? `${qtdAnimais} grupos registrados` : "Nenhum animal (Opcional)"}
            </Text>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color="#94a3b8" />
      </TouchableOpacity>

    </View>
  );
}