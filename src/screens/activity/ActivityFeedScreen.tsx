import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useActivityFeed } from '../../hooks/useDoses';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { formatRelative, formatTime } from '../../utils/date';
import { DoseLog, DoseStatus } from '../../types';

const STATUS_ICONS: Record<DoseStatus, { icon: string; color: string }> = {
  taken: { icon: 'checkmark-circle', color: Colors.success },
  skipped: { icon: 'remove-circle', color: Colors.warning },
  missed: { icon: 'close-circle', color: Colors.error },
  escalated: { icon: 'alert-circle', color: Colors.coral },
  pending: { icon: 'time', color: Colors.gray400 },
};

function activityMessage(dose: any): string {
  const med = dose.medicine?.name ?? 'medicine';
  const responder = dose.responder?.name;
  const time = formatTime(dose.scheduled_at);

  switch (dose.status) {
    case 'taken':
      return responder
        ? `${responder} marked ${med} as taken (${time})`
        : `${med} taken at ${time}`;
    case 'skipped':
      return responder
        ? `${responder} skipped ${med} (${time})`
        : `${med} skipped (${time})`;
    case 'missed':
      return `${med} was missed at ${time}`;
    case 'escalated':
      return `Family was alerted about ${med} (${time})`;
    default:
      return `${med} — ${dose.status}`;
  }
}

export function ActivityFeedScreen() {
  const { family } = useAuthStore();
  const { data: feed, isLoading, refetch } = useActivityFeed(family?.id);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
      </View>

      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.sage} />}
        renderItem={({ item }) => {
          const iconConfig = STATUS_ICONS[item.status];
          return (
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: `${iconConfig.color}22` }]}>
                <Ionicons name={iconConfig.icon as any} size={20} color={iconConfig.color} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowText}>{activityMessage(item)}</Text>
                {item.responded_at && (
                  <Text style={styles.rowTime}>{formatRelative(item.responded_at)}</Text>
                )}
              </View>
              <StatusBadge status={item.status} />
            </View>
          );
        }}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={48} color={Colors.gray200} />
              <Text style={styles.emptyTitle}>No activity yet</Text>
              <Text style={styles.emptyText}>Dose responses will appear here in real time.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { paddingHorizontal: Spacing[5], paddingTop: Spacing[4], paddingBottom: Spacing[3] },
  title: { fontSize: FontSizes['2xl'], fontWeight: '800', color: Colors.navy },
  list: { padding: Spacing[4], paddingBottom: 100, gap: Spacing[3] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.gray200,
    gap: Spacing[3],
  },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1 },
  rowText: { fontSize: FontSizes.sm, color: Colors.navy, lineHeight: 18 },
  rowTime: { fontSize: FontSizes.xs, color: Colors.gray400, marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: Spacing[16], gap: Spacing[3] },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.navy },
  emptyText: { fontSize: FontSizes.base, color: Colors.gray400, textAlign: 'center' },
});
