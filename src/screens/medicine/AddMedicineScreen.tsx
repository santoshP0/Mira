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
import { useAddMedicine } from '../../hooks/useMedicines';
import { Button } from '../../components/common/Button';
import { TextInput } from '../../components/common/TextInput';
import { Card } from '../../components/common/Card';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { DAYS_OF_WEEK, DAYS_LABELS } from '../../constants/config';
import { supabase } from '../../lib/supabase';
import { RootStackParamList } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddMedicine'>;

export function AddMedicineScreen({ navigation, route }: Props) {
  const { familyId, elderId } = route.params;
  const { user } = useAuthStore();
  const addMedicine = useAddMedicine();

  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [days, setDays] = useState<string[]>(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [isHigh, setIsHigh] = useState(false);
  const [loading, setLoading] = useState(false);

  function toggleDay(day: string) {
    Haptics.selectionAsync();
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function handleSave() {
    if (!name.trim() || !user || days.length === 0 || times.length === 0) return;
    setLoading(true);

    let photoUrl: string | undefined;
    if (photoUri) {
      const ext = photoUri.split('.').pop();
      const path = `medicines/${familyId}/${Date.now()}.${ext}`;
      const formData = new FormData();
      formData.append('file', { uri: photoUri, name: `med.${ext}`, type: `image/${ext}` } as any);
      const { error } = await supabase.storage.from('medicine-photos').upload(path, formData, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from('medicine-photos').getPublicUrl(path);
        photoUrl = data.publicUrl;
      }
    }

    try {
      await addMedicine.mutateAsync({
        family_id: familyId,
        for_user_id: elderId,
        name: name.trim(),
        dose: dose.trim() || undefined,
        photo_url: photoUrl,
        schedule: { times: times.sort(), days },
        start_date: startDate,
        end_date: endDate || undefined,
        criticality: isHigh ? 'high' : 'normal',
        created_by: user.id,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.photoWrap} onPress={pickPhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="image" size={36} color={Colors.gray400} />
              <Text style={styles.photoHint}>Add pill photo</Text>
            </View>
          )}
        </TouchableOpacity>

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
              <TouchableOpacity onPress={() => setTimes((prev) => prev.filter((_, j) => j !== i))} style={styles.removeBtn}>
                <Ionicons name="remove-circle" size={24} color={Colors.coral} />
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity style={styles.addTimeBtn} onPress={() => setTimes((prev) => [...prev, '12:00'])}>
          <Ionicons name="add-circle-outline" size={20} color={Colors.sage} />
          <Text style={styles.addTimeBtnText}>Add another time</Text>
        </TouchableOpacity>

        <TextInput
          label="Start date *"
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
        />
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
          label="Save Medicine"
          onPress={handleSave}
          loading={loading}
          disabled={!name.trim() || days.length === 0 || times.length === 0}
          size="lg"
          style={{ marginTop: Spacing[4] }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: Spacing[4], paddingBottom: Spacing[12] },
  photoWrap: { alignSelf: 'center', marginBottom: Spacing[6] },
  photo: { width: 100, height: 100, borderRadius: Radius.md },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: Radius.md,
    backgroundColor: Colors.gray100,
    borderWidth: 2,
    borderColor: Colors.gray200,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoHint: { fontSize: FontSizes.xs, color: Colors.gray400 },
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
