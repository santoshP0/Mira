import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../store/authStore';
import { useMedicines } from '../hooks/useMedicines';
import { useFamilyMembers } from '../hooks/useFamily';
import { Colors, FontSizes, Spacing, Radius } from '../constants/theme';
import { DAYS_LABELS } from '../constants/config';
import { Medicine, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function AnimatedMedCard({
  med,
  index,
  onPress,
}: {
  med: Medicine;
  index: number;
  onPress: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 380,
        delay: 120 + index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 100,
        friction: 12,
        delay: 120 + index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  function pressIn() {
    Animated.spring(scale, { toValue: 0.97, tension: 300, friction: 10, useNativeDriver: true }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }).start();
  }

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}
      >
        <View style={styles.medCard}>
          {med.photo_url ? (
            <Image source={{ uri: med.photo_url }} style={styles.pillPhoto} />
          ) : (
            <LinearGradient
              colors={['#EBF5EF', '#D4EDDF']}
              style={[styles.pillPhoto, styles.pillPlaceholder]}
            >
              <Ionicons name="medical" size={26} color={Colors.sage} />
            </LinearGradient>
          )}

          <View style={styles.medInfo}>
            <View style={styles.medNameRow}>
              <Text style={styles.medName} numberOfLines={1}>{med.name}</Text>
              {med.criticality === 'high' && (
                <View style={styles.critBadge}>
                  <Ionicons name="alert-circle" size={12} color={Colors.coral} />
                  <Text style={styles.critText}>High</Text>
                </View>
              )}
            </View>

            {med.dose && <Text style={styles.medDose}>{med.dose}</Text>}

            <View style={styles.scheduleRow}>
              <Ionicons name="time-outline" size={13} color={Colors.sage} />
              <Text style={styles.scheduleText}>
                {med.schedule.times.join(' · ')}
              </Text>
            </View>

            <View style={styles.daysRow}>
              {med.schedule.days.map((d) => (
                <View key={d} style={styles.dayPill}>
                  <Text style={styles.dayText}>{DAYS_LABELS[d]}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.chevronWrap}>
            <Ionicons name="chevron-forward" size={16} color={Colors.gray300} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function MedicinesScreen() {
  const navigation = useNavigation<Nav>();
  const { family } = useAuthStore();
  const { data: medicines, isLoading } = useMedicines(family?.id);
  const { data: members } = useFamilyMembers(family?.id);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(0)).current;

  const elder = members?.find((m) => m.role === 'elder');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, tension: 150, friction: 8, delay: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.sage, Colors.sageDark, '#3D7359']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <Animated.View style={[styles.headerContent, { opacity: headerOpacity }]}>
            <View>
              <Text style={styles.headerLabel}>MEDICINE CABINET</Text>
              <Text style={styles.title}>Medicines</Text>
            </View>
            {elder && (
              <Animated.View style={{ transform: [{ scale: fabScale }] }}>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => navigation.navigate('AddMedicine', { familyId: family!.id, elderId: elder.user_id })}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={24} color={Colors.sageDark} />
                </TouchableOpacity>
              </Animated.View>
            )}
          </Animated.View>

          {elder && (
            <Animated.View style={[styles.elderPill, { opacity: headerOpacity }]}>
              <Ionicons name="person" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.elderPillText}>
                {elder.profile?.name ?? 'Elder'} · {medicines?.length ?? 0} medicine{medicines?.length !== 1 ? 's' : ''}
              </Text>
            </Animated.View>
          )}
        </SafeAreaView>
      </LinearGradient>

      <FlatList
        data={medicines}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <AnimatedMedCard
            med={item}
            index={index}
            onPress={() => navigation.navigate('EditMedicine', { medicine: item })}
          />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <LinearGradient colors={['#EBF5EF', '#D4EDDF']} style={styles.emptyIcon}>
                <Ionicons name="medical-outline" size={40} color={Colors.sage} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No medicines yet</Text>
              <Text style={styles.emptyText}>
                Add medicines for {elder?.profile?.name ?? 'your elder'} to get started.
              </Text>
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
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  elderPill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: Spacing[5], backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: Spacing[3], paddingVertical: 6, borderRadius: Radius.full, alignSelf: 'flex-start' },
  elderPillText: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

  list: { padding: Spacing[4], gap: Spacing[3], paddingBottom: 100 },

  medCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing[4], flexDirection: 'row', alignItems: 'center', gap: Spacing[3], shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: Colors.gray100 },
  pillPhoto: { width: 60, height: 60, borderRadius: Radius.md },
  pillPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  medInfo: { flex: 1, gap: 5 },
  medNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], flexWrap: 'wrap' },
  medName: { fontSize: FontSizes.base, fontWeight: '700', color: Colors.navy, flex: 1 },
  critBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  critText: { fontSize: 10, color: Colors.coral, fontWeight: '700' },
  medDose: { fontSize: FontSizes.sm, color: Colors.gray500 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scheduleText: { fontSize: FontSizes.sm, color: Colors.gray500, fontWeight: '500' },
  daysRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  dayPill: { backgroundColor: '#EBF5EF', paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.sm },
  dayText: { fontSize: FontSizes.xs, color: Colors.sageDark, fontWeight: '600' },
  chevronWrap: { padding: 4 },

  empty: { alignItems: 'center', paddingVertical: Spacing[16], gap: Spacing[4] },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.navy },
  emptyText: { fontSize: FontSizes.base, color: Colors.gray400, textAlign: 'center', lineHeight: 22, paddingHorizontal: Spacing[6] },
});
