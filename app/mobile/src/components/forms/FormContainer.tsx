import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface FormContainerProps {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  footer?: ReactNode;
  hideBackButton?: boolean; // Adicionei opcional para a tela de login não ter botão de voltar se for a primeira
}

export function FormContainer({ 
  titulo, 
  subtitulo, 
  children, 
  footer,
  hideBackButton = false 
}: FormContainerProps) {
  const navigation = useNavigation();

  return (
    <View className="flex-1 bg-edu-background">
      {/* Cabeçalho Curvo com Design System Edu */}
      <View className="bg-edu-primary pt-12 pb-6 px-4 rounded-b-3xl shadow-md z-10">
        <View className="flex-row items-center">
          
          {!hideBackButton && (
            <TouchableOpacity onPress={() => navigation.goBack()} className="bg-edu-dark p-2 rounded-full mr-4">
              <Feather name="arrow-left" size={24} color="white" />
            </TouchableOpacity>
          )}

          <View>
            <Text className="text-edu-onPrimary opacity-70 text-xs font-bold uppercase">EduConecta</Text>
            <Text className="text-edu-onPrimary text-xl font-bold">{titulo}</Text>
            {subtitulo && <Text className="text-edu-onPrimary opacity-80 text-xs">{subtitulo}</Text>}
          </View>
        </View>
      </View>

      <KeyboardAwareScrollView
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={100}
        extraHeight={150}
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 150 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableResetScrollToCoords={false}
      >
        {children}
        {footer && <View className="mt-8 mb-8">{footer}</View>}
      </KeyboardAwareScrollView>
    </View>
  );
}