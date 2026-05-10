import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  Modal,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useAuthStore } from '../../store/authStore';
import { useFamilyMembers, useGenerateInvite, useRemoveMember } from '../../hooks/useFamily';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { RootStackParamList } from '../../types';

const ROLE_LABELS = { elder: 'Elder', caregiver: 'Caregiver', family: 'Family' };
const ROLE_COLORS = { elder: '#7C3AED', caregiver: Colors.sage, family: Colors.warning };

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'FamilyMembers'> };

export function FamilyMembersScreen({ navigation }: Props) {
  const { family, myMembership, user } = useAuthStore();
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [qrVisible, setQrVisible] = useState(false);

  const { data: members, isLoading } = useFamilyMembers(family?.id);
  const generateInvite = useGenerateInvite();
  const removeMember = useRemoveMember();

  const isAdmin = myMembership?.role === 'caregiver' && family?.created_by === user?.id;

  async function handleGenerateQR() {
    if (!family || !user) return;
    try {
      const invite = await generateInvite.mutateAsync({ familyId: family.id, createdBy: user.id });
      setInviteToken(invite.token);
      setQrVisible(true);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  async function handleShare() {
    if (!inviteToken) return;
    await Share.share({
      message: `Join the ${family?.name} family on Mira! Use code: ${inviteToken}\n\nOr open: mira://join?token=${inviteToken}`,
      title: 'Join Mira Family Circle',
    });
  }

  function handleRemove(userId: string, name: string) {
    if (!family) return;
    Alert.alert(
      'Remove member',
      `Remove ${name} from ${family.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeMember.mutate({ familyId: family.id, userId }),
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card elevated style={styles.familyCard}>
        <View style={styles.familyHeader}>
          <View style={styles.familyIcon}>
            <Ionicons name="people" size={24} color={Colors.sage} />
          </View>
          <View>
            <Text style={styles.familyName}>{family?.name}</Text>
            <Text style={styles.memberCount}>{members?.length ?? 0} members</Text>
          </View>
        </View>

        {isAdmin && (
          <Button
            label="Invite someone"
            onPress={handleGenerateQR}
            loading={generateInvite.isPending}
            variant="secondary"
            size="sm"
            style={styles.inviteBtn}
          />
        )}
      </Card>

      <Text style={styles.sectionTitle}>Members</Text>

      {members?.map((m) => (
        <Card key={m.user_id} style={styles.memberCard}>
          <View style={styles.memberRow}>
            <Avatar name={m.profile?.name ?? '?'} photoUrl={m.profile?.photo_url} size={48} />
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{m.profile?.name ?? 'Unknown'}</Text>
              <View style={[styles.rolePill, { backgroundColor: `${ROLE_COLORS[m.role]}22` }]}>
                <Text style={[styles.roleText, { color: ROLE_COLORS[m.role] }]}>
                  {ROLE_LABELS[m.role]}
                </Text>
              </View>
            </View>
            {isAdmin && m.user_id !== user?.id && (
              <TouchableOpacity
                onPress={() => handleRemove(m.user_id, m.profile?.name ?? 'this member')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="person-remove-outline" size={20} color={Colors.coral} />
              </TouchableOpacity>
            )}
            {m.user_id === user?.id && (
              <View style={styles.youBadge}>
                <Text style={styles.youText}>You</Text>
              </View>
            )}
          </View>
        </Card>
      ))}

      <Modal visible={qrVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card elevated style={styles.qrModal}>
            <Text style={styles.qrTitle}>Share this with your family</Text>
            <Text style={styles.qrSub}>Valid for 10 minutes · Single use</Text>

            {inviteToken && (
              <View style={styles.qrWrap}>
                <QRCode
                  value={`mira://join?token=${inviteToken}`}
                  size={200}
                  color={Colors.navy}
                  backgroundColor={Colors.white}
                />
              </View>
            )}

            <View style={styles.codeRow}>
              <Text style={styles.codeLabel}>Code</Text>
              <Text style={styles.code}>{inviteToken}</Text>
            </View>

            <View style={styles.qrActions}>
              <Button label="Share" onPress={handleShare} size="md" style={{ flex: 1 }} />
              <Button
                label="Done"
                onPress={() => setQrVisible(false)}
                variant="secondary"
                size="md"
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: Spacing[4], gap: Spacing[3] },
  familyCard: { marginBottom: Spacing[2] },
  familyHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], marginBottom: Spacing[4] },
  familyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyName: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.navy },
  memberCount: { fontSize: FontSizes.sm, color: Colors.gray500 },
  inviteBtn: { alignSelf: 'flex-start' },
  sectionTitle: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.gray500, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: Spacing[1] },
  memberCard: { padding: Spacing[3] },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  memberInfo: { flex: 1, gap: 4 },
  memberName: { fontSize: FontSizes.base, fontWeight: '600', color: Colors.navy },
  rolePill: { paddingHorizontal: Spacing[2], paddingVertical: 2, borderRadius: Radius.full, alignSelf: 'flex-start' },
  roleText: { fontSize: FontSizes.xs, fontWeight: '600' },
  youBadge: { backgroundColor: Colors.sageLight + '33', paddingHorizontal: Spacing[2], paddingVertical: 2, borderRadius: Radius.full },
  youText: { fontSize: FontSizes.xs, color: Colors.sage, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: Spacing[6] },
  qrModal: { width: '100%' },
  qrTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.navy, textAlign: 'center', marginBottom: Spacing[1] },
  qrSub: { fontSize: FontSizes.sm, color: Colors.gray400, textAlign: 'center', marginBottom: Spacing[6] },
  qrWrap: { alignItems: 'center', padding: Spacing[4], backgroundColor: Colors.white, borderRadius: Radius.md, marginBottom: Spacing[5], borderWidth: 1, borderColor: Colors.gray200 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing[3], marginBottom: Spacing[5] },
  codeLabel: { fontSize: FontSizes.sm, color: Colors.gray500 },
  code: { fontSize: FontSizes['2xl'], fontWeight: '800', color: Colors.navy, letterSpacing: 4 },
  qrActions: { flexDirection: 'row', gap: Spacing[3] },
});
