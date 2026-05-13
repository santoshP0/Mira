import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import { useAcceptInvite } from '../../hooks/useFamily';
import { Button } from '../../components/common/Button';
import { TextInput } from '../../components/common/TextInput';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { RootStackParamList, UserRole } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'JoinFamily'>;

export function JoinFamilyScreen({ navigation, route }: Props) {
  const { user, setFamily, setMembership } = useAuthStore();
  const [token, setToken] = useState(route.params?.token ?? '');
  const [role, setRole] = useState<UserRole>('family');
  const acceptInvite = useAcceptInvite();

  async function handleJoin() {
    if (!token.trim() || !user) return;

    try {
      const family = await acceptInvite.mutateAsync({
        token: token.trim().toUpperCase(),
        userId: user.id,
        role,
      });
      setFamily(family);
      setMembership({ family_id: family.id, user_id: user.id, role, joined_at: new Date().toISOString() });
    } catch (e: any) {
      Alert.alert('Invalid code', e.message ?? 'This code is invalid or has expired.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Join a family circle</Text>
        <Text style={styles.sub}>Enter the 6-character code your caregiver shared.</Text>

        <TextInput
          label="Invite code"
          value={token}
          onChangeText={(t) => setToken(t.toUpperCase())}
          placeholder="ABC123"
          autoCapitalize="characters"
          maxLength={8}
          autoFocus={!route.params?.token}
          style={styles.codeInput}
        />

        <Text style={styles.sectionTitle}>Your role in this family</Text>
        <View style={styles.roleRow}>
          {(['family', 'elder'] as UserRole[]).map((r) => (
            <Button
              key={r}
              label={r === 'elder' ? 'I take medicines' : 'Family member'}
              onPress={() => setRole(r)}
              variant={role === r ? 'primary' : 'secondary'}
              style={styles.roleBtn}
            />
          ))}
        </View>

        <Button
          label="Join Family"
          onPress={handleJoin}
          loading={acceptInvite.isPending}
          disabled={token.trim().length < 6}
          size="lg"
          style={{ marginTop: Spacing[6] }}
        />

        <Button
          label="Back"
          onPress={() => navigation.goBack()}
          variant="ghost"
          style={{ marginTop: Spacing[2] }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: Spacing[6], paddingTop: 72, flexGrow: 1 },
  title: { fontSize: FontSizes['3xl'], fontWeight: '800', color: Colors.navy, marginBottom: Spacing[2] },
  sub: { fontSize: FontSizes.base, color: Colors.gray500, marginBottom: Spacing[8], lineHeight: 22 },
  codeInput: { letterSpacing: 4, fontSize: FontSizes.xl, fontWeight: '700', textAlign: 'center' },
  sectionTitle: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.gray500, marginBottom: Spacing[3], textTransform: 'uppercase', letterSpacing: 0.5 },
  roleRow: { flexDirection: 'row', gap: Spacing[3] },
  roleBtn: { flex: 1 },
});
