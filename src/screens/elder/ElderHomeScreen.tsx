import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useTodayDoses, useRespondToDose } from '../../hooks/useDoses';
import { useRealtimeDoses } from '../../lib/realtime';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { formatTime } from '../../utils/date';
import { DoseLog, RootStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function AnimatedEntry({ children, index }: { children: React.ReactNode; index: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 450,
        delay: 180 + index * 90,
        useNativeDriver: true,
      }),
      Animated.spring(y, {
        toValue: 0,
        delay: 180 + index * 90,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: y }] }}>
      {children}
    </Animated.View>
  );
}

export function ElderHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { family, profile, myMembership } = useAuthStore();
  const { data: doses, isLoading, refetch } = useTodayDoses(family?.id, myMembership?.user_id);
  const respondToDose = useRespondToDose();

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-20)).current;

  useRealtimeDoses(family?.id);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(headerY, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const pending = doses?.filter((d) => d.status === 'pending') ?? [];
  const done = doses?.filter((d) => d.status !== 'pending') ?? [];
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  async function handleTaken(dose: DoseLog) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await respondToDose.mutateAsync({
        doseId: dose.id,
        status: 'taken',
        respondedBy: myMembership!.user_id,
        familyId: family!.id,
      });
    } catch {}
  }

  async function handleSkip(dose: DoseLog) {
    Alert.alert('Skip this dose?', 'Your family will be notified.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Skip',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await respondToDose.mutateAsync({
            doseId: dose.id,
            status: 'skipped',
            respondedBy: myMembership!.user_id,
            familyId: family!.id,
          });
        },
      },
    ]);
  }

  function handleSOS() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Alert.alert('Send SOS Alert?', 'This will immediately alert all your family members.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send SOS', style: 'destructive', onPress: () => {} },
    ]);
  }

  function renderCard(dose: DoseLog, index: number) {
    const med = dose.medicine as any;
    const isPending = dose.status === 'pending';
    const isOverdue = isPending && new Date(dose.scheduled_at) < new Date();

    return (
      <AnimatedEntry index={index} key={dose.id}>
        <View style={[
          styles.card,
          isPending && styles.cardPending,
          isOverdue && styles.cardOverdue,
        ]}>
          {isOverdue && (
            <View style={styles.overdueBadge}>
              <Ionicons name="time" size={11} color="#fff" />
              <Text style={styles.overdueBadgeText}>Overdue</Text>
            </View>
          )}

          <View style={styles.cardTop}>
            <View style={[styles.photoWrap, !isPending && styles.photoWrapDone]}>
              {med?.photo_url ? (
                <Image source={{ uri: med.photo_url }} style={styles.photo} />
              ) : (
                <Ionicons name="medical" size={30} color={isPending ? Colors.sage : Colors.gray400} />
              )}
            </View>
            <View style={styles.cardMeta}>
              <Text style={styles.medName}>{med?.name ?? 'Medicine'}</Text>
              {med?.dose ? <Text style={styles.medDose}>{med.dose}</Text> : null}
              <View style={styles.timeChip}>
                <Ionicons name="time-outline" size={12} color={Colors.sage} />
                <Text style={styles.timeText}>{formatTime(dose.scheduled_at)}</Text>
              </View>
            </View>
            {!isPending ? (
              <StatusBadge status={dose.status} />
            ) : (
              med?.criticality === 'high' && (
                <Ionicons name="alert-circle" size={20} color={Colors.coral} />
              )
            )}
          </View>

          {isPending && (
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => handleTaken(dose)} activeOpacity={0.85} style={styles.takenWrap}>
                <LinearGradient
                  colors={[Colors.sage, Colors.sageDark]}
                  style={styles.takenBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={styles.takenText}>Mark as Taken</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.secondaryRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => handleSkip(dose)} activeOpacity={0.8}>
                  <Ionicons name="close" size={16} color={Colors.gray500} />
                  <Text style={styles.secondaryBtnText}>Skip</Text>
                </TouchableOpacity>
                <View style={styles.btnDivider} />
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => Speech.speak(`Time to take your ${med?.name ?? 'medicine'}${med?.dose ? `, ${med.dose}` : ''}`)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="volume-high" size={16} color={Colors.sage} />
                  <Text style={[styles.secondaryBtnText, { color: Colors.sage }]}>Read aloud</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </AnimatedEntry>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.sage, Colors.sageDark, '#3D7359']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <Animated.View
            style={[styles.headerRow, { opacity: headerOpacity, transform: [{ translateY: headerY }] }]}
          >
            <View>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.name}>{profile?.name?.split(' ')[0] ?? 'there'} 👋</Text>
            </View>
            <TouchableOpacity style={styles.sosBtn} onLongPress={handleSOS} activeOpacity={0.85}>
              <Ionicons name="alert-circle" size={20} color={Colors.coral} />
              <Text style={styles.sosBtnText}>SOS</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.headerPill, { opacity: headerOpacity }]}>
            {pending.length > 0 ? (
              <View style={styles.pill}>
                <Ionicons name="medical" size={13} color="rgba(255,255,255,0.9)" />
                <Text style={styles.pillText}>
                  {pending.length} dose{pending.length !== 1 ? 's' : ''} remaining today
                </Text>
              </View>
            ) : doses && doses.length > 0 ? (
              <View style={[styles.pill, styles.pillDone]}>
                <Ionicons name="checkmark-circle" size={13} color="#fff" />
                <Text style={styles.pillText}>All done for today!</Text>
              </View>
            ) : null}
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      <FlatList
        data={[...pending, ...done]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.sage} />}
        renderItem={({ item, index }) => renderCard(item, index)}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="medical-outline" size={52} color={Colors.gray200} />
              <Text style={styles.emptyTitle}>No medicines today</Text>
              <Text style={styles.emptyText}>Nothing is scheduled for today.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },

  header: { paddingBottom: Spacing[2] },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[2],
  },
  greeting: { fontSize: FontSizes.base, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  name: { fontSize: FontSizes['2xl'], fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  sosBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    gap: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  sosBtnText: { fontSize: 10, color: Colors.coral, fontWeight: '800', letterSpacing: 1 },
  headerPill: { paddingHorizontal: Spacing[5], paddingBottom: Spacing[5] },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[3],
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  pillDone: { backgroundColor: 'rgba(16,185,129,0.4)' },
  pillText: { fontSize: FontSizes.sm, color: '#fff', fontWeight: '600' },

  list: { padding: Spacing[4], gap: Spacing[4], paddingBottom: 100 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  cardPending: {
    borderColor: Colors.sage,
    shadowColor: Colors.sage,
    shadowOpacity: 0.22,
    elevation: 5,
  },
  cardOverdue: {
    borderColor: Colors.coral,
    shadowColor: Colors.coral,
    shadowOpacity: 0.22,
  },
  overdueBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.coral,
    paddingHorizontal: Spacing[3],
    paddingVertical: 4,
    borderBottomLeftRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  overdueBadgeText: { fontSize: 10, color: '#fff', fontWeight: '800', letterSpacing: 0.3 },

  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], marginBottom: Spacing[4] },
  photoWrap: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    backgroundColor: '#EBF5EF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoWrapDone: { backgroundColor: Colors.gray100 },
  photo: { width: 72, height: 72 },
  cardMeta: { flex: 1, gap: 3 },
  medName: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.navy },
  medDose: { fontSize: FontSizes.sm, color: Colors.gray500 },
  timeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  timeText: { fontSize: FontSizes.sm, color: Colors.sage, fontWeight: '600' },

  cardActions: { gap: Spacing[2] },
  takenWrap: { borderRadius: Radius.md, overflow: 'hidden' },
  takenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[4],
    gap: Spacing[2],
  },
  takenText: { color: '#fff', fontWeight: '800', fontSize: FontSizes.lg, letterSpacing: 0.2 },

  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 5,
  },
  secondaryBtnText: { fontSize: FontSizes.sm, color: Colors.gray500, fontWeight: '600' },
  btnDivider: { width: 1, height: 20, backgroundColor: Colors.gray300 },

  empty: { alignItems: 'center', paddingTop: Spacing[16], gap: Spacing[3] },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.navy },
  emptyText: { fontSize: FontSizes.base, color: Colors.gray400 },
});
