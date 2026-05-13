import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../store/authStore';
import { useRespondToDose, useHandleDose } from '../../hooks/useDoses';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { formatTime, formatDate, formatRelative, minutesOverdue } from '../../utils/date';
import { RootStackParamList } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'DoseDetail'>;

export function DoseDetailScreen({ navigation, route }: Props) {
  const { doseLog } = route.params;
  const { family, user, myMembership } = useAuthStore();
  const respondToDose = useRespondToDose();
  const handleDose = useHandleDose();
  const [acting, setActing] = useState(false);

  const actionsY = useRef(new Animated.Value(40)).current;
  const actionsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(actionsOpacity, { toValue: 1, duration: 400, delay: 300, useNativeDriver: true }),
      Animated.spring(actionsY, { toValue: 0, delay: 300, tension: 80, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const med = doseLog.medicine as any;
  const overdue = minutesOverdue(doseLog.scheduled_at);
  const isPending = doseLog.status === 'pending';
  const isEscalated = doseLog.status === 'escalated';
  const handler = doseLog.handler as any;

  const STATUS_GRADIENT: Record<string, [string, string]> = {
    pending: [Colors.gray100, Colors.gray100],
    taken: ['#D1FAE5', '#A7F3D0'],
    skipped: ['#FEF3C7', '#FDE68A'],
    missed: ['#FEE2E2', '#FECACA'],
    escalated: ['#FEE2E2', '#FECACA'],
  };
  const gradColors = STATUS_GRADIENT[doseLog.status] ?? STATUS_GRADIENT.pending;

  async function respond(status: 'taken' | 'skipped') {
    setActing(true);
    Haptics.notificationAsync(
      status === 'taken'
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning
    );
    try {
      await respondToDose.mutateAsync({
        doseId: doseLog.id,
        status,
        respondedBy: user!.id,
        familyId: family!.id,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setActing(false);
    }
  }

  async function handleIllHandle() {
    if (!user || !family) return;
    setActing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await handleDose.mutateAsync({ doseId: doseLog.id, userId: user.id, familyId: family.id });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setActing(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Medicine card */}
      <Card elevated style={styles.medCard}>
        <View style={styles.medRow}>
          <View style={styles.photoWrap}>
            {med?.photo_url ? (
              <Image source={{ uri: med.photo_url }} style={styles.photo} />
            ) : (
              <LinearGradient colors={['#EBF5EF', '#D4EDDF']} style={styles.photoPlaceholder}>
                <Ionicons name="medical" size={38} color={Colors.sage} />
              </LinearGradient>
            )}
          </View>
          <View style={styles.medInfo}>
            <Text style={styles.medName}>{med?.name ?? 'Medicine'}</Text>
            {med?.dose ? <Text style={styles.medDose}>{med.dose}</Text> : null}
            {med?.criticality === 'high' && (
              <View style={styles.critChip}>
                <Ionicons name="alert-circle" size={12} color={Colors.coral} />
                <Text style={styles.critText}>High criticality</Text>
              </View>
            )}
          </View>
        </View>
      </Card>

      {/* Status card with gradient */}
      <View style={styles.statusCard}>
        <LinearGradient colors={gradColors} style={styles.statusGrad}>
          <View style={styles.statusTop}>
            <View>
              <Text style={styles.statusLabel}>Scheduled</Text>
              <Text style={styles.statusTime}>{formatTime(doseLog.scheduled_at)}</Text>
              <Text style={styles.statusDate}>{formatDate(doseLog.scheduled_at)}</Text>
            </View>
            <StatusBadge status={doseLog.status} />
          </View>

          {isPending && overdue > 0 && (
            <View style={styles.overdueRow}>
              <Ionicons name="time" size={15} color={Colors.coral} />
              <Text style={styles.overdueText}>{overdue} min overdue</Text>
            </View>
          )}

          {doseLog.responded_at && (
            <View style={styles.respondedRow}>
              <Ionicons name="checkmark-circle" size={15} color={Colors.success} />
              <Text style={styles.respondedText}>Responded {formatRelative(doseLog.responded_at)}</Text>
            </View>
          )}
        </LinearGradient>
      </View>

      {/* Handler card */}
      {handler && (
        <Card style={styles.handlerCard}>
          <View style={styles.handlerRow}>
            <Avatar name={handler.name} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.handlerName}>{handler.name}</Text>
              <Text style={styles.handlerSub}>is calling right now</Text>
            </View>
            <View style={styles.callingBadge}>
              <Ionicons name="call" size={16} color={Colors.sage} />
            </View>
          </View>
        </Card>
      )}

      {/* Actions */}
      {(isPending || isEscalated) && (
        <Animated.View
          style={[
            styles.actions,
            { opacity: actionsOpacity, transform: [{ translateY: actionsY }] },
          ]}
        >
          {myMembership?.role !== 'caregiver' && (
            <>
              <TouchableOpacity onPress={() => respond('taken')} activeOpacity={0.85} style={styles.takenWrap}>
                <LinearGradient
                  colors={[Colors.sage, Colors.sageDark]}
                  style={styles.takenBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={styles.takenText}>
                    {acting ? 'Saving…' : 'Mark as Taken'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <Button
                label="Skip this dose"
                onPress={() => respond('skipped')}
                variant="secondary"
                size="lg"
                style={{ width: '100%' }}
              />
            </>
          )}

          {isEscalated && !handler && myMembership?.role !== 'elder' && (
            <Button
              label="I'll handle this"
              onPress={handleIllHandle}
              loading={acting}
              variant="secondary"
              size="lg"
              style={[{ width: '100%' }, { borderColor: Colors.sage }] as any}
            />
          )}
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: Spacing[4], gap: Spacing[3], paddingBottom: 100 },

  medCard: { padding: 0, overflow: 'hidden' },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[4], padding: Spacing[4] },
  photoWrap: { width: 88, height: 88, borderRadius: Radius.lg, overflow: 'hidden' },
  photo: { width: 88, height: 88 },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  medInfo: { flex: 1, gap: 5 },
  medName: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.navy, letterSpacing: -0.3 },
  medDose: { fontSize: FontSizes.base, color: Colors.gray500 },
  critChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  critText: { fontSize: FontSizes.xs, color: Colors.coral, fontWeight: '700' },

  statusCard: { borderRadius: Radius.lg, overflow: 'hidden' },
  statusGrad: { padding: Spacing[4] },
  statusTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing[3] },
  statusLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  statusTime: { fontSize: FontSizes['2xl'], fontWeight: '800', color: Colors.navy },
  statusDate: { fontSize: FontSizes.sm, color: Colors.gray500, marginTop: 2 },
  overdueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderRadius: Radius.sm,
    padding: Spacing[3],
    borderLeftWidth: 3,
    borderLeftColor: Colors.coral,
  },
  overdueText: { fontSize: FontSizes.sm, color: Colors.coral, fontWeight: '700' },
  respondedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginTop: Spacing[2] },
  respondedText: { fontSize: FontSizes.sm, color: Colors.success, fontWeight: '500' },

  handlerCard: {},
  handlerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  handlerName: { fontSize: FontSizes.base, fontWeight: '700', color: Colors.navy },
  handlerSub: { fontSize: FontSizes.sm, color: Colors.sage, fontWeight: '500' },
  callingBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF5EF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  actions: { gap: Spacing[3] },
  takenWrap: { borderRadius: Radius.md, overflow: 'hidden' },
  takenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[4],
    gap: Spacing[2],
  },
  takenText: { color: '#fff', fontWeight: '800', fontSize: FontSizes.lg },
});
