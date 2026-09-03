import React from 'react';
import { View, Text, Switch, Platform } from 'react-native';
import { colors } from '../../constants/colors';

interface FormSwitchProps {
    label: string;
    value: boolean;
    onChange: (val: boolean) => void;
    required?: boolean;
    onLabel?: string;
    offLabel?: string;
}

export function FormSwitch({
    label,
    value,
    onChange,
    required,
    onLabel = 'Ativo',
    offLabel = 'Inativo',
}: FormSwitchProps) {
    return (
        <View className="mb-4">
            {/* Label */}
            <Text className="text-slate-700 font-semibold mb-2">
                {label} {required && <Text className="text-red-500">*</Text>}
            </Text>

            {/* Campo */}
            <View className="border border-gray-300 rounded-lg h-12 px-4 bg-white flex-row items-center justify-between">
                <Text
                    className={`text-sm font-semibold ${value ? 'text-edu-dark' : 'text-slate-400'
                        }`}
                >
                    {value ? onLabel : offLabel}
                </Text>
                <View
                    style={{
                        transform: [{ scale: Platform.OS === 'ios' ? 0.9 : 1 }],
                    }}
                    className="justify-center"
                >
                    <Switch
                        value={value}
                        onValueChange={onChange}
                        trackColor={{ false: '#CBD5E1', true: colors.edu.dark }}
                        thumbColor="#ffffff"
                    />
                </View>
            </View>
        </View>
    );
}
