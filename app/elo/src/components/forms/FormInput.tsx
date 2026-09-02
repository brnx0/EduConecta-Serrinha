import React, { useState, forwardRef } from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { colors } from '../../constants/colors';

interface FormInputProps extends TextInputProps {
    label?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    icon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

/**
 * FormInput Élo — radius 18, fundo paperWarm em rest, branco em
 * focus, borda animada laranja em focus, ring vermelho em erro. Label
 * uppercase tracking wide micro acima.
 */
export const FormInput = forwardRef<TextInput, FormInputProps>(
    ({ label, error, required, disabled, icon, rightIcon, onFocus, onBlur, ...rest }, ref) => {
        const [isFocused, setIsFocused] = useState(false);

        const containerStyle = {
            borderRadius: 18,
            borderWidth: 1.5,
            paddingHorizontal: 16,
            height: 56,
            flexDirection: 'row' as const,
            alignItems: 'center' as const,
            backgroundColor: error
                ? '#FEF2F2'
                : isFocused
                    ? '#FFFFFF'
                    : colors.paperWarm,
            borderColor: error
                ? colors.error
                : isFocused
                    ? colors.brand.primary
                    : 'transparent',
            opacity: disabled ? 0.5 : 1,
        };

        return (
            <View style={{ marginBottom: 14 }}>
                {label && (
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'flex-end',
                            marginBottom: 6,
                            paddingHorizontal: 4,
                        }}
                    >
                        <Text
                            style={{
                                fontFamily: 'Outfit_600SemiBold',
                                fontSize: 11,
                                color: colors.inkSoft,
                                letterSpacing: 1,
                                textTransform: 'uppercase',
                            }}
                        >
                            {label}
                            {required && <Text style={{ color: colors.brand.primary }}> *</Text>}
                        </Text>
                        {error && (
                            <Text
                                style={{
                                    fontFamily: 'Outfit_600SemiBold',
                                    color: colors.error,
                                    fontSize: 11,
                                }}
                            >
                                {error}
                            </Text>
                        )}
                    </View>
                )}

                <View style={containerStyle}>
                    {icon && <View style={{ marginRight: 12 }}>{icon}</View>}

                    <TextInput
                        ref={ref}
                        style={{
                            flex: 1,
                            color: disabled ? colors.inkSoft : colors.ink,
                            fontFamily: 'Outfit_500Medium',
                            fontSize: 15,
                            height: '100%',
                        }}
                        placeholderTextColor="#94A3B8"
                        editable={!disabled}
                        onFocus={(e) => {
                            setIsFocused(true);
                            onFocus?.(e);
                        }}
                        onBlur={(e) => {
                            setIsFocused(false);
                            onBlur?.(e);
                        }}
                        textAlignVertical="center"
                        {...rest}
                    />

                    {rightIcon && <View style={{ marginLeft: 12 }}>{rightIcon}</View>}
                </View>

                {!label && error && (
                    <Text
                        style={{
                            color: colors.error,
                            fontSize: 11,
                            marginTop: 4,
                            marginLeft: 4,
                            fontFamily: 'Outfit_500Medium',
                        }}
                    >
                        {error}
                    </Text>
                )}
            </View>
        );
    }
);
