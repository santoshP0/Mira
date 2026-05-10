import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Animated,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { useTodayDoses, useRespondToDose } from '../../hooks/useDoses';
import { useRealtimeDoses } from '../../lib/realtime';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SkeletonElderHome } from '../../components/common/Skeleton';
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
  const translateY = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay: 180 + index * 90, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 90, friction: 12, delay: 180 + index * 90, useNativeDriver: true }),
    ]).start();
  }, []);

  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

export function ElderHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { family, profile, myMembership } = useAuthStore();
  const { data: doses, isLoading, refetch } = useTodayDoses(family?.id, myMembership?.user_id);
  const respondToDose = useRespondToDose();

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(-20)).current;

  useRealtimeDoses(family?.id);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(headerTranslate, { toValue: 0, tension: 100, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  const pending = doses?.filter((d) => d.status === 'pending') ?? [];
  const done = doses?.filter((d) => d.status !== 'pending') ?? [];
  const allDone = !isLoading && doses !== undefined && pending.length === 0 && done.length > 0;
  const noMeds = !isLoading && doses !== undefined && doses.length === 0;

  function speak(text: string) {
    Speech.speak(text, { language: 'en', pitch: 1.0, rate: 0.85 });
  }

  async function handleTaken(dose: DoseLog) {
    if (respondToDose.isPending) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await respondToDose.mutateAsync({
        doseId: dose.id,
        status: 'taken',
        respondedBy: myMembership!.user_id,
        familyId: family!.id,
      });
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Could not record dose. Please try again.');
    }
  }

  async function handleSkip(dose: DoseLog) {
    if (respondToDose.isPending) return;
    Alert.alert(
      'Skip dose?',
      `Skip ${(dose.medicine as any)?.name ?? 'this medicine'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              await respondToDose.mutateAsync({
                doseId: dose.id,
                status: 'skipped',
                respondedBy: myMembership!.user_id,
                familyId: family!.id,
              });
            } catch {
              Alert.alert('Error', 'Could not skip dose. Please try again.');
            }
          },
        },
      ]
    );
  }

  function handleSOS() {
    Alert.alert(
      'Send SOS Alert?',
      'This will immediately alert all your family members.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send SOS', style: 'destructive', onPress: () => navigation.navigate('SOS' as any) },
      ]
    );
  }

  const renderDoseCard = useCallback(
    ({ item: dose, index }: { item: DoseLog; index: number }) => {
      const med = dose.medicine as any;
      const isPending = dose.status === 'pending';
      const now = new Date();
      const scheduled = new Date(dose.scheduled_at);
      const isOverdue = isPending && now > scheduled;

      return (
        <AnimatedEntry index={index}>
          <View style={[styles.doseCard, isPending && styles.doseCardPending, isOverdue && styles.doseCardOverdue]}>
            {isOverdue && (
              <View style={styles.overdueBadge}>
                <Ionicons name="time" size={11} color={Colors.white} />
                <Text style={styles.overdueText}>
                  {Math.round((now.getTime() - scheduled.getTime()) / 60000)}m late
                </Text>
              </View>
            )}

            <View style={styles.doseHeader}>
              {med?.photo_url ? (
                <Image source={{ uri: med.photo_url }} style={styles.pillPhoto} />
              ) : (
                <LinearGradient
                  colors={isPending ? ['#EBF5EF', '#D4EDDF'] : [Colors.gray100, Colors.gray200]}
                  style={[styles.pillPhoto, styles.pillPhotoPlaceholder]}
                >
                  <Ionicons name="medical" size={30} color={isPending ? Colors.sage : Colors.gray400} />
                </LinearGradient>
              )}

              <View style={styles.doseInfo}>
                <Text style={styles.doseName} numberOfLines={1}>{med?.name ?? 'Medicine'}</Text>
                {med?.dose ? <Text style={styles.doseDose}>{med.dose}</Text> : null}
                <Text style={[styles.doseTime, isOverdue && { color: Colors.coral }]}>
                  {formatTime(dose.scheduled_at)}
                </Text>
              </View>

              {!isPending && <StatusBadge status={dose.status} />}
              {med?.criticality === 'high' && (
                <View style={styles.critBadge}>
                  <Ionicons name="alert-circle" size={15} color={Colors.coral} />
                </View>
              )}
            </View>

            {isPending && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.takenBtn, respondToDose.isPending && styles.btnDisabled]}
                  onPress={() => handleTaken(dose)}
                  activeOpacity={0.85}
                  disabled={respondToDose.isPending}
                >
                  <LinearGradient
                    colors={[Colors.sage, Colors.sageDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.takenGrad}
                  >
                    <Ionicons name="checkmark" size={26} color={Colors.white} />
                    <Text style={styles.takenText}>Taken</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.secondaryRow}>
                  <TouchableOpacity
                    style={[styles.skipBtn, respondToDose.isPending && styles.btnDisabled]}
                    onPress={() => handleSkip(dose)}
                    activeOpacity={0.85}
                    disabled={respondToDose.isPending}
                  >
                    <Ionicons name="close" size={20} color={Colors.gray500} />
                    <Text style={styles.skipText}>Skip</Text>
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <TouchableOpacity
                    style={styles.speakBtn}
                    onPress={() =>
                      speak(`Time to take your ${med?.name ?? 'medicine'}${med?.dose ? `, ${med.dose}` : ''}`)
                    }
                    activeOpacity={0.85}
                  >
                    <Ionicons name="volume-high" size={20} color={Colors.sage} />
                    <Text style={styles.speakText}>Read aloud</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </AnimatedEntry>
      );
    },
    [respondToDose.isPending]
  );

  if (isLoading && !doses) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[Colors.sage, Colors.sageDark, '#3D7359']} style={styles.header}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.headerLabel}>{getGreeting()}</Text>
                <Text style={styles.headerName}>{profile?.name?.split(' ')[0] ?? '…'}</Text>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
        <SkeletonElderHome />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.sage, Colors.sageDark, '#3D7359']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <Animated.View style={[styles.headerContent, { opacity: headerOpacity, transform: [{ translateY: headerTranslate }] }]}>
            <View>
              <Text style={styles.headerLabel}>{getGreeting()},</Text>
              <Text style={styles.headerName}>{profile?.name?.split(' ')[0] ?? 'there'}</Text>
            </View>

            <View style={styles.headerRight}>
              {pending.length > 0 ? (
                <View style={styles.dueChip}>
                  <Text style={styles.dueChipText}>{pending.length} due</Text>
                </View>
              ) : (
                <View style={[styles.dueChip, styles.allDoneChip]}>
                  <Ionicons name="checkmark-circle" size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.dueChipText}>All done!</Text>
                </View>
              )}

              <TouchableOpacity style={styles.sosBtn} onPress={handleSOS} activeOpacity={0.8}>
                <Ionicons name="alert-circle" size={22} color={Colors.coral} />
                <Text style={styles.sosBtnText}>SOS</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      <FlatList
        data={[...pending, ...done]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={false}
        windowSize={5}
        maxToRenderPerBatch={8}
        removeClippedSubviews
        ListHeaderComponent={
          allDone ? (
            <AnimatedEntry index={0}>
              <View style={styles.allDoneWrap}>
                <LinearGradient colors={['#D1FAE5', '#A7F3D0']} style={styles.allDoneIcon}>
                  <Ionicons name="checkmark-circle" size={40} color={Colors.success} />
                </LinearGradient>
                <Text style={styles.allDoneTitle}>All done for today!</Text>
                <Text style={styles.allDoneSub}>Great job staying on track.</Text>
              </View>
            </AnimatedEntry>
          ) : noMeds ? (
            <View style={styles.allDoneWrap}>
              <LinearGradient colors={['#EBF5EF', '#D4EDDF']} style={styles.allDoneIcon}>
                <Ionicons name="medical-outline" size={40} color={Colors.sage} />
              </LinearGradient>
              <Text style={styles.allDoneTitle}>No medicines scheduled</Text>
              <Text style={styles.allDoneSub}>Your caregiver will add medicines for today.</Text>
            </View>
          ) : null
        }
        renderItem={renderDoseCard}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { paddingBottom: Spacing[5] },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[5], paddingTop: Spacing[4], paddingBottom: Spacing[2] },
  headerLabel: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  headerName: { fontSize: FontSizes['2xl'], fontWeight: '800', color: Colors.white },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  dueChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.18)', paddingHorizontal: Spacing[3], paddingVertical: 6, borderRadius: Radius.full },
  allDoneChip: { backgroundColor: 'rgba(255,255,255,0.18)' },
  dueChipText: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  sosBtn: { alignItems: 'center', gap: 2, backgroundColor: 'rgba(0,0,0,0.18)', paddingHorizontal: Spacing[3], paddingVertical: 6, borderRadius: Radius.md },
  sosBtnText: { fontSize: 10, color: Colors.coral, fontWeight: '800' },
  list: { padding: Spacing[4], gap: Spacing[3], paddingBottom: 100 },
  allDoneWrap: { alignItems: 'center', paddingVertical: Spacing[8], gap: Spacing[3] },
  allDoneIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  allDoneTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.navy },
  allDoneSub: { fontSize: FontSizes.base, color: Colors.gray400, textAlign: 'center' },
  doseCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing[4], borderWidth: 1.5, borderColor: Colors.gray200, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  doseCardPending: { borderColor: Colors.sage, shadowColor: Colors.sage, shadowOpacity: 0.15, elevation: 3 },
  doseCardOverdue: { borderColor: Colors.coral, shadowColor: Colors.coral, shadowOpacity: 0.12 },
  overdueBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, position: 'absolute', top: -1, right: Spacing[3], backgroundColor: Colors.coral, paddingHorizontal: 8, paddingVertical: 3, borderBottomLeftRadius: Radius.sm, borderBottomRightRadius: Radius.sm },
  overdueText: { fontSize: 10, color: Colors.white, fontWeight: '700' },
  doseHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], marginBottom: Spacing[3] },
  pillPhoto: { width: 72, height: 72, borderRadius: Radius.md },
  pillPhotoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  doseInfo: { flex: 1 },
  doseName: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.navy },
  doseDose: { fontSize: FontSizes.base, color: Colors.gray500, marginTop: 2 },
  doseTime: { fontSize: FontSizes.base, color: Colors.sage, fontWeight: '600', marginTop: 2 },
  critBadge: { position: 'absolute', top: 0, right: 0 },
  actions: { gap: Spacing[2] },
  takenBtn: { borderRadius: Radius.md, overflow: 'hidden' },
  takenGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing[3], gap: Spacing[2] },
  takenText: { color: Colors.white, fontWeight: '800', fontSize: FontSizes.lg },
  btnDisabled: { opacity: 0.55 },
  secondaryRow: { flexDirection: 'row', backgroundColor: Colors.gray100, borderRadius: Radius.md, overflow: 'hidden' },
  skipBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, gap: Spacing[1] },
  skipText: { color: Colors.gray500, fontWeight: '600', fontSize: FontSizes.sm },
  divider: { width: 1, backgroundColor: Colors.gray200 },
  speakBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, gap: Spacing[1] },
  speakText: { color: Colors.sage, fontWeight: '600', fontSize: FontSizes.sm },
});
