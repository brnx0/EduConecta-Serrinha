import React, { useState } from "react";
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
  variant?: "primary" | "secondary" | "outline" | "danger" | "success";
  size?: "small" | "medium" | "large";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

// Fundo, borda e raio vão por className, não por `style`. É o mesmo caminho
// de todo botão visível do app (TouchableOpacity + bg-*). Quando o fundo ia
// só pelo `style`, o NativeWind 2 embrulhava o Pressable e o fundo não
// chegava na view — botão ficava branco no branco, clicável mas invisível.
// Classes literais: o NativeWind compila só o que acha escrito no fonte.
const VARIANTS = {
  primary: { box: "bg-edu-dark", label: "text-white", spinner: colors.white },
  secondary: { box: "bg-edu-accent", label: "text-white", spinner: colors.white },
  outline: { box: "bg-transparent border-[1.5px] border-edu-dark", label: "text-edu-dark", spinner: colors.edu.dark },
  danger: { box: "bg-[#B02B2C]", label: "text-white", spinner: colors.white },
  success: { box: "bg-[#4A7A1F]", label: "text-white", spinner: colors.white },
} as const;

// Rótulo cinza escuro no desabilitado: branco sobre #D3CEC3 dá 1.57:1 e o
// botão some. #4B5563 fica em 4.90:1.
const DISABLED = { box: "bg-[#D3CEC3]", label: "text-[#4B5563]", spinner: colors.gray600 };

const SIZES = {
  small: { box: "px-4 py-2.5 rounded-[10px] min-h-[40px]", font: 14 },
  medium: { box: "px-6 py-3.5 rounded-[12px] min-h-[48px]", font: 15 },
  large: { box: "px-8 py-4 rounded-[14px] min-h-[56px]", font: 16 },
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
  const v = isDisabled ? DISABLED : VARIANTS[variant];
  const s = SIZES[size];
  const [pressed, setPressed] = useState(false);
  const active = pressed && !isDisabled;

  // Só o que depende de estado em runtime fica no style.
  const style: ViewStyle = {
    opacity: active ? 0.85 : 1,
    transform: [{ scale: active ? 0.98 : 1 }],
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
  };

  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={cn(
        "flex-row items-center justify-center",
        s.box,
        v.box,
        isDisabled && variant === "outline" && "border-[1.5px] border-[#D3CEC3]",
        fullWidth ? "self-stretch" : "min-w-[100px]",
        className
      )}
      style={style}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.spinner} />
      ) : (
        <Text
          className={cn("text-center font-bold", v.label)}
          numberOfLines={1}
          style={{ fontSize: s.font, letterSpacing: 0.2 }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
