import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface FormSelectProps {
  label: string;
  value: { id: number; label: string } | null;
  options: { id: number; label: string }[];
  onSelect: (val: { id: number; label: string }) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean; // Nova prop
  loading?: boolean;  // Nova prop
}

export function FormSelect({ 
  label, 
  value, 
  options, 
  onSelect, 
  required, 
  placeholder = "Selecione...",
  disabled = false,
  loading = false 
}: FormSelectProps) {
  const [visible, setVisible] = React.useState(false);

  // Bloqueia a abertura se estiver carregando ou desativado
  const isInteractionDisabled = disabled || loading;

  return (
    <View className={`mb-4 ${disabled ? 'opacity-50' : 'opacity-100'}`}>
      <Text className="text-slate-700 font-semibold mb-2">
        {label} {required && <Text className="text-red-500">*</Text>}
      </Text>
      
      <TouchableOpacity 
        onPress={() => !isInteractionDisabled && setVisible(true)} 
        disabled={isInteractionDisabled}
        activeOpacity={0.7}
        className={`border border-gray-300 rounded-lg h-12 px-4 justify-center ${
          disabled ? 'bg-slate-100' : 'bg-white'
        }`}
      >
        <View className="flex-row justify-between items-center">
          <Text className={value ? "text-slate-700" : "text-slate-400"}>
            {loading ? "Carregando..." : (value?.label || placeholder)}
          </Text>

          {/* Lógica de Ícones: Mostra o Loading ou a Seta */}
          {loading ? (
            <ActivityIndicator size="small" color="#94a3b8" />
          ) : (
            <Feather name="chevron-down" size={20} color={disabled ? "#cbd5e1" : "#94a3b8"} />
          )}
        </View>
      </TouchableOpacity>
      
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View className="flex-1 bg-black/50 justify-center px-6">
            <View className="bg-white rounded-xl p-4 max-h-96 shadow-2xl">
                <Text className="text-lg font-bold mb-4 text-center text-teal-800">Escolha uma opção</Text>
                <FlatList 
                    data={options}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            className={`p-4 border-b border-slate-100 active:bg-teal-50 flex-row justify-between items-center ${value?.id === item.id ? 'bg-teal-50' : ''}`}
                            onPress={() => { onSelect(item); setVisible(false); }}
                        >
                            <Text className={`text-base ${value?.id === item.id ? 'text-teal-700 font-bold' : 'text-slate-700'}`}>{item.label}</Text>
                            {value?.id === item.id && <Feather name="check" size={18} color="#0d9488" />}
                        </TouchableOpacity>
                    )}
                />
                <TouchableOpacity onPress={() => setVisible(false)} className="mt-4 bg-slate-100 p-3 rounded-lg items-center">
                    <Text className="text-slate-600 font-bold">Cancelar</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </View>
  );
}