import React from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  type PressableProps,
  ViewStyle,
} from "react-native";
import { colors } from "../../constants/colors";
import { cn } from "../../util/cn";

interface ButtonProps extends PressableProps {
  label: string;
  variant?: "primary" | "secondary" | "danger" | "success";
  size?: "small" | "medium" | "large";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function Button({
  label,
  variant = "primary",
  size = "medium",
  loading = false,
  disabled = false,
  className,
  onPress,
  ...props
}: ButtonProps) {
  
  const isDisabled = disabled || loading;

  const sizeStyles = {
    small: "px-4 py-2 rounded-lg",
    medium: "px-6 py-3 rounded-lg",
    large: "px-8 py-4 rounded-xl",
  };

  const variantStyles = {
    primary: {
      bg: 'bg-[#2A93E2]', // Cor principal do botão
      text: colors.white,
    },
    secondary: {
      bg: `bg-[#4B5563]`, // Se for o botão de "Cancelar", geralmente usamos uma cor neutra ou erro
      text: colors.white,
    },
    danger: {
      bg: `bg-[#EF4444]`,
      text: colors.white,
    },
    success: {
      bg: `bg-[#10B981]`,
      text: colors.white,
    }

  };

  const currentVariant = variantStyles[variant];

  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      // Unimos as classes do Tailwind aqui
      className={cn("items-center justify-center", sizeStyles[size], className, currentVariant.bg, isDisabled ? 'opacity-50' : '')}
      // O estilo inline cuida das cores dinâmicas e estados de pressão
      style={({ pressed }): ViewStyle => ({
        backgroundColor: currentVariant.bg,
        opacity: pressed ? 0.8 : 1,
        transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
        minWidth: 100,
      })}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={currentVariant.text} />
      ) : (
        <Text
          className="text-center font-bold"
          style={{ 
            color: currentVariant.text, 
            fontSize: size === "small" ? 14 : 16 
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}