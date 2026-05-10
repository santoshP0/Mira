import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useMedicines } from '../hooks/useMedicines';
import { useFamilyMembers } from '../hooks/useFamily';
import { Card } from '../components/common/Card';
import { Colors, FontSizes, Spacing, Radius } from '../constants/theme';
import { DAYS_LABELS } from '../constants/config';
import { Medicine, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function MedicinesScreen() {
  const navigation = useNavigation<Nav>();
  const { family } = useAuthStore();
  const { data: medicines, isLoading } = useMedicines(family?.id);
  const { data: members } = useFamilyMembers(family?.id);

  const elder = members?.find((m) => m.role === 'elder');

  function renderMedicine(med: Medicine) {
    return (
      <TouchableOpacity
        key={med.id}
        onPress={() => navigation.navigate('EditMedicine', { medicine: med })}
        activeOpacity={0.85}
      >
        <Card style={styles.medCard}>
          <View style={styles.medRow}>
            {med.photo_url ? (
              <Image source={{ uri: med.photo_url }} style={styles.pillPhoto} />
            ) : (
              <View style={[styles.pillPhoto, styles.pillPlaceholder]}>
                <Ionicons name="medical" size={24} color={Colors.sage} />
              </View>
            )}
            <View style={styles.medInfo}>
              <View style={styles.medNameRow}>
                <Text style={styles.medName}>{med.name}</Text>
                {med.criticality === 'high' && (
                  <Ionicons name="alert-circle" size={16} color={Colors.coral} />
                )}
              </View>
              {med.dose && <Text style={styles.medDose}>{med.dose}</Text>}
              <View style={styles.scheduleRow}>
                <Ionicons name="time-outline" size={14} color={Colors.gray400} />
                <Text style={styles.scheduleText}>{med.schedule.times.join(', ')}</Text>
              </View>
              <View style={styles.daysRow}>
                {med.schedule.days.map((d) => (
                  <View key={d} style={styles.dayPill}>
                    <Text style={styles.dayText}>{DAYS_LABELS[d]}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.gray300} />
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Medicines</Text>
        {elder && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddMedicine', { familyId: family!.id, elderId: elder.user_id })}
          >
            <Ionicons name="add" size={22} color={Colors.white} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={medicines}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => renderMedicine(item)}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="medical-outline" size={48} color={Colors.gray200} />
              <Text style={styles.emptyTitle}>No medicines yet</Text>
              <Text style={styles.emptyText}>
                Add medicines for {elder?.profile?.name ?? 'your elder'} to get started.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[5], paddingTop: Spacing[4], paddingBottom: Spacing[3] },
  title: { fontSize: FontSizes['2xl'], fontWeight: '800', color: Colors.navy },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.sage, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Spacing[4], gap: Spacing[3], paddingBottom: 100 },
  medCard: { padding: Spacing[3] },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  pillPhoto: { width: 56, height: 56, borderRadius: Radius.md },
  pillPlaceholder: { backgroundColor: Colors.gray100, alignItems: 'center', justifyContent: 'center' },
  medInfo: { flex: 1, gap: 4 },
  medNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  medName: { fontSize: FontSizes.base, fontWeight: '700', color: Colors.navy },
  medDose: { fontSize: FontSizes.sm, color: Colors.gray500 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scheduleText: { fontSize: FontSizes.sm, color: Colors.gray500 },
  daysRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  dayPill: { backgroundColor: Colors.gray100, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm },
  dayText: { fontSize: FontSizes.xs, color: Colors.gray500, fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: Spacing[16], gap: Spacing[3] },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.navy },
  emptyText: { fontSize: FontSizes.base, color: Colors.gray400, textAlign: 'center', lineHeight: 22 },
});
