import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/home/HomeScreen';
import HorariosScreen from '../screens/horarios/HorariosScreen';
import BoletimEscolarScreen from '../screens/boletim/BoletimEscolarScreen';
import CalendarioEscolarScreen from '../screens/calendarioEscolar/CalendarioEscolarScreen';
import SolicitacoesScreen from '../screens/solicitacoes/SolicitacoesScreen';
import MuralAvisosScreen from '../screens/mural/MuralAvisosScreen';
import { BottomNavigation } from '../components/BottomNavigation';
import ConteudoScreen from '../screens/conteudo/ConteudoScreen';
import FrequenciaScreen from '../screens/frequencia/FrequenciaScreen';
import FrequenciaDiariaScreen from '../screens/frequencia/FrequenciaDiariaScreen';
import AutorizacoesScreen from '../screens/autorizacoes/AutorizacoesScreen';
import OcorrenciasScreen from '../screens/ocorrencia/OcorrenciaScreen';


export type AppTabParamList = {
  HomeScreen: undefined;
  HorariosScreen: undefined;
  BoletimEscolarScreen: undefined;
  CalendarioEscolarScreen: undefined;
  SolicitacoesScreen: undefined;
  MuralAvisosScreen: undefined;
  ConteudoScreen: undefined;
  FrequenciaScreen: undefined;
  FrequenciaDiariaScreen: undefined;
  OcorrenciaScreen: undefined;
  AutorizacoesScreen: undefined;

};

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false
      }}
      tabBar={(props) => <BottomNavigation {...props} />}
    >
      <Tab.Screen name="HomeScreen" component={HomeScreen} />
      <Tab.Screen name="HorariosScreen" component={HorariosScreen} />
      <Tab.Screen name="BoletimEscolarScreen" component={BoletimEscolarScreen}  />
      <Tab.Screen name="CalendarioEscolarScreen" component={CalendarioEscolarScreen} />
      <Tab.Screen name="SolicitacoesScreen" component={SolicitacoesScreen} />
      <Tab.Screen name="MuralAvisosScreen" component={MuralAvisosScreen} />
      <Tab.Screen name="ConteudoScreen" component={ConteudoScreen} />
      <Tab.Screen name="FrequenciaScreen" component={FrequenciaScreen} />
      <Tab.Screen name="FrequenciaDiariaScreen" component={FrequenciaDiariaScreen} />
      <Tab.Screen name="OcorrenciaScreen" component={OcorrenciasScreen} />
      <Tab.Screen name="AutorizacoesScreen" component={AutorizacoesScreen} />
    </Tab.Navigator>
  );
}
