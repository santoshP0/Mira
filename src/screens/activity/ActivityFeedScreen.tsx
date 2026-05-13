import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { useActivityFeed } from '../../hooks/useDoses';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { formatRelative, formatTime } from '../../utils/date';
import { DoseStatus } from '../../types';

const STATUS_CONFIG: Record<DoseStatus, { icon: string; color: string; bg: string; label: string }> = {
  taken: { icon: 'checkmark-circle', color: Colors.success, bg: '#D1FAE5', label: 'Taken' },
  skipped: { icon: 'remove-circle', color: Colors.warning, bg: '#FEF3C7', label: 'Skipped' },
  missed: { icon: 'close-circle', color: Colors.error, bg: '#FEE2E2', label: 'Missed' },
  escalated: { icon: 'alert-circle', color: Colors.coral, bg: '#FEE2E2', label: 'Escalated' },
  pending: { icon: 'time', color: Colors.gray400, bg: Colors.gray100, label: 'Pending' },
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

function AnimatedRow({ item, index }: { item: any; index: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 340,
        delay: 80 + index * 60,
        useNativeDriver: true,
      }),
      Animated.spring(translateX, {
        toValue: 0,
        tension: 120,
        friction: 14,
        delay: 80 + index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const cfg = STATUS_CONFIG[item.status as DoseStatus] ?? STATUS_CONFIG.pending;
  const isAlert = item.status === 'missed' || item.status === 'escalated';

  return (
    <Animated.View style={[styles.row, isAlert && styles.rowAlert, { opacity, transform: [{ translateX }] }]}>
      <View style={[styles.timelineDot, { backgroundColor: cfg.color }]} />

      <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
      </View>

      <View style={styles.rowContent}>
        <Text style={styles.rowText}>{activityMessage(item)}</Text>
        {item.responded_at && (
          <Text style={styles.rowTime}>{formatRelative(item.responded_at)}</Text>
        )}
      </View>

      <StatusBadge status={item.status} />
    </Animated.View>
  );
}

export function ActivityFeedScreen() {
  const { family } = useAuthStore();
  const { data: feed, isLoading, refetch } = useActivityFeed(family?.id);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(headerTranslateY, { toValue: 0, tension: 100, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.sage, Colors.sageDark, '#3D7359']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <Animated.View style={[styles.headerContent, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}>
            <View>
              <Text style={styles.headerLabel}>FAMILY HISTORY</Text>
              <Text style={styles.title}>Activity</Text>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={Colors.sage}
            colors={[Colors.sage]}
          />
        }
        renderItem={({ item, index }) => <AnimatedRow item={item} index={index} />}
        ListHeaderComponent={
          feed && feed.length > 0 ? (
            <Text style={styles.feedCount}>{feed.length} event{feed.length !== 1 ? 's' : ''}</Text>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <LinearGradient colors={['#EBF5EF', '#D4EDDF']} style={styles.emptyIcon}>
                <Ionicons name="time-outline" size={40} color={Colors.sage} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No activity yet</Text>
              <Text style={styles.emptyText}>Dose responses will appear here in real time.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },

  header: { paddingBottom: Spacing[4] },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[5], paddingTop: Spacing[4], paddingBottom: Spacing[3] },
  headerLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  title: { fontSize: FontSizes['2xl'], fontWeight: '800', color: Colors.white },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: Spacing[3], paddingVertical: 6, borderRadius: Radius.full },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  liveText: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },

  list: { padding: Spacing[4], paddingBottom: 100, gap: 0 },
  feedCount: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.gray400, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing[3], marginLeft: Spacing[1] },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.gray100,
    gap: Spacing[3],
    marginBottom: Spacing[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  rowAlert: {
    backgroundColor: '#FFF8F8',
    borderColor: '#FECACA',
  },
  timelineDot: { position: 'absolute', left: -1, top: '50%', width: 3, height: 20, borderRadius: 2, marginTop: -10 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowContent: { flex: 1 },
  rowText: { fontSize: FontSizes.sm, color: Colors.navy, lineHeight: 19, fontWeight: '500' },
  rowTime: { fontSize: FontSizes.xs, color: Colors.gray400, marginTop: 4 },

  empty: { alignItems: 'center', paddingVertical: Spacing[16], gap: Spacing[4] },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.navy },
  emptyText: { fontSize: FontSizes.base, color: Colors.gray400, textAlign: 'center', lineHeight: 22 },
});
