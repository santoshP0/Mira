import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';
import { TextInput } from '../../components/common/TextInput';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { RootStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ROLE_CONFIG = {
  elder: { label: 'Elder', color: '#7C3AED', bg: 'rgba(124,58,237,0.12)' },
  caregiver: { label: 'Caregiver', color: Colors.sageDark, bg: 'rgba(255,255,255,0.22)' },
  family: { label: 'Family', color: Colors.warning, bg: 'rgba(245,158,11,0.18)' },
};

function SettingRow({ icon, label, onPress, destructive = false }: {
  icon: string;
  label: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.spring(scale, { toValue: 0.97, tension: 300, friction: 10, useNativeDriver: true }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={styles.settingRow}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}
      >
        <View style={[styles.settingIconWrap, destructive && styles.settingIconDestructive]}>
          <Ionicons name={icon as any} size={18} color={destructive ? Colors.coral : Colors.sage} />
        </View>
        <Text style={[styles.settingText, destructive && styles.settingTextDestructive]}>{label}</Text>
        {!destructive && <Ionicons name="chevron-forward" size={16} color={Colors.gray300} />}
      </TouchableOpacity>
    </Animated.View>
  );
}

function AnimatedSection({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay: 150 + index * 90, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 100, friction: 12, delay: 150 + index * 90, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, family, myMembership, reset } = useAuthStore();
  const [quietStart, setQuietStart] = useState(family?.quiet_hours_start?.slice(0, 5) ?? '23:00');
  const [quietEnd, setQuietEnd] = useState(family?.quiet_hours_end?.slice(0, 5) ?? '06:00');
  const [saving, setSaving] = useState(false);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(-15)).current;
  const avatarScale = useRef(new Animated.Value(0.7)).current;

  const isAdmin = myMembership?.role === 'caregiver' && family?.created_by === profile?.id;
  const role = myMembership?.role ?? 'family';
  const roleConfig = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.family;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(headerTranslate, { toValue: 0, tension: 100, friction: 12, useNativeDriver: true }),
      Animated.spring(avatarScale, { toValue: 1, tension: 150, friction: 10, delay: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  async function saveQuietHours() {
    if (!family) return;
    setSaving(true);
    await supabase.from('families').update({ quiet_hours_start: quietStart, quiet_hours_end: quietEnd }).eq('id', family.id);
    setSaving(false);
    Alert.alert('Saved', 'Quiet hours updated.');
  }

  async function signOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          reset();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.sage, Colors.sageDark, '#3D7359']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <Animated.View style={[styles.headerContent, { opacity: headerOpacity, transform: [{ translateY: headerTranslate }] }]}>
            <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
              <View style={styles.avatarRing}>
                <Avatar name={profile?.name ?? '?'} photoUrl={profile?.photo_url} size={68} />
              </View>
            </Animated.View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.name}</Text>
              <View style={[styles.rolePill, { backgroundColor: roleConfig.bg }]}>
                <Text style={[styles.roleText, { color: role === 'caregiver' ? Colors.white : roleConfig.color }]}>
                  {roleConfig.label}
                </Text>
              </View>
              {family && (
                <Text style={styles.familyLabel}>{family.name}</Text>
              )}
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Family */}
        <AnimatedSection index={0}>
          <Text style={styles.sectionLabel}>Family</Text>
          <View style={styles.card}>
            <SettingRow
              icon="people-outline"
              label="Manage Members"
              onPress={() => navigation.navigate('FamilyMembers')}
            />
          </View>
        </AnimatedSection>

        {/* Quiet Hours */}
        {isAdmin && (
          <AnimatedSection index={1}>
            <Text style={styles.sectionLabel}>Quiet Hours</Text>
            <View style={styles.card}>
              <View style={styles.quietNote}>
                <Ionicons name="moon-outline" size={16} color={Colors.sage} />
                <Text style={styles.quietNoteText}>
                  Escalations pause during quiet hours (except high-criticality medicines).
                </Text>
              </View>
              <View style={styles.quietRow}>
                <View style={styles.quietInput}>
                  <Text style={styles.quietLabel}>From</Text>
                  <TextInput
                    value={quietStart}
                    onChangeText={setQuietStart}
                    placeholder="23:00"
                    keyboardType="numbers-and-punctuation"
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
                <View style={styles.quietArrow}>
                  <Ionicons name="arrow-forward" size={16} color={Colors.gray400} />
                </View>
                <View style={styles.quietInput}>
                  <Text style={styles.quietLabel}>To</Text>
                  <TextInput
                    value={quietEnd}
                    onChangeText={setQuietEnd}
                    placeholder="06:00"
                    keyboardType="numbers-and-punctuation"
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              </View>
              <Button
                label="Save Quiet Hours"
                onPress={saveQuietHours}
                loading={saving}
                variant="secondary"
                size="sm"
                style={{ alignSelf: 'flex-start', marginTop: Spacing[3], marginHorizontal: Spacing[4], marginBottom: Spacing[4] }}
              />
            </View>
          </AnimatedSection>
        )}

        {/* About */}
        <AnimatedSection index={isAdmin ? 2 : 1}>
          <Text style={styles.sectionLabel}>About</Text>
          <View style={styles.card}>
            <View style={styles.aboutRow}>
              <View style={[styles.settingIconWrap, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="information-circle-outline" size={18} color="#6366F1" />
              </View>
              <Text style={styles.aboutLabel}>Version</Text>
              <Text style={styles.aboutValue}>Mira v1.0</Text>
            </View>
            <View style={[styles.aboutRow, styles.aboutRowLast]}>
              <View style={[styles.settingIconWrap, { backgroundColor: '#EBF5EF' }]}>
                <Ionicons name="home-outline" size={18} color={Colors.sage} />
              </View>
              <Text style={styles.aboutLabel}>Family</Text>
              <Text style={styles.aboutValue}>{family?.name ?? '—'}</Text>
            </View>
          </View>
        </AnimatedSection>

        {/* Sign out */}
        <AnimatedSection index={isAdmin ? 3 : 2}>
          <View style={styles.card}>
            <SettingRow icon="log-out-outline" label="Sign Out" onPress={signOut} destructive />
          </View>
        </AnimatedSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },

  header: { paddingBottom: Spacing[6] },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing[4], paddingHorizontal: Spacing[5], paddingTop: Spacing[3], paddingBottom: Spacing[1] },
  avatarRing: { padding: 3, borderRadius: 40, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  profileInfo: { flex: 1, gap: Spacing[1] },
  profileName: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.white },
  rolePill: { paddingHorizontal: Spacing[2], paddingVertical: 3, borderRadius: Radius.full, alignSelf: 'flex-start' },
  roleText: { fontSize: FontSizes.xs, fontWeight: '700', textTransform: 'capitalize' },
  familyLabel: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

  content: { padding: Spacing[4], paddingBottom: 100, gap: Spacing[3] },
  sectionLabel: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.gray400, textTransform: 'uppercase', letterSpacing: 1, marginLeft: Spacing[1], marginBottom: Spacing[1] },

  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1, borderWidth: 1, borderColor: Colors.gray100 },

  settingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], padding: Spacing[4] },
  settingIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#EBF5EF', alignItems: 'center', justifyContent: 'center' },
  settingIconDestructive: { backgroundColor: '#FEE2E2' },
  settingText: { flex: 1, fontSize: FontSizes.base, color: Colors.navy, fontWeight: '500' },
  settingTextDestructive: { color: Colors.coral },

  quietNote: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[2], padding: Spacing[4], paddingBottom: Spacing[3], borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  quietNoteText: { flex: 1, fontSize: FontSizes.sm, color: Colors.gray500, lineHeight: 19 },
  quietRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], paddingHorizontal: Spacing[4], paddingTop: Spacing[3] },
  quietInput: { flex: 1 },
  quietArrow: { paddingTop: Spacing[5] },
  quietLabel: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.navyLight, marginBottom: Spacing[1] },

  aboutRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], padding: Spacing[3], paddingHorizontal: Spacing[4], borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  aboutRowLast: { borderBottomWidth: 0 },
  aboutLabel: { flex: 1, fontSize: FontSizes.base, color: Colors.gray500 },
  aboutValue: { fontSize: FontSizes.base, color: Colors.navy, fontWeight: '600' },
});
