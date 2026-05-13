import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { RootStackParamList } from '../../types';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    icon: 'heart' as const,
    title: 'Mira keeps watch\nover the people\nyou love.',
    subtitle: "A gentle safety net so your family's elderly members never miss a medicine.",
    colors: [Colors.sage, '#5A8A6F'] as [string, string],
  },
  {
    id: '2',
    icon: 'notifications' as const,
    title: 'Smart reminders\nthat escalate\nwhen needed.',
    subtitle: "If Dad doesn't respond, Mira quietly notifies the whole family — so someone can check in.",
    colors: ['#5A8A6F', '#3D7359'] as [string, string],
  },
  {
    id: '3',
    icon: 'people' as const,
    title: 'Your family,\nalways in sync.',
    subtitle: 'Everyone sees the same view in real time. “Priya is calling Dad” — so you don\'t all call at once.',
    colors: ['#3D7359', '#2A5C48'] as [string, string],
  },
];

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'> };

function SlideIcon({ icon, active }: { icon: any; active: boolean }) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active) {
      scale.setValue(0.6);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          tension: 60,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [active]);

  return (
    <Animated.View style={[styles.iconWrap, { transform: [{ scale }], opacity }]}>
      <Ionicons name={icon} size={72} color="rgba(255,255,255,0.95)" />
    </Animated.View>
  );
}

export function OnboardingScreen({ navigation }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const footerOpacity = useRef(new Animated.Value(1)).current;

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
        renderItem={({ item, index }) => (
          <LinearGradient colors={item.colors} style={[styles.slide, { width }]} start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }}>
            <SlideIcon icon={item.icon} active={activeIndex === index} />

            <Animated.Text style={styles.title}>{item.title}</Animated.Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </LinearGradient>
        )}
      />

      <LinearGradient
        colors={[`${slides[activeIndex].colors[1]}00`, slides[activeIndex].colors[1]]}
        style={styles.footerGrad}
      >
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={next} activeOpacity={0.85}>
          <Text style={styles.nextText}>
            {activeIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons
            name={activeIndex === slides.length - 1 ? 'checkmark-circle' : 'arrow-forward-circle'}
            size={22}
            color={slides[activeIndex].colors[1]}
          />
        </TouchableOpacity>

        {activeIndex < slides.length - 1 && (
          <TouchableOpacity onPress={() => navigation.replace('PhoneAuth')} style={styles.skipWrap}>
            <Text style={styles.skip}>Skip intro</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
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
    paddingTop: 100,
    paddingBottom: 200,
    gap: Spacing[6],
  },
  iconWrap: {
    width: 152,
    height: 152,
    borderRadius: 76,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    marginBottom: Spacing[4],
  },
  title: {
    fontSize: FontSizes['3xl'],
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSizes.base,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    lineHeight: 26,
  },
  footerGrad: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 52,
    paddingTop: 48,
    alignItems: 'center',
    gap: Spacing[3],
  },
  dots: { flexDirection: 'row', gap: 8, marginBottom: Spacing[3] },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: { width: 28, backgroundColor: Colors.white, borderRadius: 4 },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.white,
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[10],
    borderRadius: Radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  nextText: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.navy,
  },
  skipWrap: { marginTop: Spacing[1] },
  skip: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
});
