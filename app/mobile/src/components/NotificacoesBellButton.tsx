import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useNotificacoesNaoLidas } from '../hooks/useNotificacoesNaoLidas';

interface Props {
    iconColor?: string;
    bgClass?: string;
    borderClass?: string;
}

/**
 * Sino de notificações com badge de não-lidas. Tap navega pra
 * tela "Notificacoes" no Stack.
 */
export function NotificacoesBellButton({
    iconColor = 'white',
    bgClass = 'bg-white/15',
    borderClass = 'border border-white/20',
}: Props) {
    const navigation = useNavigation<any>();
    const { count } = useNotificacoesNaoLidas();

    return (
        <TouchableOpacity
            onPress={() => navigation.navigate('Notificacoes')}
            style={{
                width: 40,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#eff6ff',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#dbeafe',
            }}
            activeOpacity={0.7}
        >
            <Feather name="bell" size={20} color={iconColor} />
            {count > 0 && (
                <View
                    style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        minWidth: 18,
                        height: 18,
                        paddingHorizontal: 4,
                        backgroundColor: '#ef4444',
                        borderRadius: 9,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 2,
                        borderColor: '#ffffff',
                    }}
                >
                    <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}>
                        {count > 99 ? '99+' : count}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}
