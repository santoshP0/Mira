import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { useTodayDoses } from '../../hooks/useDoses';
import { useFamilyMembers } from '../../hooks/useFamily';
import { useRealtimeDoses } from '../../lib/realtime';
import { Avatar } from '../../components/common/Avatar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SkeletonCaregiverHome } from '../../components/common/Skeleton';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { formatTime } from '../../utils/date';
import { DoseLog, RootStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function AnimatedEntry({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay: 120 + index * 80, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 90, friction: 12, delay: 120 + index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

export function CaregiverHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { family, profile } = useAuthStore();
  const { data: doses, isLoading, refetch } = useTodayDoses(family?.id);
  const { data: members } = useFamilyMembers(family?.id);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const pctAnim = useRef(new Animated.Value(0)).current;
  const [displayPct, setDisplayPct] = useState(0);

  useRealtimeDoses(family?.id);

  const elder = members?.find((m) => m.role === 'elder');
  const needsAttention = doses?.filter((d) => d.status === 'escalated' || d.status === 'missed') ?? [];
  const pending = doses?.filter((d) => d.status === 'pending') ?? [];

  function adherencePercent(): number {
    if (!doses || doses.length === 0) return 100;
    const taken = doses.filter((d) => d.status === 'taken').length;
    return Math.round((taken / doses.length) * 100);
  }

  useEffect(() => {
    Animated.timing(headerOpacity, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!doses) return;
    const target = adherencePercent();
    const id = pctAnim.addListener(({ value }) => setDisplayPct(Math.round(value)));
    Animated.timing(pctAnim, { toValue: target, duration: 900, useNativeDriver: false }).start();
    return () => pctAnim.removeListener(id);
  }, [doses]);

  if (isLoading && !doses) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[Colors.sage, Colors.sageDark, '#3D7359']} style={styles.header}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.headerGreeting}>{getGreeting()}</Text>
                <Text style={styles.headerName}>{profile?.name?.split(' ')[0] ?? '…'}</Text>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
        <SkeletonCaregiverHome />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.sage, Colors.sageDark, '#3D7359']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <Animated.View style={[styles.headerContent, { opacity: headerOpacity }]}>
            <View>
              <Text style={styles.headerGreeting}>{getGreeting()},</Text>
              <Text style={styles.headerName}>{profile?.name?.split(' ')[0] ?? 'there'}</Text>
            </View>
            <TouchableOpacity
              style={styles.membersBtn}
              onPress={() => navigation.navigate('FamilyMembers')}
              activeOpacity={0.8}
            >
              <Ionicons name="people" size={18} color="rgba(255,255,255,0.9)" />
              <Text style={styles.membersBtnText}>{members?.length ?? 0}</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {elder && (
          <AnimatedEntry index={0}>
            <LinearGradient colors={[Colors.sage, Colors.sageDark]} style={styles.elderCard}>
              <View style={styles.elderHeader}>
                <View style={styles.elderAvatarRing}>
                  <Avatar name={elder.profile?.name ?? '?'} photoUrl={elder.profile?.photo_url} size={52} />
                </View>
                <View style={styles.elderInfo}>
                  <Text style={styles.elderName}>{elder.profile?.name}</Text>
                  <Text style={styles.elderLabel}>Your elder</Text>
                </View>
                <View style={styles.adherenceWrap}>
                  <Text style={styles.adherenceNum}>{displayPct}%</Text>
                  <Text style={styles.adherenceLabel}>adherence</Text>
                </View>
              </View>

              {needsAttention.length > 0 ? (
                <View style={styles.alertBanner}>
                  <Ionicons name="alert-circle" size={16} color={Colors.coral} />
                  <Text style={styles.alertText}>
                    {needsAttention.length} dose{needsAttention.length > 1 ? 's' : ''} need attention
                  </Text>
                </View>
              ) : pending.length === 0 && doses && doses.length > 0 ? (
                <View style={styles.goodBanner}>
                  <Ionicons name="checkmark-circle" size={16} color="#4ADE80" />
                  <Text style={styles.goodText}>All doses taken today</Text>
                </View>
              ) : null}
            </LinearGradient>
          </AnimatedEntry>
        )}

        {elder && (
          <AnimatedEntry index={1}>
            <TouchableOpacity
              style={styles.addMedCard}
              onPress={() => navigation.navigate('AddMedicine', { familyId: family!.id, elderId: elder.user_id })}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#EBF5EF', '#D4EDDF']} style={styles.addMedIcon}>
                <Ionicons name="add" size={22} color={Colors.sageDark} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.addMedTitle}>Add medicine</Text>
                <Text style={styles.addMedSub}>for {elder.profile?.name?.split(' ')[0] ?? 'elder'}</Text>
              </View>
              <View style={styles.addMedArrow}>
                <Ionicons name="chevron-forward" size={16} color={Colors.sageDark} />
              </View>
            </TouchableOpacity>
          </AnimatedEntry>
        )}

        <AnimatedEntry index={2}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Today's doses</Text>
            <Text style={styles.sectionMeta}>{doses?.length ?? 0} scheduled</Text>
          </View>
        </AnimatedEntry>

        {(!doses || doses.length === 0) && !isLoading && (
          <AnimatedEntry index={3}>
            <View style={styles.emptyCard}>
              <LinearGradient colors={['#EBF5EF', '#D4EDDF']} style={styles.emptyIcon}>
                <Ionicons name="medical-outline" size={32} color={Colors.sage} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No doses today</Text>
              <Text style={styles.emptyText}>Add medicines to start tracking.</Text>
            </View>
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
    </View>
  );
}

