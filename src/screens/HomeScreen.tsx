import React from 'react';
import { useAuthStore } from '../store/authStore';
import { ElderHomeScreen } from './elder/ElderHomeScreen';
import { CaregiverHomeScreen } from './caregiver/CaregiverHomeScreen';

export function HomeScreen() {
  const { myMembership } = useAuthStore();
  return myMembership?.role === 'elder' ? <ElderHomeScreen /> : <CaregiverHomeScreen />;
}
