import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
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

export function CaregiverHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { family, profile } = useAuthStore();
  const { data: doses, isLoading, refetch } = useTodayDoses(family?.id);
  const { data: members } = useFamilyMembers(family?.id);

  useRealtimeDoses(family?.id);

  const elder = members?.find((m) => m.role === 'elder');
  const needsAttention = doses?.filter((d) => d.status === 'escalated' || d.status === 'missed') ?? [];

  function adherencePercent() {
    if (!doses || doses.length === 0) return 100;
    const done = doses.filter((d) => d.status === 'taken').length;
    return Math.round((done / doses.length) * 100);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.sage} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Hello, {profile?.name?.split(' ')[0]}</Text>
            <Text style={styles.familyName}>{family?.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.membersBtn}
            onPress={() => navigation.navigate('FamilyMembers')}
          >
            <Ionicons name="people" size={20} color={Colors.sage} />
            <Text style={styles.membersBtnText}>{members?.length ?? 0}</Text>
          </TouchableOpacity>
        </View>

        {elder && (
          <Card elevated style={styles.elderCard}>
            <View style={styles.elderHeader}>
              <Avatar name={elder.profile?.name ?? '?'} photoUrl={elder.profile?.photo_url} size={52} />
              <View style={styles.elderInfo}>
                <Text style={styles.elderName}>{elder.profile?.name}</Text>
                <Text style={styles.elderRole}>Your elder</Text>
              </View>
              <View style={styles.adherenceWrap}>
                <Text style={styles.adherenceNum}>{adherencePercent()}%</Text>
                <Text style={styles.adherenceLabel}>today</Text>
              </View>
            </View>

            {needsAttention.length > 0 && (
              <View style={styles.alertBanner}>
                <Ionicons name="alert-circle" size={18} color={Colors.coral} />
                <Text style={styles.alertText}>
                  {needsAttention.length} dose{needsAttention.length > 1 ? 's' : ''} need attention
                </Text>
              </View>
            )}
          </Card>
        )}

        {elder && (
          <TouchableOpacity
            style={styles.addMedBtn}
            onPress={() => navigation.navigate('AddMedicine', { familyId: family!.id, elderId: elder.user_id })}
          >
            <Ionicons name="add-circle" size={20} color={Colors.sage} />
            <Text style={styles.addMedText}>Add medicine for {elder.profile?.name?.split(' ')[0]}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Today's doses</Text>
          <Text style={styles.sectionMeta}>{doses?.length ?? 0} scheduled</Text>
        </View>

        {doses?.length === 0 && !isLoading && (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No doses scheduled today.</Text>
          </Card>
        )}

        {doses?.map((dose) => (
          <TouchableOpacity
            key={dose.id}
            onPress={() => navigation.navigate('DoseDetail', { doseLog: dose })}
            activeOpacity={0.85}
          >
            <DoseRow dose={dose} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function DoseRow({ dose }: { dose: DoseLog }) {
  const med = dose.medicine as any;
  const handler = dose.handler as any;

  return (
    <Card style={styles.doseRow}>
      <View style={styles.doseLeft}>
        <View style={[styles.critDot, { backgroundColor: med?.criticality === 'high' ? Colors.coral : Colors.sage }]} />
        <View>
          <Text style={styles.doseName}>{med?.name}</Text>
          <Text style={styles.doseTime}>{formatTime(dose.scheduled_at)}</Text>
        </View>
      </View>
      <View style={styles.doseRight}>
        <StatusBadge status={dose.status} />
        {handler && (
          <Text style={styles.handlerText}>
            <Ionicons name="call" size={12} color={Colors.sage} /> {handler.name}
          </Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: Spacing[4], paddingBottom: 100, gap: Spacing[3] },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing[2] },
  greeting: { fontSize: FontSizes.base, color: Colors.gray500 },
  familyName: { fontSize: FontSizes['2xl'], fontWeight: '800', color: Colors.navy },
  membersBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing[1], backgroundColor: '#E8F5EE', paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], borderRadius: Radius.full },
  membersBtnText: { fontSize: FontSizes.sm, color: Colors.sage, fontWeight: '600' },
  elderCard: { padding: Spacing[5] },
  elderHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  elderInfo: { flex: 1 },
  elderName: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.navy },
  elderRole: { fontSize: FontSizes.sm, color: Colors.gray500, marginTop: 2 },
  adherenceWrap: { alignItems: 'center' },
  adherenceNum: { fontSize: FontSizes['2xl'], fontWeight: '800', color: Colors.sage },
  adherenceLabel: { fontSize: FontSizes.xs, color: Colors.gray400 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginTop: Spacing[4], backgroundColor: '#FEF2F2', borderRadius: Radius.md, padding: Spacing[3] },
  alertText: { fontSize: FontSizes.sm, color: Colors.coral, fontWeight: '600' },
  addMedBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], backgroundColor: '#E8F5EE', borderRadius: Radius.md, paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], borderWidth: 1.5, borderColor: Colors.sageLight, borderStyle: 'dashed' },
  addMedText: { fontSize: FontSizes.sm, color: Colors.sageDark, fontWeight: '600' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: FontSizes.base, fontWeight: '700', color: Colors.navy },
  sectionMeta: { fontSize: FontSizes.sm, color: Colors.gray400 },
  doseRow: { padding: Spacing[3], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  doseLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  critDot: { width: 10, height: 10, borderRadius: 5 },
  doseName: { fontSize: FontSizes.base, fontWeight: '600', color: Colors.navy },
  doseTime: { fontSize: FontSizes.sm, color: Colors.gray500, marginTop: 2 },
  doseRight: { alignItems: 'flex-end', gap: 4 },
  handlerText: { fontSize: FontSizes.xs, color: Colors.sage },
  emptyCard: { alignItems: 'center', paddingVertical: Spacing[6] },
  emptyText: { fontSize: FontSizes.base, color: Colors.gray400 },
});
