import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors, FontSizes, Radius } from '../../constants/theme';

interface AvatarProps {
  name: string;
  photoUrl?: string;
  size?: number;
}

export function Avatar({ name, photoUrl, size = 40 }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: Colors.gray200,
  },
  placeholder: {
    backgroundColor: Colors.sageLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: Colors.white,
    fontWeight: '700',
  },
});
