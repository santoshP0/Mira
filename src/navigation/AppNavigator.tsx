import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../constants/theme';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { OfflineBanner } from '../components/common/OfflineBanner';
import { useAppStateFocus } from '../lib/offline';
import { RootStackParamList, MainTabParamList } from '../types';

// Auth screens
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { PhoneAuthScreen } from '../screens/auth/PhoneAuthScreen';
import { RoleSelectScreen } from '../screens/auth/RoleSelectScreen';
import { ProfileSetupScreen } from '../screens/auth/ProfileSetupScreen';

// Family screens
import { FamilySetupScreen } from '../screens/family/FamilySetupScreen';
import { ScanQRScreen } from '../screens/family/ScanQRScreen';
import { JoinFamilyScreen } from '../screens/family/JoinFamilyScreen';
import { FamilyMembersScreen } from '../screens/family/FamilyMembersScreen';

// Medicine screens
import { AddMedicineScreen } from '../screens/medicine/AddMedicineScreen';
import { EditMedicineScreen } from '../screens/medicine/EditMedicineScreen';

// Dose screens
import { DoseDetailScreen } from '../screens/doses/DoseDetailScreen';

// Main tabs
import { HomeScreen } from '../screens/HomeScreen';
import { MedicinesScreen } from '../screens/MedicinesScreen';
import { ActivityFeedScreen } from '../screens/activity/ActivityFeedScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const { myMembership } = useAuthStore();
  const role = myMembership?.role;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.sage,
        tabBarInactiveTintColor: Colors.gray400,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.gray200,
          paddingBottom: 8,
          height: 60,
        },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            Home: 'home',
            Medicines: 'medical',
            Activity: 'time',
            Settings: 'settings',
          };
          return <Ionicons name={icons[route.name] as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      {role !== 'elder' && (
        <Tab.Screen name="Medicines" component={MedicinesScreen} />
      )}
      <Tab.Screen name="Activity" component={ActivityFeedScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { session, family, isLoading } = useAuthStore();

  // Wire AppState → React Query focusManager (refetch on foreground).
  useAppStateFocus();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.sage} />
      </View>
    );
  }

  const linking = {
    prefixes: ['mira://'],
    config: { screens: { JoinFamily: 'join' } },
  };

  return (
    <NavigationContainer linking={linking}>
      <OfflineBanner />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="PhoneAuth" component={PhoneAuthScreen} />
            <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
          </>
        ) : !family ? (
          <>
            <Stack.Screen name="CreateFamily" component={FamilySetupScreen} />
            <Stack.Screen name="ScanQR" component={ScanQRScreen} />
            <Stack.Screen name="JoinFamily" component={JoinFamilyScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="AddMedicine"
              component={AddMedicineScreen}
              options={{ headerShown: true, title: 'Add Medicine', headerTintColor: Colors.sage }}
            />
            <Stack.Screen
              name="EditMedicine"
              component={EditMedicineScreen}
              options={{ headerShown: true, title: 'Edit Medicine', headerTintColor: Colors.sage }}
            />
            <Stack.Screen
              name="DoseDetail"
              component={DoseDetailScreen}
              options={{ headerShown: false }}
            />
            {/* headerShown: false — FamilyMembersScreen renders its own gradient header */}
            <Stack.Screen
              name="FamilyMembers"
              component={FamilyMembersScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="ScanQR" component={ScanQRScreen} />
            <Stack.Screen name="JoinFamily" component={JoinFamilyScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export function AppNavigator() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cream,
  },
});
