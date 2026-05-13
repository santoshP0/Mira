import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { RootStackParamList } from '../../types';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'ScanQR'> };

export function ScanQRScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera" size={64} color={Colors.gray300} />
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionText}>
          Mira needs camera access to scan QR codes and let you join your family circle.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function handleBarCodeScanned({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);

    let token = data;
    if (data.startsWith('mira://join?token=')) {
      token = data.replace('mira://join?token=', '');
    }

    navigation.replace('JoinFamily', { token });
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>

        <View style={styles.frame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        <View style={styles.bottom}>
          <Text style={styles.hint}>Point your camera at the QR code your caregiver shared</Text>
          {scanned && (
            <TouchableOpacity onPress={() => setScanned(false)}>
              <Text style={styles.rescan}>Tap to scan again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const FRAME = 260;
const CORNER = 24;
const THICKNESS = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[6],
    backgroundColor: Colors.cream,
    gap: Spacing[4],
  },
  permissionTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.navy },
  permissionText: { fontSize: FontSizes.base, color: Colors.gray500, textAlign: 'center', lineHeight: 22 },
  permissionBtn: {
    backgroundColor: Colors.sage,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[8],
    borderRadius: Radius.md,
    marginTop: Spacing[2],
  },
  permissionBtnText: { color: Colors.white, fontWeight: '600', fontSize: FontSizes.base },
  overlay: { flex: 1, justifyContent: 'space-between' },
  backBtn: {
    marginTop: 56,
    marginLeft: Spacing[4],
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: FRAME,
    height: FRAME,
    alignSelf: 'center',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: Colors.white,
  },
  topLeft: { top: 0, left: 0, borderTopWidth: THICKNESS, borderLeftWidth: THICKNESS },
  topRight: { top: 0, right: 0, borderTopWidth: THICKNESS, borderRightWidth: THICKNESS },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: THICKNESS, borderLeftWidth: THICKNESS },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: THICKNESS, borderRightWidth: THICKNESS },
  bottom: {
    padding: Spacing[8],
    alignItems: 'center',
    gap: Spacing[3],
  },
  hint: { color: 'rgba(255,255,255,0.85)', fontSize: FontSizes.base, textAlign: 'center', lineHeight: 22 },
  rescan: { color: Colors.sageLight, fontSize: FontSizes.base, fontWeight: '600' },
});
