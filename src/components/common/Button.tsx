import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, FontSizes, Radius, Spacing } from '../../constants/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], styles[`size_${size}`], disabled && styles.disabled, style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.white : Colors.sage} />
      ) : (
        <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`], textStyle]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  primary: {
    backgroundColor: Colors.sage,
  },
  secondary: {
    backgroundColor: Colors.creamDark,
    borderWidth: 1.5,
    borderColor: Colors.sage,
  },
  danger: {
    backgroundColor: Colors.coral,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  size_sm: {
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
  },
  size_md: {
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[6],
  },
  size_lg: {
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[8],
  },
  text: {
    fontWeight: '600',
  },
  text_primary: {
    color: Colors.white,
  },
  text_secondary: {
    color: Colors.sage,
  },
  text_danger: {
    color: Colors.white,
  },
  text_ghost: {
    color: Colors.sage,
  },
  textSize_sm: { fontSize: FontSizes.sm },
  textSize_md: { fontSize: FontSizes.base },
  textSize_lg: { fontSize: FontSizes.lg },
});
