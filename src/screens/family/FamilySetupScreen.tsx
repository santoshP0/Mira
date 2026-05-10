import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useCreateFamily } from '../../hooks/useFamily';
import { Button } from '../../components/common/Button';
import { TextInput } from '../../components/common/TextInput';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { RootStackParamList } from '../../types';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'CreateFamily'> };

export function FamilySetupScreen({ navigation }: Props) {
  const { user, setFamily, setMembership } = useAuthStore();
  const [familyName, setFamilyName] = useState('');
  const createFamily = useCreateFamily();

  async function handleCreate() {
    if (!familyName.trim() || !user) return;

    try {
      const family = await createFamily.mutateAsync({ name: familyName.trim(), userId: user.id });
      setFamily(family);
      setMembership({ family_id: family.id, user_id: user.id, role: 'caregiver', joined_at: new Date().toISOString() });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Set up your{'\n'}family circle</Text>
        <Text style={styles.sub}>Create a space for your family to stay connected and ensure medicines are never missed.</Text>

        <View style={styles.options}>
          <TouchableOpacity style={styles.optionCard} activeOpacity={0.85}>
            <View style={styles.optionInner}>
              <View style={[styles.optionIcon, { backgroundColor: '#E8F5EE' }]}>
                <Ionicons name="add-circle" size={32} color={Colors.sage} />
              </View>
              <Text style={styles.optionTitle}>Create a new family</Text>
              <Text style={styles.optionDesc}>You'll be the caregiver admin</Text>
            </View>

            <TextInput
              label="Family name"
              value={familyName}
              onChangeText={setFamilyName}
              placeholder="e.g. Sharma Family"
              containerStyle={{ marginBottom: 0 }}
            />

            <Button
              label="Create Family"
              onPress={handleCreate}
              loading={createFamily.isPending}
              disabled={!familyName.trim()}
              size="lg"
              style={{ marginTop: Spacing[4] }}
            />
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.joinCard}
            onPress={() => navigation.navigate('ScanQR')}
            activeOpacity={0.85}
          >
            <View style={[styles.optionIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="qr-code" size={32} color={Colors.warning} />
            </View>
            <View style={styles.joinText}>
              <Text style={styles.optionTitle}>Join with a QR code</Text>
              <Text style={styles.optionDesc}>Scan the code your caregiver shared</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.joinCard}
            onPress={() => navigation.navigate('JoinFamily', {})}
            activeOpacity={0.85}
          >
            <View style={[styles.optionIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="key" size={32} color="#7C3AED" />
            </View>
            <View style={styles.joinText}>
              <Text style={styles.optionTitle}>Enter a 6-digit code</Text>
              <Text style={styles.optionDesc}>Got a code instead of a QR?</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: Spacing[6], paddingTop: 72, flexGrow: 1 },
  title: { fontSize: FontSizes['3xl'], fontWeight: '800', color: Colors.navy, marginBottom: Spacing[3], lineHeight: 40 },
  sub: { fontSize: FontSizes.base, color: Colors.gray500, marginBottom: Spacing[8], lineHeight: 22 },
  options: { gap: Spacing[4] },
  optionCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing[5],
    borderWidth: 1.5,
    borderColor: Colors.gray200,
  },
  optionInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], marginBottom: Spacing[5] },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: { fontSize: FontSizes.base, fontWeight: '700', color: Colors.navy },
  optionDesc: { fontSize: FontSizes.sm, color: Colors.gray500, marginTop: 2 },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.gray200 },
  dividerText: { fontSize: FontSizes.sm, color: Colors.gray400 },
  joinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    gap: Spacing[3],
  },
  joinText: { flex: 1 },
});
