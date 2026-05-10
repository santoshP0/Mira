import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../../components/common/Avatar';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { TextInput } from '../../components/common/TextInput';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { RootStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, family, myMembership, reset } = useAuthStore();
  const [quietStart, setQuietStart] = useState(family?.quiet_hours_start?.slice(0, 5) ?? '23:00');
  const [quietEnd, setQuietEnd] = useState(family?.quiet_hours_end?.slice(0, 5) ?? '06:00');
  const [saving, setSaving] = useState(false);

  const isAdmin = myMembership?.role === 'caregiver' && family?.created_by === profile?.id;

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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        <Card elevated style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Avatar name={profile?.name ?? '?'} photoUrl={profile?.photo_url} size={56} />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.name}</Text>
              <View style={styles.rolePill}>
                <Text style={styles.roleText}>{myMembership?.role ?? '—'}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.gray300} />
          </View>
        </Card>

        <Text style={styles.sectionLabel}>Family Circle</Text>
        <Card style={styles.settingCard}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('FamilyMembers')}
          >
            <Ionicons name="people-outline" size={22} color={Colors.sage} />
            <Text style={styles.settingText}>Manage Members</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.gray300} />
          </TouchableOpacity>
        </Card>

        {isAdmin && (
          <>
            <Text style={styles.sectionLabel}>Quiet Hours</Text>
            <Card style={styles.settingCard}>
              <Text style={styles.settingNote}>
                Reminders won't escalate during quiet hours, unless the medicine is high criticality.
              </Text>
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
                style={{ alignSelf: 'flex-start', marginTop: Spacing[3] }}
              />
            </Card>
          </>
        )}

        <Text style={styles.sectionLabel}>About</Text>
        <Card style={styles.settingCard}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>App</Text>
            <Text style={styles.aboutValue}>Mira v1.0</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Family</Text>
            <Text style={styles.aboutValue}>{family?.name ?? '—'}</Text>
          </View>
        </Card>

        <Button
          label="Sign Out"
          onPress={signOut}
          variant="danger"
          size="md"
          style={{ marginTop: Spacing[4] }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: Spacing[4], paddingBottom: 100, gap: Spacing[3] },
  title: { fontSize: FontSizes['2xl'], fontWeight: '800', color: Colors.navy, marginBottom: Spacing[2] },
  profileCard: {},
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  profileInfo: { flex: 1, gap: Spacing[1] },
  profileName: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.navy },
  rolePill: { backgroundColor: '#E8F5EE', paddingHorizontal: Spacing[2], paddingVertical: 2, borderRadius: Radius.full, alignSelf: 'flex-start' },
  roleText: { fontSize: FontSizes.xs, color: Colors.sageDark, fontWeight: '600', textTransform: 'capitalize' },
  sectionLabel: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.gray400, textTransform: 'uppercase', letterSpacing: 1, marginLeft: Spacing[1] },
  settingCard: { gap: 0, padding: 0, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], padding: Spacing[4] },
  settingText: { flex: 1, fontSize: FontSizes.base, color: Colors.navy, fontWeight: '500' },
  settingNote: { fontSize: FontSizes.sm, color: Colors.gray500, lineHeight: 20, padding: Spacing[4], paddingBottom: Spacing[2] },
  quietRow: { flexDirection: 'row', gap: Spacing[4], paddingHorizontal: Spacing[4] },
  quietInput: { flex: 1 },
  quietLabel: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.navyLight, marginBottom: Spacing[1] },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  aboutLabel: { fontSize: FontSizes.base, color: Colors.gray500 },
  aboutValue: { fontSize: FontSizes.base, color: Colors.navy, fontWeight: '500' },
});
