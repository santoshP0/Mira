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
} from 'react-native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/common/Button';
import { TextInput } from '../../components/common/TextInput';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { RootStackParamList, UserRole } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileSetup'>;

export function ProfileSetupScreen({ navigation, route }: Props) {
  const role = (route.params as any)?.role as UserRole ?? 'family';
  const { user } = useAuthStore();
  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function save() {
    if (!name.trim() || !user) return;
    setLoading(true);

    let photoUrl: string | undefined;

    if (photoUri) {
      const ext = photoUri.split('.').pop();
      const path = `avatars/${user.id}.${ext}`;
      const formData = new FormData();
      formData.append('file', { uri: photoUri, name: `avatar.${ext}`, type: `image/${ext}` } as any);

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, formData, { upsert: true });

      if (!uploadErr) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        photoUrl = data.publicUrl;
      }
    }

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      name: name.trim(),
      photo_url: photoUrl,
      phone: user.phone,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    navigation.replace('CreateFamily');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Set up your profile</Text>
        <Text style={styles.sub}>Help your family recognize you.</Text>

        <TouchableOpacity style={styles.avatarWrap} onPress={pickPhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="camera" size={32} color={Colors.gray400} />
              <Text style={styles.avatarHint}>Add photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <TextInput
          label="Your name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Priya Sharma"
          autoFocus
        />

        <View style={styles.roleBadge}>
          <Ionicons
            name={role === 'elder' ? 'person' : role === 'caregiver' ? 'shield-checkmark' : 'people'}
            size={16}
            color={Colors.sage}
          />
          <Text style={styles.roleText}>
            Joining as {role === 'elder' ? 'the elder' : role === 'caregiver' ? 'a caregiver' : 'a family member'}
          </Text>
        </View>

        <Button
          label="Continue"
          onPress={save}
          loading={loading}
          disabled={!name.trim()}
          size="lg"
          style={styles.btn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: Spacing[6], paddingTop: 72, flexGrow: 1 },
  title: { fontSize: FontSizes['3xl'], fontWeight: '800', color: Colors.navy, marginBottom: Spacing[2] },
  sub: { fontSize: FontSizes.base, color: Colors.gray500, marginBottom: Spacing[8] },
  avatarWrap: { alignSelf: 'center', marginBottom: Spacing[8] },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.gray100,
    borderWidth: 2,
    borderColor: Colors.gray200,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  avatarHint: { fontSize: FontSizes.xs, color: Colors.gray400 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: '#F0F7F3',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    alignSelf: 'flex-start',
    marginBottom: Spacing[8],
  },
  roleText: { fontSize: FontSizes.sm, color: Colors.sageDark, fontWeight: '500' },
  btn: { width: '100%' },
});
