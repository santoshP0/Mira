import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsAppActive } from '../../lib/offline';
import { Colors, FontSizes, Spacing } from '../../constants/theme';
import { useQueryClient } from '@tanstack/react-query';

// Tracks first-time mounting — don't show "Back online" before any offline event.
let hadOfflineEvent = false;

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);
  const translateY = useRef(new Animated.Value(-60)).current;
  const isActive = useIsAppActive();
  const qc = useQueryClient();

  // Probe connectivity every 10s when app is active
  useEffect(() => {
    if (!isActive) return;

    let cancelled = false;

    async function probe() {
      if (cancelled) return;
      try {
        const res = await fetch('https://clients3.google.com/generate_204', {
          method: 'HEAD',
          signal: AbortSignal.timeout(3500),
        });
        if (!cancelled) {
          if (!isOnline && hadOfflineEvent) {
            setShowReconnected(true);
            setTimeout(() => setShowReconnected(false), 3000);
            qc.invalidateQueries();
          }
          setIsOnline(res.ok);
        }
      } catch {
        if (!cancelled) {
          hadOfflineEvent = true;
          setIsOnline(false);
        }
      }
    }

    probe();
    const interval = setInterval(probe, 10_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isActive]);

  const visible = !isOnline || showReconnected;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : -60,
      tension: 180,
      friction: 18,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible && translateY.__getValue() <= -59) return null;

  const isReconnected = showReconnected && isOnline;

  return (
    <Animated.View
      style={[
        styles.banner,
        { transform: [{ translateY }] },
        isReconnected ? styles.online : styles.offline,
      ]}
    >
      <Ionicons
        name={isReconnected ? 'checkmark-circle' : 'cloud-offline-outline'}
        size={16}
        color={Colors.white}
      />
      <Text style={styles.text}>
        {isReconnected ? 'Back online' : 'No internet connection'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: 10,
    paddingTop: 14,
  },
  offline: { backgroundColor: '#374151' },
  online: { backgroundColor: Colors.success },
  text: { fontSize: FontSizes.sm, color: Colors.white, fontWeight: '600' },
});
