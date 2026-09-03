import React from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  type PressableProps,
  ViewStyle,
} from "react-native";
import { colors, componentColors } from "../../constants/colors";
import { cn } from "../../util/cn";

interface ButtonProps extends PressableProps {
  label: string;
  variant?: "primary" | "secondary" | "outline" | "danger" | "success";
  size?: "small" | "medium" | "large";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

// Hex direto (não classe Tailwind): estes valores vão pro `style` do
// Pressable, que só aceita cor real.
const VARIANTS = {
  primary: { bg: componentColors.buttonPrimary, text: colors.white, border: 'transparent' },
  secondary: { bg: componentColors.buttonSecondary, text: colors.white, border: 'transparent' },
  outline: { bg: 'transparent', text: colors.edu.dark, border: colors.edu.dark },
  danger: { bg: colors.error, text: colors.white, border: 'transparent' },
  success: { bg: colors.success, text: colors.white, border: 'transparent' },
} as const;

// Rótulo do estado desabilitado. Branco sobre o cinza de desabilitado dá
// 1.57:1 — o botão some da tela. Este cinza escuro fica em 4.90:1.
const DISABLED_LABEL = colors.gray600;

const SIZES = {
  small: { padding: "px-4 py-2.5", radius: 10, font: 14, minHeight: 40 },
  medium: { padding: "px-6 py-3.5", radius: 12, font: 15, minHeight: 48 },
  large: { padding: "px-8 py-4", radius: 14, font: 16, minHeight: 56 },
} as const;

export default function Button({
  label,
  variant = "primary",
  size = "medium",
  loading = false,
  disabled = false,
  fullWidth = false,
  className,
  onPress,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const v = VARIANTS[variant];
  const s = SIZES[size];

  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={cn("flex-row items-center justify-center", s.padding, className)}
      style={({ pressed }): ViewStyle => ({
        backgroundColor: isDisabled ? componentColors.buttonDisabled : v.bg,
        borderRadius: s.radius,
        borderWidth: variant === "outline" ? 1.5 : 0,
        borderColor: isDisabled ? componentColors.buttonDisabled : v.border,
        minHeight: s.minHeight,
        minWidth: fullWidth ? undefined : 100,
        alignSelf: fullWidth ? "stretch" : undefined,
        opacity: pressed && !isDisabled ? 0.85 : 1,
        transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
        // Sombra só em botão sólido — no outline polui a borda.
        ...(variant === "outline" || isDisabled
          ? {}
          : {
              elevation: 2,
              shadowColor: colors.shadowColor,
              shadowOpacity: 0.2,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
            }),
      })}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isDisabled ? DISABLED_LABEL : v.text} />
      ) : (
        <Text
          className="text-center font-bold"
          numberOfLines={1}
          style={{
            color: isDisabled ? DISABLED_LABEL : v.text,
            fontSize: s.font,
            letterSpacing: 0.2,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
