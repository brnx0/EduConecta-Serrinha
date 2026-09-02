import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  type PressableProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../../constants/colors';
import { cn } from '../../util/cn';

interface ButtonProps extends PressableProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Button Élo — px tipográfico generoso, radius full pílulas em
 * sizes small/medium pra reforçar tom lúdico. Variants com cores sólidas
 * da paleta brand. Press: scale 0.97 + dim alpha.
 */
export default function Button({
  label,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  className,
  onPress,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const sizeMap = {
    small: { padX: 16, padY: 10, fontSize: 13, radius: 999 },
    medium: { padX: 22, padY: 14, fontSize: 15, radius: 999 },
    large: { padX: 28, padY: 18, fontSize: 17, radius: 28 },
  } as const;

  const palette = {
    primary: { bg: colors.brand.primary, fg: '#FFFFFF' },
    secondary: { bg: colors.paperWarm, fg: colors.ink },
    danger: { bg: colors.error, fg: '#FFFFFF' },
    success: { bg: colors.success, fg: '#FFFFFF' },
    outline: { bg: 'transparent', fg: colors.ink },
  } as const;

  const s = sizeMap[size];
  const v = palette[variant];

  const baseStyle: ViewStyle = {
    backgroundColor: v.bg,
    paddingHorizontal: s.padX,
    paddingVertical: s.padY,
    borderRadius: s.radius,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    ...(variant === 'outline'
      ? { borderWidth: 1.5, borderColor: colors.ink }
      : null),
  };

  const textStyle: TextStyle = {
    color: v.fg,
    fontFamily: 'Outfit_700Bold',
    fontSize: s.fontSize,
    letterSpacing: -0.2,
  };

  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      className={cn(className)}
      style={({ pressed }) => ([
        baseStyle,
        {
          opacity: isDisabled ? 0.45 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.97 : 1 }],
        },
      ] as ViewStyle[])}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.fg} />
      ) : (
        <Text style={textStyle}>{label}</Text>
      )}
    </Pressable>
  );
}
