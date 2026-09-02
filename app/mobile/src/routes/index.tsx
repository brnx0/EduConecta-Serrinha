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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#017cbb' }}>

        <Image
          source={require('../../assets/favicon.png')}
          style={{ width: 120, height: 120, resizeMode: 'contain', marginBottom: 20 }}
        />

        <ActivityIndicator size="large" color="#ffffff" />

        <Text style={{ marginTop: 15, color: '#ffffff', fontSize: 12, fontWeight: '500' }}>

          {loading ? 'Verificando credenciais...' : statusMessage}
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user && <NotificationBootstrap />}
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F3F4F6' }
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