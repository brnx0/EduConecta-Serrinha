import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useNotificacoesNaoLidas } from '../hooks/useNotificacoesNaoLidas';
import { colors } from '../constants/colors';

/**
 * Sino Élo — fundo paperWarm, ícone ink, badge laranja sólido.
 * Tap navega pra tela `Notificacoes` no Stack.
 */
export function NotificacoesBellButton() {
    const navigation = useNavigation<any>();
    const { count } = useNotificacoesNaoLidas();

    return (
        <TouchableOpacity
            onPress={() => navigation.navigate('Notificacoes')}
            activeOpacity={0.7}
            style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.paperWarm,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Feather name="bell" size={20} color={colors.ink} />
            {count > 0 && (
                <View
                    style={{
                        position: 'absolute',
                        top: -2,
                        right: -2,
                        minWidth: 20,
                        height: 20,
                        paddingHorizontal: 4,
                        backgroundColor: colors.brand.primary,
                        borderRadius: 999,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 2,
                        borderColor: colors.paper,
                    }}
                >
                    <Text
                        style={{
                            color: '#FFFFFF',
                            fontSize: 10,
                            fontFamily: 'Outfit_700Bold',
                        }}
                    >
                        {count > 99 ? '99+' : count}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}
