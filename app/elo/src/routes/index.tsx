import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Image, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Importe suas telas
import LoginScreen from '../screens/login/LoginScreen';
import PrimeiroAcessoScreen from '../screens/login/PrimeiroAcessoScreen';
import { AppTabs } from '../navigation/AppTabs';
import NotificacoesScreen from '../screens/notificacoes';

// Importe o Contexto
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useAluno } from '../context/AlunoContext';
import { NotificationBootstrap } from '../components/NotificationBootstrap';
import { MenuSheetProvider } from '../components/MenuSheet';

export type RootStackParamList = {
  LoginScreen: undefined;
  PrimeiroAcessoScreen: { cpfLogin?: string };
  AppTabs: undefined;
  Notificacoes: { highlightId?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function MainNavigator() {
  const { user, loading, signOut } = useAuth();
  const { preCarregarDados } = useAluno();
  const [dataLoading, setDataLoading] = useState(true);
  const [dadosProntos, setDadosProntos] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Iniciando o app...');
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  useEffect(() => {

    if (loading) return;

    const initData = async () => {

      if (!user) {
        setDadosProntos(false);
        setDataLoading(false);
        return;
      }
      setTimeout(()=> {setStatusMessage('Sincronizando informações...')},1000);
      try {
        await preCarregarDados();
        setStatusMessage('Quase lá...');
        await delay(1000);
        setDadosProntos(true);
      } catch {
        // Falha em preCarregarDados (ex.: 401). Garante signOut e libera
        // splash — interceptor de apiNotifications também tenta deslogar,
        // mas chamar aqui é defesa contra timing/registry race.
        setDadosProntos(false);
        await signOut();
      } finally {
        setDataLoading(false);
      }
    };

    initData();
  }, [loading, user]);

  const showSplash = loading || (user && !dadosProntos);

  if (showSplash) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FF6B35' }}>
        {/* Wordmark grande */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <Text
            style={{
              color: '#FFFFFF',
              fontFamily: 'Outfit_700Bold',
              fontSize: 96,
              letterSpacing: -4,
              lineHeight: 96,
            }}
          >
            Élo
          </Text>
          {/* Ponto amarelo decorativo */}
          <View
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: '#FCD34D',
              marginLeft: 8,
              marginBottom: 18,
            }}
          />
        </View>

        <ActivityIndicator size="large" color="#FCD34D" style={{ marginTop: 36 }} />

        <Text
          style={{
            marginTop: 18,
            color: 'rgba(255,255,255,0.85)',
            fontFamily: 'Outfit_500Medium',
            fontSize: 13,
            letterSpacing: 0.4,
          }}
        >
          {loading ? 'Verificando credenciais...' : statusMessage}
        </Text>
      </View>
    );
  }

  const stack = (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F3F4F6' },
      }}
    >
      {user ? (
        <>
          <Stack.Screen name="AppTabs" component={AppTabs} />
          <Stack.Screen
            name="Notificacoes"
            component={NotificacoesScreen}
            options={{ headerShown: true, title: 'Notificações' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="LoginScreen" component={LoginScreen} />
          <Stack.Screen name="PrimeiroAcessoScreen" component={PrimeiroAcessoScreen} />
        </>
      )}
    </Stack.Navigator>
  );

  return (
    <NavigationContainer>
      {user && <NotificationBootstrap />}
      {user ? <MenuSheetProvider>{stack}</MenuSheetProvider> : stack}
    </NavigationContainer>
  );
}

export function Routes() {
  return (
    <AuthProvider>
      <MainNavigator />
    </AuthProvider>
  );
}