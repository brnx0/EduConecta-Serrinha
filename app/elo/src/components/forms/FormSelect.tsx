import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

interface FormSelectProps {
    label: string;
    value: { id: number; label: string } | null;
    options: { id: number; label: string }[];
    onSelect: (val: { id: number; label: string }) => void;
    required?: boolean;
    placeholder?: string;
    disabled?: boolean;
    loading?: boolean;
}

/**
 * FormSelect Élo — gatilho com mesmo visual do FormInput. Modal
 * sheet bottom (em vez de centro) com radius 32 + lista checkable.
 */
export function FormSelect({
    label,
    value,
    options,
    onSelect,
    required,
    placeholder = 'Selecione...',
    disabled = false,
    loading = false,
}: FormSelectProps) {
    const [visible, setVisible] = React.useState(false);
    const isInteractionDisabled = disabled || loading;

    return (
        <View style={{ marginBottom: 14, opacity: disabled ? 0.5 : 1 }}>
            <Text
                style={{
                    fontFamily: 'Outfit_600SemiBold',
                    fontSize: 11,
                    color: colors.inkSoft,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    marginBottom: 6,
                    paddingHorizontal: 4,
                }}
            >
                {label}
                {required && <Text style={{ color: colors.brand.primary }}> *</Text>}
            </Text>

            <TouchableOpacity
                onPress={() => !isInteractionDisabled && setVisible(true)}
                disabled={isInteractionDisabled}
                activeOpacity={0.7}
                style={{
                    height: 56,
                    paddingHorizontal: 16,
                    backgroundColor: colors.paperWarm,
                    borderRadius: 18,
                    borderWidth: 1.5,
                    borderColor: 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Text
                    style={{
                        flex: 1,
                        color: value ? colors.ink : '#94A3B8',
                        fontFamily: value ? 'Outfit_600SemiBold' : 'Outfit_400Regular',
                        fontSize: 15,
                    }}
                >
                    {loading ? 'Carregando...' : value?.label || placeholder}
                </Text>
                {loading ? (
                    <ActivityIndicator size="small" color={colors.brand.primary} />
                ) : (
                    <View
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: '#FFFFFF',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Feather name="chevron-down" size={16} color={colors.ink} />
                    </View>
                )}
            </TouchableOpacity>

            <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => setVisible(false)}
                        activeOpacity={1}
                    />
                    <View
                        style={{
                            backgroundColor: colors.paper,
                            borderTopLeftRadius: 32,
                            borderTopRightRadius: 32,
                            padding: 24,
                            maxHeight: '70%',
                        }}
                    >
                        <View
                            style={{
                                width: 48,
                                height: 4,
                                backgroundColor: colors.hairline,
                                borderRadius: 999,
                                alignSelf: 'center',
                                marginBottom: 16,
                            }}
                        />
                        <Text
                            style={{
                                fontFamily: 'Outfit_700Bold',
                                fontSize: 20,
                                color: colors.ink,
                                marginBottom: 16,
                                letterSpacing: -0.5,
                            }}
                        >
                            {label}
                        </Text>

                        <FlatList
                            data={options}
                            keyExtractor={(item) => String(item.id)}
                            ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
                            renderItem={({ item }) => {
                                const ativo = value?.id === item.id;
                                return (
                                    <TouchableOpacity
                                        onPress={() => {
                                            onSelect(item);
                                            setVisible(false);
                                        }}
                                        activeOpacity={0.8}
                                        style={{
                                            padding: 16,
                                            borderRadius: 16,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            backgroundColor: ativo ? colors.brand.primaryLight : '#FFFFFF',
                                            borderWidth: 1,
                                            borderColor: ativo ? colors.brand.primary : colors.hairline,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontFamily: ativo ? 'Outfit_700Bold' : 'Outfit_500Medium',
                                                fontSize: 15,
                                                color: ativo ? colors.brand.primaryDark : colors.ink,
                                            }}
                                        >
                                            {item.label}
                                        </Text>
                                        {ativo && (
                                            <Feather name="check" size={18} color={colors.brand.primary} />
                                        )}
                                    </TouchableOpacity>
                                );
                            }}
                        />

                        <TouchableOpacity
                            onPress={() => setVisible(false)}
                            style={{
                                marginTop: 16,
                                paddingVertical: 14,
                                borderRadius: 999,
                                alignItems: 'center',
                                backgroundColor: colors.paperWarm,
                            }}
                        >
                            <Text style={{ color: colors.ink, fontFamily: 'Outfit_700Bold', fontSize: 14 }}>
                                Cancelar
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
