import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useTodayDoses } from '../../hooks/useDoses';
import { useFamilyMembers } from '../../hooks/useFamily';
import { useRealtimeDoses } from '../../lib/realtime';
import { Avatar } from '../../components/common/Avatar';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { formatTime } from '../../utils/date';
import { DoseLog, RootStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function AnimatedEntry({ children, index }: { children: React.ReactNode; index: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay: 100 + index * 60,
        useNativeDriver: true,
      }),
      Animated.spring(y, {
        toValue: 0,
        delay: 100 + index * 60,
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

export function CaregiverHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { family, profile } = useAuthStore();
  const { data: doses, isLoading, refetch } = useTodayDoses(family?.id);
  const { data: members } = useFamilyMembers(family?.id);
  const [displayPct, setDisplayPct] = useState(0);

  const pctAnim = useRef(new Animated.Value(0)).current;

  useRealtimeDoses(family?.id);

  const elder = members?.find((m) => m.role === 'elder');
  const needsAttention = doses?.filter((d) => d.status === 'escalated' || d.status === 'missed') ?? [];

  function adherencePercent() {
    if (!doses || doses.length === 0) return 100;
    return Math.round((doses.filter((d) => d.status === 'taken').length / doses.length) * 100);
  }

  useEffect(() => {
    if (!doses) return;
    const target = adherencePercent();
    const listener = pctAnim.addListener(({ value }) => setDisplayPct(Math.round(value)));
    Animated.timing(pctAnim, {
      toValue: target,
      duration: 900,
      useNativeDriver: false,
    }).start();
    return () => pctAnim.removeListener(listener);
  }, [doses]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.sage} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {profile?.name?.split(' ')[0]} 👋</Text>
            <Text style={styles.familyName}>{family?.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.membersChip}
            onPress={() => navigation.navigate('FamilyMembers')}
          >
            <Ionicons name="people" size={16} color={Colors.sage} />
            <Text style={styles.membersChipText}>{members?.length ?? 0} members</Text>
          </TouchableOpacity>
        </View>

        {/* Elder card with gradient */}
        {elder && (
          <AnimatedEntry index={0}>
            <LinearGradient
              colors={[Colors.sage, Colors.sageDark]}
              style={styles.elderCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.elderRow}>
                <Avatar name={elder.profile?.name ?? '?'} photoUrl={elder.profile?.photo_url} size={56} />
                <View style={styles.elderInfo}>
                  <Text style={styles.elderName}>{elder.profile?.name}</Text>
                  <Text style={styles.elderLabel}>Your elder</Text>
                </View>
                <View style={styles.adherenceWrap}>
                  <Text style={styles.adherenceNum}>{displayPct}%</Text>
                  <Text style={styles.adherenceLabel}>adherence</Text>
                </View>
              </View>

              {needsAttention.length > 0 && (
                <View style={styles.alertBanner}>
                  <Ionicons name="alert-circle" size={16} color={Colors.coral} />
                  <Text style={styles.alertText}>
                    {needsAttention.length} dose{needsAttention.length > 1 ? 's' : ''} need attention
                  </Text>
                </View>
              )}

              {needsAttention.length === 0 && doses && doses.length > 0 && (
                <View style={styles.allGoodBanner}>
                  <Ionicons name="checkmark-circle" size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.allGoodText}>On track today</Text>
                </View>
              )}
            </LinearGradient>
          </AnimatedEntry>
        )}

        {/* Quick-add */}
        {elder && (
          <AnimatedEntry index={1}>
            <TouchableOpacity
              style={styles.addMedBtn}
              onPress={() => navigation.navigate('AddMedicine', { familyId: family!.id, elderId: elder.user_id })}
              activeOpacity={0.8}
            >
              <View style={styles.addMedIcon}>
                <Ionicons name="add" size={18} color={Colors.sage} />
              </View>
              <Text style={styles.addMedText}>
                Add medicine for {elder.profile?.name?.split(' ')[0]}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.sage} />
            </TouchableOpacity>
          </AnimatedEntry>
        )}

        {/* Doses section */}
        <AnimatedEntry index={2}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Today's doses</Text>
            <View style={styles.countChip}>
              <Text style={styles.countChipText}>{doses?.length ?? 0} scheduled</Text>
            </View>
          </View>
        </AnimatedEntry>

        {doses?.length === 0 && !isLoading && (
          <AnimatedEntry index={3}>
            <Card style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={32} color={Colors.gray300} />
              <Text style={styles.emptyText}>No doses scheduled today.</Text>
            </Card>
          </AnimatedEntry>
        )}

        {doses?.map((dose, i) => (
          <AnimatedEntry key={dose.id} index={3 + i}>
            <TouchableOpacity
              onPress={() => navigation.navigate('DoseDetail', { doseLog: dose })}
              activeOpacity={0.85}
            >
              <DoseRow dose={dose} />
            </TouchableOpacity>
          </AnimatedEntry>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function DoseRow({ dose }: { dose: DoseLog }) {
  const med = dose.medicine as any;
  const handler = dose.handler as any;
  const isUrgent = dose.status === 'escalated' || dose.status === 'missed';

  return (
    <View style={[styles.doseRow, isUrgent && styles.doseRowUrgent]}>
      <View style={[
        styles.critDot,
        { backgroundColor: med?.criticality === 'high' ? Colors.coral : Colors.sage },
      ]} />
      <View style={styles.doseInfo}>
        <Text style={styles.doseName}>{med?.name}</Text>
        <Text style={styles.doseTime}>{formatTime(dose.scheduled_at)}</Text>
      </View>
      <View style={styles.doseRight}>
        <StatusBadge status={dose.status} />
        {handler && (
          <View style={styles.handlerChip}>
            <Ionicons name="call" size={11} color={Colors.sage} />
            <Text style={styles.handlerText}>{handler.name}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.gray300} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: Spacing[4], paddingBottom: 100, gap: Spacing[3] },

  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing[1] },
  greeting: { fontSize: FontSizes.base, color: Colors.gray500, fontWeight: '500' },
  familyName: { fontSize: FontSizes['2xl'], fontWeight: '800', color: Colors.navy, letterSpacing: -0.5 },
  membersChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EBF5EF',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
    marginTop: 4,
  },
  membersChipText: { fontSize: FontSizes.sm, color: Colors.sageDark, fontWeight: '600' },

  elderCard: {
    borderRadius: Radius.xl,
    padding: Spacing[5],
    shadowColor: Colors.sage,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  elderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  elderInfo: { flex: 1 },
  elderName: { fontSize: FontSizes.lg, fontWeight: '700', color: '#fff' },
  elderLabel: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  adherenceWrap: { alignItems: 'center' },
  adherenceNum: { fontSize: FontSizes['3xl'], fontWeight: '800', color: '#fff', letterSpacing: -1 },
  adherenceLabel: { fontSize: FontSizes.xs, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginTop: Spacing[4],
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.md,
    padding: Spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.4)',
  },
  alertText: { fontSize: FontSizes.sm, color: '#fff', fontWeight: '600' },
  allGoodBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginTop: Spacing[4],
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.md,
    padding: Spacing[3],
  },
  allGoodText: { fontSize: FontSizes.sm, color: '#fff', fontWeight: '600' },

  addMedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    borderWidth: 1.5,
    borderColor: Colors.sageLight,
    borderStyle: 'dashed',
  },
  addMedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBF5EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMedText: { flex: 1, fontSize: FontSizes.sm, color: Colors.sageDark, fontWeight: '600' },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: FontSizes.base, fontWeight: '700', color: Colors.navy },
  countChip: {
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  countChipText: { fontSize: FontSizes.xs, color: Colors.gray500, fontWeight: '600' },

  doseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.gray200,
    gap: Spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  doseRowUrgent: { borderColor: Colors.coral + '60', backgroundColor: '#FFF5F5' },
  critDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  doseInfo: { flex: 1 },
  doseName: { fontSize: FontSizes.base, fontWeight: '600', color: Colors.navy },
  doseTime: { fontSize: FontSizes.sm, color: Colors.gray500, marginTop: 2 },
  doseRight: { alignItems: 'flex-end', gap: 4 },
  handlerChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  handlerText: { fontSize: FontSizes.xs, color: Colors.sage, fontWeight: '600' },

  emptyCard: { alignItems: 'center', paddingVertical: Spacing[8], gap: Spacing[2] },
  emptyText: { fontSize: FontSizes.base, color: Colors.gray400 },
});
