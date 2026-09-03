import React, { useState } from "react";
import {
  TextInput as RNTextInput,
  View,
  Text,
  Pressable,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from "../../constants/colors";
import { cn } from "../../util/cn";

interface CustomTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onRightIconPress?: () => void;
  containerClassName?: string;
  inputClassName?: string;
  mask?: (value: string) => string;
  disabled?: boolean;
}

/**
 * Componente TextInput customizado com suporte a label, erro, ícone e máscara
 */
export function TextInput({
  label,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  containerClassName,
  inputClassName,
  mask,
  disabled,
  onChangeText,
  value,
  ...props
}: CustomTextInputProps) {

  const [isFocused, setIsFocused] = useState(false);

  const handleChangeText = (text: string) => {
    let finalText = text;

    if (mask) {
      finalText = mask(text);
    }

    onChangeText?.(finalText);
  };

  const borderColor = error ? colors.error : isFocused ? colors.primary : colors.gray400;

  return (
    <View className={cn("gap-2", containerClassName)}>
      {label && (
        <Text className="text-sm font-semibold text-foreground">{label}</Text>
      )}

      <View
        className={cn(
          "flex-row items-center gap-3 rounded-lg border px-4 py-3",
          disabled && "opacity-50"
        )}
        style={{
          borderColor,
          backgroundColor: disabled ? colors.gray400 : colors.white,
        }}
      >
        {icon && (
          <MaterialIcons
            name={icon}
            size={20}
            color={isFocused ? colors.primary : colors.primary}
          />
        )}

        <RNTextInput
          className={cn(
            "flex-1 text-base font-medium text-foreground",
            inputClassName
          )}
          placeholderTextColor={colors.gray400}
          value={value}
          onChangeText={handleChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={!disabled}
          {...props}
        />

        {rightIcon && (
          <Pressable
            onPress={onRightIconPress}
            disabled={disabled}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <MaterialIcons
              name={rightIcon}
              size={20}
              color={colors.primary}
            />
          </Pressable>
        )}
      </View>

      {error && (
        <Text className="text-xs font-medium" style={{ color: colors.error }}>
          {error}
        </Text>
      )}
    </View>
  );
}
