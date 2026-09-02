import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Ionicons name="notifications-off-outline" size={64} color="#9CA3AF" />
      <Text className="mt-4 text-lg font-semibold text-gray-700">
        Sem notificações ainda
      </Text>
      <Text className="mt-2 text-center text-sm text-gray-500">
        Quando seu filho passar pelo leitor da escola, você verá os avisos aqui.
      </Text>
    </View>
  );
}
