import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
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
  style?: any;
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
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, tension: 300, friction: 10 }).start();

  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start();

  const VARIANT = {
    primary: styles.primary,
    secondary: styles.secondary,
    danger: styles.danger,
    ghost: styles.ghost,
  }[variant];

  const SIZE = { sm: styles.size_sm, md: styles.size_md, lg: styles.size_lg }[size];

  const TEXT_VARIANT = {
    primary: styles.text_primary,
    secondary: styles.text_secondary,
    danger: styles.text_danger,
    ghost: styles.text_ghost,
  }[variant];

  const TEXT_SIZE = {
    sm: styles.textSize_sm,
    md: styles.textSize_md,
    lg: styles.textSize_lg,
  }[size];

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        style={[styles.base, VARIANT, SIZE, disabled && styles.disabled]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'primary' || variant === 'danger' ? Colors.white : Colors.sage}
            size="small"
          />
        ) : (
          <Text style={[styles.text, TEXT_VARIANT, TEXT_SIZE, textStyle]}>{label}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md },
  primary: { backgroundColor: Colors.sage },
  secondary: { backgroundColor: Colors.creamDark, borderWidth: 1.5, borderColor: Colors.sage },
  danger: { backgroundColor: Colors.coral },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.45 },
  size_sm: { paddingVertical: Spacing[2], paddingHorizontal: Spacing[4] },
  size_md: { paddingVertical: Spacing[3], paddingHorizontal: Spacing[6] },
  size_lg: { paddingVertical: Spacing[4], paddingHorizontal: Spacing[8] },
  text: { fontWeight: '700', letterSpacing: 0.1 },
  text_primary: { color: Colors.white },
  text_secondary: { color: Colors.sageDark },
  text_danger: { color: Colors.white },
  text_ghost: { color: Colors.sage },
  textSize_sm: { fontSize: FontSizes.sm },
  textSize_md: { fontSize: FontSizes.base },
  textSize_lg: { fontSize: FontSizes.lg },
});