function DoseRow({ dose }: { dose: DoseLog }) {
  const med = dose.medicine as any;
  const handler = dose.handler as any;
  const isUrgent = dose.status === 'escalated' || dose.status === 'missed';

  return (
    <View style={[styles.doseRow, isUrgent && styles.doseRowUrgent]}>
      <View style={[styles.critDot, { backgroundColor: med?.criticality === 'high' ? Colors.coral : Colors.sage }]} />
      <View style={styles.doseRowContent}>
        <Text style={styles.doseName} numberOfLines={1}>{med?.name ?? 'Unknown'}</Text>
        <Text style={styles.doseTime}>{formatTime(dose.scheduled_at)}</Text>
      </View>
      <View style={styles.doseRowRight}>
        <StatusBadge status={dose.status} />
        {handler ? (
          <View style={styles.handlerChip}>
            <Ionicons name="person-circle" size={12} color={Colors.sage} />
            <Text style={styles.handlerText}>{handler.name}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { paddingBottom: Spacing[4] },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[5], paddingTop: Spacing[4], paddingBottom: Spacing[2] },
  headerGreeting: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  headerName: { fontSize: FontSizes['2xl'], fontWeight: '800', color: Colors.white },
  membersBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing[1], backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], borderRadius: Radius.full },
  membersBtnText: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  content: { padding: Spacing[4], paddingBottom: 100, gap: Spacing[3] },
  elderCard: { borderRadius: Radius.xl, padding: Spacing[5], shadowColor: Colors.sageDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 5 },
  elderHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  elderAvatarRing: { padding: 2, borderRadius: 30, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  elderInfo: { flex: 1 },
  elderName: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.white },
  elderLabel: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  adherenceWrap: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], borderRadius: Radius.md },
  adherenceNum: { fontSize: FontSizes['2xl'], fontWeight: '800', color: Colors.white },
  adherenceLabel: { fontSize: FontSizes.xs, color: 'rgba(255,255,255,0.7)' },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginTop: Spacing[4], backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: Radius.md, padding: Spacing[3] },
  alertText: { fontSize: FontSizes.sm, color: Colors.coral, fontWeight: '600' },
  goodBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginTop: Spacing[4], backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.md, padding: Spacing[3] },
  goodText: { fontSize: FontSizes.sm, color: '#A7F3D0', fontWeight: '600' },
  addMedCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing[4], borderWidth: 1.5, borderColor: '#C6E8D4', borderStyle: 'dashed' },
  addMedIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  addMedTitle: { fontSize: FontSizes.base, fontWeight: '700', color: Colors.navy },
  addMedSub: { fontSize: FontSizes.sm, color: Colors.gray400, marginTop: 2 },
  addMedArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EBF5EF', alignItems: 'center', justifyContent: 'center' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: FontSizes.base, fontWeight: '700', color: Colors.navy },
  sectionMeta: { fontSize: FontSizes.sm, color: Colors.gray400 },
  emptyCard: { alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, paddingVertical: Spacing[8], gap: Spacing[3], borderWidth: 1, borderColor: Colors.gray100 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.navy },
  emptyText: { fontSize: FontSizes.sm, color: Colors.gray400 },
  doseRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing[3], borderWidth: 1, borderColor: Colors.gray100 },
  doseRowUrgent: { backgroundColor: '#FFF8F8', borderColor: '#FECACA' },
  critDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  doseRowContent: { flex: 1 },
  doseName: { fontSize: FontSizes.base, fontWeight: '600', color: Colors.navy },
  doseTime: { fontSize: FontSizes.sm, color: Colors.gray500, marginTop: 2 },
  doseRowRight: { alignItems: 'flex-end', gap: 4 },
  handlerChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  handlerText: { fontSize: FontSizes.xs, color: Colors.sage, fontWeight: '500' },
});
