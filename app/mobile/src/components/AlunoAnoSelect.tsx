import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Aluno } from '../context/AlunoContext';

interface Props {
  value: Aluno | null;
  alunos: Aluno[]; // lista completa
  onSelect: (aluno: Aluno) => void;
  disabled?: boolean;
}

export const AlunoAnoSelect = React.memo(function AlunoAnoSelect({
  value,
  alunos,
  onSelect,
  disabled
}: Props) {
  const [visible, setVisible] = React.useState(false);

  // pega só os vínculos do mesmo aluno (pes_cod)
  const opcoesAno = React.useMemo(() => {
    if (!value) return [];
    return alunos
      .filter(a => a.pes_cod === value.pes_cod)
      .sort((a, b) => b.ano_letivo - a.ano_letivo);
  }, [alunos, value?.pes_cod]);

  const renderItem = React.useCallback(({ item }: { item: Aluno }) => {
    const selected = item.ano_letivo === value?.ano_letivo;

    return (
      <TouchableOpacity
        onPress={() => {
          onSelect(item);   // 🔥 TROCA O ALUNO INTEIRO
          setVisible(false);
        }}
        className={`p-4 border-b border-slate-100 flex-row justify-between ${
          selected ? 'bg-blue-50' : 'bg-white'
        }`}
      >
        <Text className={`text-base ${selected ? 'text-blue-700 font-bold' : 'text-slate-700'}`}>
          Ano {item.ano_letivo}
        </Text>
        {selected && <Feather name="check" size={18} color="#2563eb" />}
      </TouchableOpacity>
    );
  }, [value?.ano_letivo, onSelect]);

  return (
    <View className="mb-4">
      <Text className="text-slate-700 font-semibold mb-2">Ano Letivo</Text>

      <TouchableOpacity
        disabled={disabled}
        onPress={() => setVisible(true)}
        className="border border-gray-300 rounded-lg h-12 px-4 justify-center bg-white"
      >
        <View className="flex-row justify-between items-center">
          <Text className="text-slate-700">
            {value ? `Ano ${value.ano_letivo}` : "Selecione..."}
          </Text>
          <Feather name="chevron-down" size={20} color="#94a3b8" />
        </View>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-xl p-4 max-h-96 elevation-5">
            <Text className="text-lg font-bold mb-4 text-center">Selecione o ano</Text>

            <FlatList
              data={opcoesAno}
              keyExtractor={(item) => `${item.pes_cod}-${item.ano_letivo}`}
              renderItem={renderItem}
            />

            <TouchableOpacity
              onPress={() => setVisible(false)}
              className="mt-4 bg-slate-100 p-3 rounded-lg items-center"
            >
              <Text className="text-slate-600 font-bold">Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
});
