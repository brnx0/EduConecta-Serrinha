import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';

import { Routes } from './src/routes';
import { AlertProvider } from './src/context/AlertContext';
import { LoadingProvider } from './src/context/LoadingContext';
import { AlunoProvider } from './src/context/AlunoContext';
import { colors } from './src/constants/colors';

// Mantém splash até fontes carregarem — evita flash de fonte system
SplashScreen.preventAutoHideAsync().catch(() => {});

// Define Outfit como font default em todo <Text /> sem refactorar 50+ telas.
// Hack permitido em RN: monkeypatch defaultProps. Roda só uma vez no boot.
function applyDefaultFont() {
  const TextAny = Text as any;
  TextAny.defaultProps = TextAny.defaultProps || {};
  const prev = TextAny.defaultProps.style;
  TextAny.defaultProps.style = [
    { fontFamily: 'Outfit_400Regular', color: colors.ink },
    prev,
  ];
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      applyDefaultFont();
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    // Splash ainda visível
    return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  }

  return (
    <AlertProvider>
      <AlunoProvider>
        <LoadingProvider>
          <StatusBar style="dark" backgroundColor={colors.paper} />
          <Routes />
        </LoadingProvider>
      </AlunoProvider>
    </AlertProvider>
  );
}
