import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NotificacaoDTO } from '../../services/notificacoes';

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
  const icone =
    notificacao.tipo === 'saida' ? 'log-out-outline' : 'log-in-outline';
  const dataRef = notificacao.ocorridoEm ?? notificacao.criadaEm;

  return (
    <Pressable
      onPress={() => onPress(notificacao)}
      className={`flex-row items-start gap-3 px-4 py-3 border-b border-gray-100 ${
        naoLida ? 'bg-blue-50' : 'bg-white'
      }`}
    >
      <View className="mt-1">
        <Ionicons name={icone} size={24} color={naoLida ? '#017cbb' : '#6B7280'} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-base ${
              naoLida
                ? 'font-bold text-gray-900'
                : 'font-medium text-gray-700'
            }`}
          >
            {notificacao.titulo}
          </Text>
          {naoLida && <View className="w-2 h-2 rounded-full bg-blue-500" />}
        </View>
        <Text className="text-sm text-gray-600 mt-0.5">{notificacao.corpo}</Text>
        <Text className="text-xs text-gray-400 mt-1">
          {formatarData(dataRef)} · {formatarHora(dataRef)}
        </Text>
      </View>
    </Pressable>
  );
}
