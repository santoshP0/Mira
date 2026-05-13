import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DoseStatus } from '../../types';
import { Colors, FontSizes, Radius, Spacing } from '../../constants/theme';

const STATUS_CONFIG: Record<DoseStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pending', bg: Colors.gray100, text: Colors.gray500 },
  taken: { label: 'Taken', bg: '#D1FAE5', text: Colors.success },
  skipped: { label: 'Skipped', bg: '#FEF3C7', text: Colors.warning },
  missed: { label: 'Missed', bg: '#FEE2E2', text: Colors.error },
  escalated: { label: 'Escalated', bg: '#FEE2E2', text: Colors.coral },
};

export function StatusBadge({ status }: { status: DoseStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing[3],
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
