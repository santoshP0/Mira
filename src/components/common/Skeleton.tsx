import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, Radius } from '../../constants/theme';

function SkeletonPulse({ style }: { style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return <Animated.View style={[styles.base, style, { opacity }]} />;
}

export function SkeletonLine({ width = '80%', height = 14 }: { width?: number | string; height?: number }) {
  return <SkeletonPulse style={{ width: width as any, height, borderRadius: Radius.sm, marginBottom: 6 }} />;
}

export function SkeletonBox({ width = 56, height = 56 }: { width?: number; height?: number }) {
  return <SkeletonPulse style={{ width, height, borderRadius: Radius.md }} />;
}

export function SkeletonDoseCard() {
  return (
    <View style={styles.doseCard}>
      <SkeletonBox width={64} height={64} />
      <View style={styles.doseInfo}>
        <SkeletonLine width="65%" height={16} />
        <SkeletonLine width="40%" height={12} />
        <SkeletonLine width="50%" height={12} />
      </View>
    </View>
  );
}

export function SkeletonElderHome() {
  return (
    <View style={styles.elderWrap}>
      <View style={styles.headerPlaceholder}>
        <View>
          <SkeletonLine width={120} height={13} />
          <SkeletonLine width={180} height={28} />
        </View>
        <SkeletonBox width={60} height={32} />
      </View>
      <View style={styles.cardList}>
        <SkeletonDoseCard />
        <SkeletonDoseCard />
        <SkeletonDoseCard />
      </View>
    </View>
  );
}

export function SkeletonCaregiverHome() {
  return (
    <View style={styles.elderWrap}>
      <View style={styles.headerPlaceholder}>
        <View>
          <SkeletonLine width={100} height={13} />
          <SkeletonLine width={160} height={28} />
        </View>
        <SkeletonBox width={48} height={32} />
      </View>
      <View style={styles.elderCardSkel}>
        <SkeletonBox width={52} height={52} />
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonLine width="60%" height={18} />
          <SkeletonLine width="40%" height={13} />
        </View>
        <SkeletonBox width={48} height={40} />
      </View>
      <View style={{ gap: Spacing[2] }}>
        {[1, 2, 3].map((k) => (
          <View key={k} style={styles.doseRowSkel}>
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonLine width="50%" height={15} />
              <SkeletonLine width="35%" height={12} />
            </View>
            <SkeletonBox width={60} height={24} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: Colors.gray200 },
  doseCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing[4], marginBottom: Spacing[3] },
  doseInfo: { flex: 1 },
  elderWrap: { padding: Spacing[4], gap: Spacing[4] },
  headerPlaceholder: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[1] },
  cardList: {},
  elderCardSkel: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing[4] },
  doseRowSkel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing[3] },
});
