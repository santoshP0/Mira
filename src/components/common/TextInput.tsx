import React from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Colors, FontSizes, Radius, Spacing } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function TextInput({ label, error, containerStyle, style, ...props }: InputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <RNTextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={Colors.gray400}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing[4],
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    color: Colors.navyLight,
    marginBottom: Spacing[1],
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    fontSize: FontSizes.base,
    color: Colors.navy,
  },
  inputError: {
    borderColor: Colors.coral,
  },
  error: {
    marginTop: Spacing[1],
    fontSize: FontSizes.xs,
    color: Colors.coral,
  },
});
