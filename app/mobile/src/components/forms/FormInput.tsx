import React, { useState, forwardRef } from 'react';
import { View, Text, TextInput, TextInputProps, Platform } from 'react-native';

interface FormInputProps extends TextInputProps {
    label?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    icon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

// 1. Envolvemos o componente com forwardRef
export const FormInput = forwardRef<TextInput, FormInputProps>(({
    label,
    error,
    required,
    disabled,
    icon,
    rightIcon,
    onFocus,
    onBlur,
    style,
    ...rest
}, ref) => { // 2. Recebemos a 'ref' como segundo argumento
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View className="mb-4">
            {label && (
                <View className="flex-row justify-between items-end mb-2 ml-1">
                    <Text className="text-slate-600 font-medium">
                        {label} {required && <Text className="text-red-500">*</Text>}
                    </Text>
                    {error && <Text className="text-red-500 text-xs font-medium">{error}</Text>}
                </View>
            )}

            <View
                className={`w-full h-14 flex-row items-center px-4 rounded-xl border ${
                    error ? 'border-red-400 bg-red-50' : isFocused ? 'border-edu-primary bg-white' : 'border-slate-200 bg-slate-50'
                } ${disabled ? 'opacity-60 bg-slate-100' : ''}`}
            >
                {icon && (
                    <View className="mr-3">
                        {icon}
                    </View>
                )}

                <TextInput 
                    ref={ref} // 3. Vinculamos a ref ao TextInput real
                    className={`flex-1 text-slate-800 font-medium py-0 h-full ${disabled ? 'text-slate-400' : ''}`}
                    placeholderTextColor="#94a3b8"
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

                {rightIcon && (
                    <View className="ml-3">
                        {rightIcon}
                    </View>
                )}
            </View>

            {!label && error && (
                <Text className="text-red-500 text-xs mt-1 ml-1">{error}</Text>
            )}
        </View>
    );
});