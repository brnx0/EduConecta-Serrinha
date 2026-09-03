import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../constants/colors';
import { StatusBar } from 'expo-status-bar';

// Definição das Propriedades que o Header aceita
interface HeaderProps {
    title: string;
    showBack?: boolean;
    onBackPress?: () => void;
    rightComponent?: React.ReactNode;
    children?: React.ReactNode;
    containerStyle?: ViewStyle;
}

const THEME_COLOR = colors.edu.primary;

export function Header({
    title,
    showBack = true,
    onBackPress,
    rightComponent,
    children,
    containerStyle
}: HeaderProps) {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    const handleGoBack = () => {
        if (onBackPress) {
            onBackPress();
        } else {
            navigation.goBack();
        }
    };

    return (

        <View
            className="rounded-b-[32px] shadow-lg z-10 relative overflow-hidden"
            style={[
                {
                    backgroundColor: colors.edu.primary,
                    paddingTop: insets.top + 10,
                    paddingBottom: 10,
                    elevation: 6
                },
                containerStyle
            ]}
        >
            {/* Ícones escuros: o dourado é claro demais pra barra clara. */}
            <StatusBar style="dark" backgroundColor="transparent" translucent />
            <View className="flex-row items-center justify-between px-6 mb-2">

                {showBack ? (
                    <TouchableOpacity
                        onPress={handleGoBack}
                        className="w-10 h-10 bg-black/10 rounded-xl items-center justify-center"
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={24} color={colors.edu.onPrimary} />
                    </TouchableOpacity>
                ) : (
                    <View className="w-10" />
                )}

                <Text
                    className="text-lg font-bold text-center flex-1 mx-2"
                    style={{ color: colors.edu.onPrimary }}
                    numberOfLines={1}
                >
                    {title}
                </Text>

                {rightComponent ? (
                    rightComponent
                ) : (
                    <View className="w-10" />
                )}
            </View>

            {children && (
                <View className="mt-2">
                    {children}
                </View>
            )}
        </View>
    );
}