import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../constants/theme';
import { RootStackParamList, MainTabParamList } from '../types';

import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { PhoneAuthScreen } from '../screens/auth/PhoneAuthScreen';
import { RoleSelectScreen } from '../screens/auth/RoleSelectScreen';
import { ProfileSetupScreen } from '../screens/auth/ProfileSetupScreen';

import { FamilySetupScreen } from '../screens/family/FamilySetupScreen';
import { ScanQRScreen } from '../screens/family/ScanQRScreen';
import { JoinFamilyScreen } from '../screens/family/JoinFamilyScreen';
import { FamilyMembersScreen } from '../screens/family/FamilyMembersScreen';

import { AddMedicineScreen } from '../screens/medicine/AddMedicineScreen';
import { EditMedicineScreen } from '../screens/medicine/EditMedicineScreen';

import { DoseDetailScreen } from '../screens/doses/DoseDetailScreen';

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
        <Tab.Screen name="Medicines" component={MedicinesScreen} options={{ title: 'Medicines' }} />
      )}
      <Tab.Screen name="Activity" component={ActivityFeedScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { session, profile, family, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.sage} />
      </View>
    );
  }

  const linking = {
    prefixes: ['mira://'],
    config: {
      screens: {
        JoinFamily: 'join',
      },
    },
  };

  return (
    <NavigationContainer linking={linking}>
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
              options={{ headerShown: true, title: 'Dose Details', headerTintColor: Colors.sage }}
            />
            <Stack.Screen
              name="FamilyMembers"
              component={FamilyMembersScreen}
              options={{ headerShown: true, title: 'Family Circle', headerTintColor: Colors.sage }}
            />
            <Stack.Screen name="ScanQR" component={ScanQRScreen} />
            <Stack.Screen name="JoinFamily" component={JoinFamilyScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
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
