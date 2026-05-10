import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  TouchableOpacity,
} from 'react-native';
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

  const med = doseLog.medicine as any;
  const overdue = minutesOverdue(doseLog.scheduled_at);
  const isPending = doseLog.status === 'pending';
  const isEscalated = doseLog.status === 'escalated';
  const handler = doseLog.handler as any;

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
      <Card elevated style={styles.medCard}>
        <View style={styles.medHeader}>
          {med?.photo_url ? (
            <Image source={{ uri: med.photo_url }} style={styles.pillPhoto} />
          ) : (
            <View style={[styles.pillPhoto, styles.pillPlaceholder]}>
              <Ionicons name="medical" size={36} color={Colors.sage} />
            </View>
          )}
          <View style={styles.medInfo}>
            <Text style={styles.medName}>{med?.name ?? 'Medicine'}</Text>
            {med?.dose && <Text style={styles.medDose}>{med.dose}</Text>}
            {med?.criticality === 'high' && (
              <View style={styles.critRow}>
                <Ionicons name="alert-circle" size={14} color={Colors.coral} />
                <Text style={styles.critText}>High criticality</Text>
              </View>
            )}
          </View>
        </View>
      </Card>

      <Card style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View>
            <Text style={styles.statusLabel}>Scheduled</Text>
            <Text style={styles.statusValue}>{formatTime(doseLog.scheduled_at)}</Text>
            <Text style={styles.statusSub}>{formatDate(doseLog.scheduled_at)}</Text>
          </View>
          <StatusBadge status={doseLog.status} />
        </View>

        {isPending && overdue > 0 && (
          <View style={styles.overdueRow}>
            <Ionicons name="time" size={16} color={Colors.coral} />
            <Text style={styles.overdueText}>{overdue} minutes overdue</Text>
          </View>
        )}

        {doseLog.responded_at && (
          <View style={styles.respondedRow}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.respondedText}>Responded {formatRelative(doseLog.responded_at)}</Text>
          </View>
        )}
      </Card>

      {handler && (
        <Card style={styles.handlerCard}>
          <View style={styles.handlerRow}>
            <Avatar name={handler.name} size={40} />
            <View>
              <Text style={styles.handlerName}>{handler.name}</Text>
              <Text style={styles.handlerLabel}>is calling</Text>
            </View>
            <Ionicons name="call" size={20} color={Colors.sage} />
          </View>
        </Card>
      )}

      {(isPending || isEscalated) && (
        <View style={styles.actions}>
          {myMembership?.role !== 'caregiver' ? (
            <>
              <Button
                label="Mark as Taken"
                onPress={() => respond('taken')}
                loading={acting}
                size="lg"
                style={styles.fullBtn}
              />
              <Button
                label="Skip this dose"
                onPress={() => respond('skipped')}
                variant="secondary"
                size="lg"
                style={styles.fullBtn}
              />
            </>
          ) : null}

          {isEscalated && !handler && myMembership?.role !== 'elder' && (
            <Button
              label="I'll handle this"
              onPress={handleIllHandle}
              loading={acting}
              variant="secondary"
              size="lg"
              style={[styles.fullBtn, styles.handleBtn] as any}
            />
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: Spacing[4], gap: Spacing[3], paddingBottom: 100 },
  medCard: {},
  medHeader: { flexDirection: 'row', gap: Spacing[4], alignItems: 'center' },
  pillPhoto: { width: 80, height: 80, borderRadius: Radius.md },
  pillPlaceholder: { backgroundColor: Colors.gray100, alignItems: 'center', justifyContent: 'center' },
  medInfo: { flex: 1, gap: 4 },
  medName: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.navy },
  medDose: { fontSize: FontSizes.base, color: Colors.gray500 },
  critRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  critText: { fontSize: FontSizes.xs, color: Colors.coral, fontWeight: '600' },
  statusCard: {},
  statusRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing[3] },
  statusLabel: { fontSize: FontSizes.xs, color: Colors.gray400, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  statusValue: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.navy },
  statusSub: { fontSize: FontSizes.sm, color: Colors.gray400 },
  overdueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], backgroundColor: '#FEF2F2', borderRadius: Radius.sm, padding: Spacing[3] },
  overdueText: { fontSize: FontSizes.sm, color: Colors.coral, fontWeight: '600' },
  respondedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginTop: Spacing[2] },
  respondedText: { fontSize: FontSizes.sm, color: Colors.success },
  handlerCard: {},
  handlerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  handlerName: { fontSize: FontSizes.base, fontWeight: '600', color: Colors.navy },
  handlerLabel: { fontSize: FontSizes.sm, color: Colors.gray500 },
  actions: { gap: Spacing[3] },
  fullBtn: { width: '100%' },
  handleBtn: { borderColor: Colors.sage },
});
