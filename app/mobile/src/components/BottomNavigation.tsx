import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const THEME_COLOR = colors.edu.primary;

interface AnimatedIconProps {
  focused: boolean;
  children: React.ReactNode;
}

function AnimatedIcon({ focused, children }: AnimatedIconProps) {
  const scale = useRef(new Animated.Value(focused ? 1.3 : 1)).current;
  const translateY = useRef(new Animated.Value(focused ? -6 : 0)).current;
  const opacity = useRef(new Animated.Value(focused ? 1 : 0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1.35 : 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 8,
      }),
      Animated.spring(translateY, {
        toValue: focused ? -8 : 0,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }),
      Animated.timing(opacity, {
        toValue: focused ? 1 : 0.85,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  return (
    <Animated.View
      style={{
        transform: [{ scale }, { translateY }],
        opacity,
      }}
    >
      {children}
    </Animated.View>
  );
}

export function BottomNavigation({
  state,
  navigation,
  insets,
}: BottomTabBarProps) {

  const currentRouteName = state.routes[state.index].name;

  const isFocused = (screen: string) => currentRouteName === screen;

  // Tinta escura: sobre o dourado, ícone branco fica em 1.96:1. O inativo
  // não desce de 0.7 pra não cair do mínimo de 3:1 de elemento gráfico.
  const iconColor = (screen: string) =>
    isFocused(screen) ? colors.edu.onPrimary : 'rgba(61,44,16,0.7)';

  return (
    <View
      style={{
        backgroundColor: THEME_COLOR,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 24,
        paddingTop: 12,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        elevation: 12,
      }}
      className="shadow-2xl z-20"
    >
      <View className="flex-row items-center justify-between px-8">

        {/* MURAL */}
        <TouchableOpacity
          onPress={() => navigation.navigate('MuralAvisosScreen' as never)}
          activeOpacity={0.9}
        >
          <AnimatedIcon focused={isFocused('MuralAvisosScreen')}>
            <Feather
              name="bell"
              size={24}
              color={iconColor('MuralAvisosScreen')}
            />
          </AnimatedIcon>
        </TouchableOpacity>        
        
        {/* BOLETIM */}
        <TouchableOpacity
          onPress={() => navigation.navigate('BoletimEscolarScreen' as never)}
          activeOpacity={0.9}
        >
          <AnimatedIcon focused={isFocused('BoletimEscolarScreen')}>
            <Feather
              name="bar-chart-2"
              size={24}
              color={iconColor('BoletimEscolarScreen')}
            />
          </AnimatedIcon>
        </TouchableOpacity>

        {/* HORÁRIOS */}
        <TouchableOpacity
          onPress={() => navigation.navigate('HorariosScreen' as never)}
          activeOpacity={0.9}
        >
          <AnimatedIcon focused={isFocused('HorariosScreen')}>
            <Feather
              name="clock"
              size={24}
              color={iconColor('HorariosScreen')}
            />
          </AnimatedIcon>
        </TouchableOpacity>

        {/* HOME CENTRAL */}
        <TouchableOpacity
          onPress={() => navigation.navigate('HomeScreen' as never)}
          activeOpacity={0.9}
          style={{ marginTop: -32 }}
        >
          <Animated.View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              // Azul complementar: círculo branco sobre dourado ficaria em
              // 1.96:1 e sumiria da barra.
              backgroundColor: colors.edu.accent,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: colors.edu.primary,
              elevation: 10,
              shadowColor: colors.shadowColor,
              shadowOpacity: 0.3,
              shadowRadius: 10,
            }}
          >
            <Ionicons name="home" size={30} color={colors.white} />
          </Animated.View>
        </TouchableOpacity>

        {/* CALENDÁRIO */}
        <TouchableOpacity
          onPress={() => navigation.navigate('CalendarioEscolarScreen' as never)}
          activeOpacity={0.9}
        >
          <AnimatedIcon focused={isFocused('CalendarioEscolarScreen')}>
            <Feather
              name="calendar"
              size={24}
              color={iconColor('CalendarioEscolarScreen')}
            />
          </AnimatedIcon>
        </TouchableOpacity>

        {/* SOLICITAÇÕES */}
        <TouchableOpacity
          onPress={() => navigation.navigate('SolicitacoesScreen' as never)}
          activeOpacity={0.9}
        >
          <AnimatedIcon focused={isFocused('SolicitacoesScreen')}>
            <Feather
              name="file-text"
              size={24}
              color={iconColor('SolicitacoesScreen')}
            />
          </AnimatedIcon>
        </TouchableOpacity>

        {/* CONTEUDO */}
        <TouchableOpacity
          onPress={() => navigation.navigate('ConteudoScreen' as never)}
          activeOpacity={0.9}
        >
          <AnimatedIcon focused={isFocused('ConteudoScreen')}>
            <Feather
              name="book"
              size={24}
              color={iconColor('ConteudoScreen')}
            />
          </AnimatedIcon>
        </TouchableOpacity>     

      </View>
    </View>
  );
}
