import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/common/Button';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { RootStackParamList } from '../../types';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    icon: 'heart' as const,
    title: 'Mira keeps watch\nover the people\nyou love.',
    subtitle:
      "A gentle safety net so your family's elderly members never miss a medicine.",
    bg: Colors.sage,
  },
  {
    id: '2',
    icon: 'notifications' as const,
    title: 'Smart reminders\nthat escalate\nwhen needed.',
    subtitle:
      "If Dad doesn't respond, Mira quietly notifies the whole family — so someone can check in.",
    bg: '#5A8A6F',
  },
  {
    id: '3',
    icon: 'people' as const,
    title: 'Your family,\nalways in sync.',
    subtitle:
      'Everyone sees the same view in real time. "Priya is calling Dad" — so you don\'t all call at once.',
    bg: '#3D7359',
  },
];

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'> };

export function OnboardingScreen({ navigation }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const next = () => {
    if (activeIndex < slides.length - 1) {
      flatRef.current?.scrollToIndex({ index: activeIndex + 1 });
      setActiveIndex(activeIndex + 1);
    } else {
      navigation.replace('PhoneAuth');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <FlatList
        ref={flatRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.slide, { backgroundColor: item.bg, width }]}>
            <View style={styles.iconWrap}>
              <Ionicons name={item.icon} size={80} color="rgba(255,255,255,0.9)" />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      <View style={[styles.footer, { backgroundColor: slides[activeIndex].bg }]}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>

        <Button
          label={activeIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          onPress={next}
          style={styles.btn}
          variant="ghost"
          size="lg"
          textStyle={{ color: Colors.white, fontWeight: '700' }}
        />

        {activeIndex < slides.length - 1 && (
          <TouchableOpacity onPress={() => navigation.replace('PhoneAuth')}>
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[8],
    paddingTop: 80,
    paddingBottom: 160,
  },
  iconWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[10],
  },
  title: {
    fontSize: FontSizes['3xl'],
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: Spacing[5],
  },
  subtitle: {
    fontSize: FontSizes.lg,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 26,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 48,
    paddingTop: Spacing[4],
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    marginBottom: Spacing[5],
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.white,
  },
  btn: {
    width: width - 64,
    borderWidth: 2,
    borderColor: Colors.white,
    borderRadius: Radius.xl,
  },
  skip: {
    marginTop: Spacing[3],
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSizes.base,
  },
});
