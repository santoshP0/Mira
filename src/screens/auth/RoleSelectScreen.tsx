import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Button } from '../../components/common/Button';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { RootStackParamList, UserRole } from '../../types';

const ROLES: { role: UserRole; icon: string; title: string; desc: string }[] = [
  {
    role: 'elder',
    icon: 'person',
    title: 'I take the medicines',
    desc: 'Large, simple reminders for your daily doses.',
  },
  {
    role: 'caregiver',
    icon: 'shield-checkmark',
    title: 'I manage the medicines',
    desc: 'Set up schedules, invite family, and monitor adherence.',
  },
  {
    role: 'family',
    icon: 'people',
    title: "I'm a family member",
    desc: 'Receive alerts and help out when someone misses a dose.',
  },
];

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'RoleSelect'> };

export function RoleSelectScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<UserRole | null>(null);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>What's your role?</Text>
      <Text style={styles.sub}>You can always change this later in Settings.</Text>

      <View style={styles.cards}>
        {ROLES.map(({ role, icon, title, desc }) => (
          <TouchableOpacity
            key={role}
            style={[styles.card, selected === role && styles.cardSelected]}
            onPress={() => {
              Haptics.selectionAsync();
              setSelected(role);
            }}
            activeOpacity={0.85}
          >
            <View style={[styles.iconWrap, selected === role && styles.iconWrapSelected]}>
              <Ionicons
                name={icon as any}
                size={28}
                color={selected === role ? Colors.white : Colors.sage}
              />
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, selected === role && styles.cardTitleSelected]}>
                {title}
              </Text>
              <Text style={styles.cardDesc}>{desc}</Text>
            </View>
            {selected === role && (
              <Ionicons name="checkmark-circle" size={24} color={Colors.sage} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Button
        label="Continue"
        onPress={() => navigation.navigate('ProfileSetup', { role: selected } as any)}
        disabled={!selected}
        size="lg"
        style={styles.btn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: Spacing[6], paddingTop: 72 },
  title: {
    fontSize: FontSizes['3xl'],
    fontWeight: '800',
    color: Colors.navy,
    marginBottom: Spacing[2],
  },
  sub: {
    fontSize: FontSizes.base,
    color: Colors.gray500,
    marginBottom: Spacing[8],
  },
  cards: { gap: Spacing[3], marginBottom: Spacing[8] },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    borderWidth: 2,
    borderColor: Colors.gray200,
    gap: Spacing[3],
  },
  cardSelected: {
    borderColor: Colors.sage,
    backgroundColor: '#F0F7F3',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSelected: {
    backgroundColor: Colors.sage,
  },
  cardText: { flex: 1 },
  cardTitle: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.navy,
    marginBottom: 2,
  },
  cardTitleSelected: { color: Colors.sageDark },
  cardDesc: { fontSize: FontSizes.sm, color: Colors.gray500, lineHeight: 18 },
  btn: { width: '100%' },
});
