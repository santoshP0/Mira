import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
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

export function ElderHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { family, profile, myMembership } = useAuthStore();
  const { data: doses, isLoading, refetch } = useTodayDoses(family?.id, myMembership?.user_id);
  const respondToDose = useRespondToDose();

  useRealtimeDoses(family?.id);

  const pending = doses?.filter((d) => d.status === 'pending') ?? [];
  const done = doses?.filter((d) => d.status !== 'pending') ?? [];

  function speak(text: string) {
    Speech.speak(text, { language: 'en', pitch: 1.0, rate: 0.9 });
  }

  async function handleTaken(dose: DoseLog) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await respondToDose.mutateAsync({
      doseId: dose.id,
      status: 'taken',
      respondedBy: myMembership!.user_id,
      familyId: family!.id,
    });
  }

  async function handleSkip(dose: DoseLog) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await respondToDose.mutateAsync({
      doseId: dose.id,
      status: 'skipped',
      respondedBy: myMembership!.user_id,
      familyId: family!.id,
    });
  }

  function handleSOS() {
    Alert.alert(
      'Send SOS Alert?',
      'This will alert all your family members with your location.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send SOS',
          style: 'destructive',
          onPress: () => navigation.navigate('SOS' as any),
        },
      ]
    );
  }

  function renderDoseCard(dose: DoseLog) {
    const med = dose.medicine as any;
    const isPending = dose.status === 'pending';

    return (
      <View key={dose.id} style={[styles.doseCard, isPending && styles.doseCardPending]}>
        <View style={styles.doseHeader}>
          {med?.photo_url ? (
            <Image source={{ uri: med.photo_url }} style={styles.pillPhoto} />
          ) : (
            <View style={[styles.pillPhoto, styles.pillPhotoPlaceholder]}>
              <Ionicons name="medical" size={28} color={Colors.sage} />
            </View>
          )}
          <View style={styles.doseInfo}>
            <Text style={styles.doseName}>{med?.name ?? 'Medicine'}</Text>
            {med?.dose && <Text style={styles.doseDose}>{med.dose}</Text>}
            <Text style={styles.doseTime}>{formatTime(dose.scheduled_at)}</Text>
          </View>
          {!isPending && <StatusBadge status={dose.status} />}
          {med?.criticality === 'high' && (
            <View style={styles.critBadge}>
              <Ionicons name="alert-circle" size={16} color={Colors.coral} />
            </View>
          )}
        </View>

        {isPending && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.takenBtn]}
              onPress={() => handleTaken(dose)}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark" size={28} color={Colors.white} />
              <Text style={styles.takenText}>Taken</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.skipBtn]}
              onPress={() => handleSkip(dose)}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={24} color={Colors.gray500} />
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.speakBtn}
              onPress={() => speak(`Time to take your ${med?.name ?? 'medicine'}${med?.dose ? `, ${med.dose}` : ''}`)}
              activeOpacity={0.85}
            >
              <Ionicons name="volume-high" size={22} color={Colors.sage} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.name}>{profile?.name?.split(' ')[0] ?? 'there'} 👋</Text>
        </View>
        <TouchableOpacity style={styles.sosBtn} onLongPress={handleSOS} activeOpacity={0.8}>
          <Ionicons name="alert-circle" size={28} color={Colors.coral} />
          <Text style={styles.sosBtnText}>SOS</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={[...pending, ...done]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.sage} />}
        ListHeaderComponent={
          pending.length > 0 ? (
            <View style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={18} color={Colors.coral} />
              <Text style={styles.sectionTitle}>{pending.length} dose{pending.length > 1 ? 's' : ''} due today</Text>
            </View>
          ) : (
            <View style={styles.allDoneWrap}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
              <Text style={styles.allDoneTitle}>All done for today!</Text>
              <Text style={styles.allDoneSub}>Great job staying on track.</Text>
            </View>
          )
        }
        renderItem={({ item }) => renderDoseCard(item)}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No medicines scheduled for today.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[5], paddingTop: Spacing[4], paddingBottom: Spacing[3] },
  greeting: { fontSize: FontSizes.base, color: Colors.gray500 },
  name: { fontSize: FontSizes['2xl'], fontWeight: '800', color: Colors.navy },
  sosBtn: { alignItems: 'center', gap: 2, backgroundColor: '#FEE2E2', paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], borderRadius: Radius.md },
  sosBtnText: { fontSize: FontSizes.xs, color: Colors.coral, fontWeight: '700' },
  list: { padding: Spacing[4], gap: Spacing[4], paddingBottom: 100 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginBottom: Spacing[2] },
  sectionTitle: { fontSize: FontSizes.base, fontWeight: '600', color: Colors.navyLight },
  allDoneWrap: { alignItems: 'center', paddingVertical: Spacing[8], gap: Spacing[2] },
  allDoneTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.navy },
  allDoneSub: { fontSize: FontSizes.base, color: Colors.gray500 },
  doseCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing[4], borderWidth: 1.5, borderColor: Colors.gray200 },
  doseCardPending: { borderColor: Colors.sage, shadowColor: Colors.sage, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 },
  doseHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], marginBottom: Spacing[3] },
  pillPhoto: { width: 64, height: 64, borderRadius: Radius.md },
  pillPhotoPlaceholder: { backgroundColor: Colors.gray100, alignItems: 'center', justifyContent: 'center' },
  doseInfo: { flex: 1 },
  doseName: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.navy },
  doseDose: { fontSize: FontSizes.base, color: Colors.gray500, marginTop: 2 },
  doseTime: { fontSize: FontSizes.base, color: Colors.sage, fontWeight: '600', marginTop: 2 },
  critBadge: { position: 'absolute', top: 0, right: 0 },
  actions: { flexDirection: 'row', gap: Spacing[3], alignItems: 'center' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing[3], borderRadius: Radius.md, gap: Spacing[2] },
  takenBtn: { backgroundColor: Colors.sage },
  takenText: { color: Colors.white, fontWeight: '700', fontSize: FontSizes.lg },
  skipBtn: { backgroundColor: Colors.gray100, borderWidth: 1, borderColor: Colors.gray200 },
  skipText: { color: Colors.gray500, fontWeight: '600', fontSize: FontSizes.base },
  speakBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: Spacing[12] },
  emptyText: { fontSize: FontSizes.base, color: Colors.gray400 },
});
