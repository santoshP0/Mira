import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { useAuthStore } from '../../store/authStore';
import { useFamilyMembers, useGenerateInvite, useRemoveMember } from '../../hooks/useFamily';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { RootStackParamList } from '../../types';

const ROLE_CONFIG = {
  elder: { label: 'Elder', color: '#7C3AED', bg: '#EDE9FE', icon: 'person' as const },
  caregiver: { label: 'Caregiver', color: Colors.sageDark, bg: '#EBF5EF', icon: 'shield-checkmark' as const },
  family: { label: 'Family', color: Colors.warning, bg: '#FEF3C7', icon: 'people' as const },
};

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'FamilyMembers'> };

function AnimatedMemberCard({ member, index, isAdmin, isMe, onRemove }: {
  member: any;
  index: number;
  isAdmin: boolean;
  isMe: boolean;
  onRemove: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: 200 + index * 70, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 100, friction: 12, delay: 200 + index * 70, useNativeDriver: true }),
    ]).start();
  }, []);

  const cfg = ROLE_CONFIG[member.role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.family;

  return (
    <Animated.View style={[styles.memberCard, { opacity, transform: [{ translateY }] }]}>
      <Avatar name={member.profile?.name ?? '?'} photoUrl={member.profile?.photo_url} size={50} />

      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{member.profile?.name ?? 'Unknown'}</Text>
        <View style={[styles.rolePill, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={11} color={cfg.color} />
          <Text style={[styles.roleText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={styles.memberActions}>
        {isMe && (
          <View style={styles.youBadge}>
            <Text style={styles.youText}>You</Text>
          </View>
        )}
        {isAdmin && !isMe && (
          <TouchableOpacity onPress={onRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="person-remove-outline" size={20} color={Colors.coral} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

export function FamilyMembersScreen({ navigation }: Props) {
  const { family, myMembership, user } = useAuthStore();
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [qrVisible, setQrVisible] = useState(false);
  const modalScale = useRef(new Animated.Value(0.85)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  const { data: members } = useFamilyMembers(family?.id);
  const generateInvite = useGenerateInvite();
  const removeMember = useRemoveMember();

  const headerOpacity = useRef(new Animated.Value(0)).current;

  const isAdmin = myMembership?.role === 'caregiver' && family?.created_by === user?.id;

  useEffect(() => {
    Animated.timing(headerOpacity, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (qrVisible) {
      Animated.parallel([
        Animated.spring(modalScale, { toValue: 1, tension: 200, friction: 14, useNativeDriver: true }),
        Animated.timing(modalOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      modalScale.setValue(0.85);
      modalOpacity.setValue(0);
    }
  }, [qrVisible]);

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
    Alert.alert('Remove member', `Remove ${name} from ${family.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMember.mutate({ familyId: family.id, userId }) },
    ]);
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.sage, Colors.sageDark, '#3D7359']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <Animated.View style={[styles.headerContent, { opacity: headerOpacity }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color={Colors.white} />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.headerLabel}>FAMILY CIRCLE</Text>
              <Text style={styles.title}>{family?.name}</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.statsRow, { opacity: headerOpacity }]}>
            <View style={styles.statPill}>
              <Ionicons name="people" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.statText}>{members?.length ?? 0} member{members?.length !== 1 ? 's' : ''}</Text>
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isAdmin && (
          <TouchableOpacity style={styles.inviteCard} onPress={handleGenerateQR} activeOpacity={0.8}>
            <LinearGradient colors={['#EBF5EF', '#D4EDDF']} style={styles.inviteIcon}>
              <Ionicons name="person-add" size={22} color={Colors.sageDark} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.inviteTitle}>Invite someone</Text>
              <Text style={styles.inviteSub}>Share a QR code or invite link</Text>
            </View>
            {generateInvite.isPending ? (
              <Ionicons name="ellipsis-horizontal" size={20} color={Colors.gray400} />
            ) : (
              <View style={styles.inviteArrow}>
                <Ionicons name="chevron-forward" size={16} color={Colors.sageDark} />
              </View>
            )}
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Members</Text>

        {members?.map((m, index) => (
          <AnimatedMemberCard
            key={m.user_id}
            member={m}
            index={index}
            isAdmin={isAdmin}
            isMe={m.user_id === user?.id}
            onRemove={() => handleRemove(m.user_id, m.profile?.name ?? 'this member')}
          />
        ))}
      </ScrollView>

      <Modal visible={qrVisible} transparent animationType="none" onRequestClose={() => setQrVisible(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View style={{ transform: [{ scale: modalScale }], opacity: modalOpacity, width: '100%' }}>
            <View style={styles.qrModal}>
              <LinearGradient colors={[Colors.sage, Colors.sageDark]} style={styles.qrHeader}>
                <Text style={styles.qrTitle}>Invite to {family?.name}</Text>
                <Text style={styles.qrSub}>Valid for 10 minutes · Single use</Text>
              </LinearGradient>

              <View style={styles.qrBody}>
                {inviteToken && (
                  <View style={styles.qrWrap}>
                    <QRCode
                      value={`mira://join?token=${inviteToken}`}
                      size={180}
                      color={Colors.navy}
                      backgroundColor={Colors.white}
                    />
                  </View>
                )}

                <View style={styles.codePill}>
                  <Text style={styles.codeLabel}>CODE</Text>
                  <Text style={styles.code}>{inviteToken}</Text>
                </View>

                <View style={styles.qrActions}>
                  <TouchableOpacity style={styles.qrShareBtn} onPress={handleShare}>
                    <LinearGradient colors={[Colors.sage, Colors.sageDark]} style={styles.qrShareGrad}>
                      <Ionicons name="share-outline" size={18} color={Colors.white} />
                      <Text style={styles.qrShareText}>Share Link</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.qrDoneBtn} onPress={() => setQrVisible(false)}>
                    <Text style={styles.qrDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },

  header: { paddingBottom: Spacing[4] },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], paddingHorizontal: Spacing[4], paddingTop: Spacing[4], paddingBottom: Spacing[3] },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  title: { fontSize: FontSizes['2xl'], fontWeight: '800', color: Colors.white },
  statsRow: { paddingHorizontal: Spacing[5], paddingBottom: Spacing[1] },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: Spacing[3], paddingVertical: 6, borderRadius: Radius.full, alignSelf: 'flex-start' },
  statText: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

  content: { padding: Spacing[4], gap: Spacing[3], paddingBottom: 100 },

  inviteCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing[4], borderWidth: 1.5, borderColor: '#C6E8D4', borderStyle: 'dashed', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  inviteIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  inviteTitle: { fontSize: FontSizes.base, fontWeight: '700', color: Colors.navy },
  inviteSub: { fontSize: FontSizes.sm, color: Colors.gray400, marginTop: 2 },
  inviteArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EBF5EF', alignItems: 'center', justifyContent: 'center' },

  sectionTitle: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.gray400, textTransform: 'uppercase', letterSpacing: 1, marginLeft: Spacing[1] },

  memberCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing[4], shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1, borderWidth: 1, borderColor: Colors.gray100 },
  memberInfo: { flex: 1, gap: 5 },
  memberName: { fontSize: FontSizes.base, fontWeight: '600', color: Colors.navy },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing[2], paddingVertical: 3, borderRadius: Radius.full, alignSelf: 'flex-start' },
  roleText: { fontSize: 11, fontWeight: '700' },
  memberActions: { alignItems: 'center' },
  youBadge: { backgroundColor: '#EBF5EF', paddingHorizontal: Spacing[2], paddingVertical: 3, borderRadius: Radius.full },
  youText: { fontSize: FontSizes.xs, color: Colors.sageDark, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: Spacing[6] },
  qrModal: { backgroundColor: Colors.white, borderRadius: Radius.xl, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 12 },
  qrHeader: { paddingVertical: Spacing[5], paddingHorizontal: Spacing[5], alignItems: 'center' },
  qrTitle: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.white, textAlign: 'center' },
  qrSub: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 4 },
  qrBody: { padding: Spacing[5], alignItems: 'center', gap: Spacing[4] },
  qrWrap: { padding: Spacing[4], backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.gray200, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  codePill: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], backgroundColor: Colors.gray100, paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], borderRadius: Radius.lg, width: '100%', justifyContent: 'center' },
  codeLabel: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.gray400, letterSpacing: 1 },
  code: { fontSize: FontSizes['2xl'], fontWeight: '800', color: Colors.navy, letterSpacing: 4 },
  qrActions: { flexDirection: 'row', gap: Spacing[3], width: '100%' },
  qrShareBtn: { flex: 1, borderRadius: Radius.lg, overflow: 'hidden' },
  qrShareGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  qrShareText: { fontSize: FontSizes.base, fontWeight: '700', color: Colors.white },
  qrDoneBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, backgroundColor: Colors.gray100, borderRadius: Radius.lg },
  qrDoneText: { fontSize: FontSizes.base, fontWeight: '700', color: Colors.navy },
});
