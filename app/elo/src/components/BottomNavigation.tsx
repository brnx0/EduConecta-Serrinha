import React from 'react';
import { View, TouchableOpacity, Text, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

/**
 * Bottom nav Élo — barra flutuante com píldoras.
 *
 * Filosofia: tab ativa "infla" virando pílula com label visível;
 * inativos só ícone. Background paper com sombra colorida laranja.
 * Sem píldora central (HomeScreen é uma das 5 tabs igual às outras).
 */

interface TabConfig {
  route: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}

const TABS: TabConfig[] = [
  { route: 'HomeScreen', label: 'Início', icon: 'home' },
  { route: 'BoletimEscolarScreen', label: 'Notas', icon: 'bar-chart-2' },
  { route: 'CalendarioEscolarScreen', label: 'Agenda', icon: 'calendar' },
  { route: 'MuralAvisosScreen', label: 'Avisos', icon: 'bell' },
  { route: 'SolicitacoesScreen', label: 'Mais', icon: 'grid' },
];

interface PillTabProps {
  focused: boolean;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
}

function PillTab({ focused, label, icon, onPress }: PillTabProps) {
  // Inativos: largura fixa 48px (só ícone). Ativo: flex 1 (cresce + label).
  const tabStyle = focused
    ? {
        flex: 1,
        height: 48,
        borderRadius: 24,
        paddingHorizontal: 14,
        backgroundColor: colors.brand.primary,
      }
    : {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'transparent' as const,
      };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginHorizontal: 2,
        },
        tabStyle,
      ]}
    >
      <Feather
        name={icon}
        size={22}
        color={focused ? '#FFFFFF' : colors.inkSoft}
      />
      {focused && (
        <Text
          numberOfLines={1}
          style={{
            color: '#FFFFFF',
            fontFamily: 'Outfit_600SemiBold',
            fontSize: 13,
            marginLeft: 8,
            letterSpacing: -0.2,
          }}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function BottomNavigation({ state, navigation, insets }: BottomTabBarProps) {
  const currentRouteName = state.routes[state.index].name;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: insets.bottom > 0 ? insets.bottom + 8 : 18,
        left: 12,
        right: 12,
      }}
    >
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 32,
          paddingHorizontal: 8,
          paddingVertical: 8,
          flexDirection: 'row',
          alignItems: 'center',
          // sombra colorida pra destacar do paper
          ...Platform.select({
            android: { elevation: 14 },
            ios: {
              shadowColor: colors.brand.primary,
              shadowOpacity: 0.25,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
            },
          }),
          borderWidth: 1,
          borderColor: colors.hairline,
        }}
      >
        {TABS.map((tab) => (
          <PillTab
            key={tab.route}
            focused={currentRouteName === tab.route}
            label={tab.label}
            icon={tab.icon}
            onPress={() => navigation.navigate(tab.route as never)}
          />
        ))}
      </View>
    </View>
  );
}
