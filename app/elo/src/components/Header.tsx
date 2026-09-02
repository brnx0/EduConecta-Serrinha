import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { MenuButton } from './MenuSheet';

interface HeaderProps {
    title: string;
    showBack?: boolean;
    onBackPress?: () => void;
    rightComponent?: React.ReactNode;
    children?: React.ReactNode;
    containerStyle?: ViewStyle;
    /** Esconde botão de menu padrão. Default: false (mostra MenuButton). */
    hideMenu?: boolean;
}

/**
 * Header Élo — minimal, paper background, wordmark com acento amarelo.
 * Sem gradiente; sem sombra dramática; tipografia distintiva.
 */
export function Header({
    title,
    showBack = true,
    onBackPress,
    rightComponent,
    children,
    containerStyle,
    hideMenu = false,
}: HeaderProps) {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    const handleGoBack = () => {
        if (onBackPress) onBackPress();
        else navigation.goBack();
    };

    return (
        <View
            style={[
                {
                    backgroundColor: colors.paper,
                    paddingTop: insets.top + 8,
                    paddingBottom: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.hairline,
                },
                containerStyle,
            ]}
        >
            <StatusBar style="dark" backgroundColor="transparent" translucent />
            <View className="flex-row items-center px-5">
                {showBack ? (
                    <TouchableOpacity
                        onPress={handleGoBack}
                        className="w-11 h-11 items-center justify-center rounded-full"
                        style={{ backgroundColor: colors.paperWarm }}
                        activeOpacity={0.7}
                    >
                        <Feather name="arrow-left" size={20} color={colors.ink} />
                    </TouchableOpacity>
                ) : (
                    <View className="w-11" />
                )}

                <View className="flex-1 ml-3">
                    <Text
                        style={{
                            fontFamily: 'Outfit_700Bold',
                            fontSize: 22,
                            color: colors.ink,
                            letterSpacing: -0.5,
                        }}
                        numberOfLines={1}
                    >
                        {title}
                    </Text>
                </View>

                {rightComponent ?? (hideMenu ? <View className="w-11" /> : <MenuButton />)}
            </View>

            {children && <View className="mt-3 px-5">{children}</View>}
        </View>
    );
}
