import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

export function EmptyState() {
    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
            <View
                style={{
                    width: 92,
                    height: 92,
                    borderRadius: 32,
                    backgroundColor: colors.brand.primaryLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 18,
                }}
            >
                <Feather name="bell-off" size={36} color={colors.brand.primary} />
            </View>
            <Text
                style={{
                    fontFamily: 'Outfit_700Bold',
                    fontSize: 20,
                    color: colors.ink,
                    letterSpacing: -0.6,
                    textAlign: 'center',
                }}
            >
                Sem notificações ainda
            </Text>
            <Text
                style={{
                    fontFamily: 'Outfit_400Regular',
                    fontSize: 13,
                    color: colors.inkSoft,
                    textAlign: 'center',
                    marginTop: 8,
                    lineHeight: 19,
                }}
            >
                Quando seu filho passar pelo leitor da escola você verá os avisos aqui.
            </Text>
        </View>
    );
}
