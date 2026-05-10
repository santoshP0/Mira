import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  retry = () => this.setState({ hasError: false, errorMessage: '' });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View style={styles.container}>
          <LinearGradient colors={[Colors.cream, '#F0E8D8']} style={StyleSheet.absoluteFill} />
          <View style={styles.iconWrap}>
            <LinearGradient colors={['#FEE2E2', '#FECACA']} style={styles.iconBg}>
              <Ionicons name="alert-circle-outline" size={40} color={Colors.coral} />
            </LinearGradient>
          </View>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            The app ran into an unexpected error. Your data is safe.
          </Text>
          {__DEV__ && (
            <View style={styles.debugBox}>
              <Text style={styles.debugText} numberOfLines={4}>{this.state.errorMessage}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.retryBtn} onPress={this.retry} activeOpacity={0.85}>
            <LinearGradient colors={[Colors.sage, Colors.sageDark]} style={styles.retryGrad}>
              <Ionicons name="refresh" size={18} color={Colors.white} />
              <Text style={styles.retryText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing[6] },
  iconWrap: { marginBottom: Spacing[5] },
  iconBg: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.navy, textAlign: 'center', marginBottom: Spacing[2] },
  message: { fontSize: FontSizes.base, color: Colors.gray500, textAlign: 'center', lineHeight: 22, marginBottom: Spacing[6] },
  debugBox: { backgroundColor: Colors.gray100, borderRadius: Radius.md, padding: Spacing[3], marginBottom: Spacing[5], width: '100%' },
  debugText: { fontSize: FontSizes.xs, color: Colors.gray600, fontFamily: 'monospace' },
  retryBtn: { borderRadius: Radius.lg, overflow: 'hidden' },
  retryGrad: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], paddingHorizontal: Spacing[6], paddingVertical: Spacing[4] },
  retryText: { fontSize: FontSizes.base, fontWeight: '700', color: Colors.white },
});
