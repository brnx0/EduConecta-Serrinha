import React, { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { DocumentPickerAsset } from 'expo-document-picker';

interface SeletorProps {
  onFilesChange: (files: DocumentPickerAsset[]) => void;
}

export const SeletorArquivos = ({ onFilesChange }: SeletorProps) => {
  const [arquivos, setArquivos] = useState<DocumentPickerAsset[]>([]);

  // Sempre que a lista interna mudar, avisamos o componente pai
  useEffect(() => {
    onFilesChange(arquivos);
  }, [arquivos]);

  const selecionarArquivos = async (): Promise<void> => {
    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!resultado.canceled && resultado.assets) {
        setArquivos((anterior) => [...anterior, ...resultado.assets]);
      }
    } catch (erro) {
      console.error("Erro ao selecionar ficheiro:", erro);
    }
  };

  const removerArquivo = (indexParaRemover: number): void => {
    setArquivos((anterior) => anterior.filter((_, index) => index !== indexParaRemover));
  };

  return (
    <View className="mt-2">
      <Text className="text-slate-700 font-bold mb-2">Anexos</Text>

      <TouchableOpacity
        onPress={selecionarArquivos}
        className="border-2 border-dashed border-indigo-300 bg-indigo-50 p-4 rounded-xl items-center active:bg-indigo-100"
      >
        <Text className="text-indigo-600 font-bold">+ Adicionar Documentos</Text>
      </TouchableOpacity>

      <View className="mt-2">
        {arquivos.map((ficheiro, index) => (
          <View
            key={index}
            className="flex-row items-center bg-slate-50 p-3 rounded-xl mb-2 border border-slate-200"
          >
            <View className="flex-1">
              <Text numberOfLines={1} className="text-slate-700 font-medium text-xs">
                📄 {ficheiro.name}
              </Text>
            </View>

            <TouchableOpacity onPress={() => removerArquivo(index)} className="ml-2">
              <Text className="text-red-500 font-bold text-xs">Remover</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
};