import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../store/authStore';
import { useUpdateMedicine, useDeleteMedicine } from '../../hooks/useMedicines';
import { Button } from '../../components/common/Button';
import { TextInput } from '../../components/common/TextInput';
import { Card } from '../../components/common/Card';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { DAYS_OF_WEEK, DAYS_LABELS } from '../../constants/config';
import { RootStackParamList } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditMedicine'>;

export function EditMedicineScreen({ navigation, route }: Props) {
  const { medicine } = route.params;
  const { user } = useAuthStore();
  const updateMedicine = useUpdateMedicine();
  const deleteMedicine = useDeleteMedicine();

  const [name, setName] = useState(medicine.name);
  const [dose, setDose] = useState(medicine.dose ?? '');
  const [times, setTimes] = useState<string[]>(medicine.schedule.times);
  const [days, setDays] = useState<string[]>(medicine.schedule.days);
  const [endDate, setEndDate] = useState(medicine.end_date ?? '');
  const [isHigh, setIsHigh] = useState(medicine.criticality === 'high');
  const [loading, setLoading] = useState(false);

  function toggleDay(day: string) {
    Haptics.selectionAsync();
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSave() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await updateMedicine.mutateAsync({
        id: medicine.id,
        name: name.trim(),
        dose: dose.trim() || undefined,
        schedule: { times: times.sort(), days },
        end_date: endDate || undefined,
        criticality: isHigh ? 'high' : 'normal',
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      'Delete medicine',
      `Remove ${medicine.name} and all its logs?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMedicine.mutateAsync({ id: medicine.id, familyId: medicine.family_id });
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput label="Medicine name *" value={name} onChangeText={setName} placeholder="e.g. Amlodipine" />
        <TextInput label="Dose" value={dose} onChangeText={setDose} placeholder="e.g. 5mg" />

        <Text style={styles.sectionLabel}>Days</Text>
        <View style={styles.daysRow}>
          {DAYS_OF_WEEK.map((day) => (
            <TouchableOpacity
              key={day}
              style={[styles.dayBtn, days.includes(day) && styles.dayBtnActive]}
              onPress={() => toggleDay(day)}
            >
              <Text style={[styles.dayText, days.includes(day) && styles.dayTextActive]}>
                {DAYS_LABELS[day]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Times</Text>
        {times.map((t, i) => (
          <View key={i} style={styles.timeRow}>
            <TextInput
              value={t}
              onChangeText={(v) => setTimes((prev) => prev.map((x, j) => (j === i ? v : x)))}
              placeholder="HH:MM"
              keyboardType="numbers-and-punctuation"
              containerStyle={styles.timeInput}
            />
            {times.length > 1 && (
              <TouchableOpacity
                onPress={() => setTimes((prev) => prev.filter((_, j) => j !== i))}
                style={styles.removeBtn}
              >
                <Ionicons name="remove-circle" size={24} color={Colors.coral} />
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity
          style={styles.addTimeBtn}
          onPress={() => setTimes((prev) => [...prev, '12:00'])}
        >
          <Ionicons name="add-circle-outline" size={20} color={Colors.sage} />
          <Text style={styles.addTimeBtnText}>Add another time</Text>
        </TouchableOpacity>

        <TextInput
          label="End date (optional)"
          value={endDate}
          onChangeText={setEndDate}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
        />

        <Card style={styles.critCard}>
          <View style={styles.critRow}>
            <View>
              <Text style={styles.critTitle}>High criticality</Text>
              <Text style={styles.critDesc}>Bypasses quiet hours, escalates faster</Text>
            </View>
            <Switch
              value={isHigh}
              onValueChange={setIsHigh}
              trackColor={{ false: Colors.gray200, true: Colors.coral }}
              thumbColor={Colors.white}
            />
          </View>
        </Card>

        <Button
          label="Save Changes"
          onPress={handleSave}
          loading={loading}
          size="lg"
          style={{ marginTop: Spacing[4] }}
        />
        <Button
          label="Delete Medicine"
          onPress={handleDelete}
          variant="danger"
          size="lg"
          style={{ marginTop: Spacing[3] }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: Spacing[4], paddingBottom: Spacing[12] },
  sectionLabel: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.navyLight, marginBottom: Spacing[2] },
  daysRow: { flexDirection: 'row', gap: 6, marginBottom: Spacing[5], flexWrap: 'wrap' },
  dayBtn: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.gray100,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    minWidth: 40,
    alignItems: 'center',
  },
  dayBtnActive: { backgroundColor: Colors.sage, borderColor: Colors.sage },
  dayText: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.gray500 },
  dayTextActive: { color: Colors.white },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  timeInput: { flex: 1, marginBottom: 0 },
  removeBtn: { paddingBottom: Spacing[4] },
  addTimeBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginBottom: Spacing[5], marginTop: Spacing[1] },
  addTimeBtnText: { fontSize: FontSizes.sm, color: Colors.sage, fontWeight: '500' },
  critCard: { marginBottom: Spacing[2] },
  critRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  critTitle: { fontSize: FontSizes.base, fontWeight: '600', color: Colors.navy },
  critDesc: { fontSize: FontSizes.xs, color: Colors.gray500, marginTop: 2 },
});
