import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/common/Button';
import { TextInput } from '../../components/common/TextInput';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { RootStackParamList } from '../../types';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'PhoneAuth'> };

export function PhoneAuthScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);

  async function sendOTP() {
    if (!phone.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: phone.trim() });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setStep('otp');
    }
  }

  async function verifyOTP() {
    if (!otp.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phone.trim(),
      token: otp.trim(),
      type: 'sms',
    });
    setLoading(false);

    if (error) {
      Alert.alert('Invalid code', error.message);
      return;
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      if (!profile) {
        navigation.replace('RoleSelect');
      }
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>Mira</Text>
          <Text style={styles.tagline}>Keeping watch over the people you love.</Text>
        </View>

        {step === 'phone' ? (
          <View style={styles.form}>
            <Text style={styles.title}>Enter your phone number</Text>
            <Text style={styles.hint}>We'll send you a one-time code to verify.</Text>
            <TextInput
              label="Phone number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 555 000 0000"
              keyboardType="phone-pad"
              autoFocus
            />
            <Button label="Send Code" onPress={sendOTP} loading={loading} size="lg" />
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.title}>Enter the code</Text>
            <Text style={styles.hint}>We sent a 6-digit code to {phone}.</Text>
            <TextInput
              label="Verification code"
              value={otp}
              onChangeText={setOtp}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            <Button label="Verify" onPress={verifyOTP} loading={loading} size="lg" />
            <Button
              label="Change number"
              onPress={() => setStep('phone')}
              variant="ghost"
              size="md"
              style={{ marginTop: Spacing[2] }}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  content: { flexGrow: 1, padding: Spacing[6] },
  header: { alignItems: 'center', paddingVertical: Spacing[12] },
  logo: {
    fontSize: FontSizes['4xl'],
    fontWeight: '800',
    color: Colors.sage,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: FontSizes.base,
    color: Colors.gray500,
    marginTop: Spacing[2],
    textAlign: 'center',
  },
  form: { flex: 1 },
  title: {
    fontSize: FontSizes['2xl'],
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: Spacing[2],
  },
  hint: {
    fontSize: FontSizes.base,
    color: Colors.gray500,
    marginBottom: Spacing[6],
    lineHeight: 22,
  },
});
