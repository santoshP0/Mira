export type UserRole = 'elder' | 'caregiver' | 'family';

export type DoseStatus = 'pending' | 'taken' | 'skipped' | 'missed' | 'escalated';

export type Criticality = 'normal' | 'high';

export type Platform = 'ios' | 'android';

export interface Profile {
  id: string;
  name: string;
  photo_url?: string;
  phone?: string;
  preferred_language: string;
  created_at: string;
}

export interface Family {
  id: string;
  name: string;
  created_by: string;
  quiet_hours_start: string;
  quiet_hours_end: string;
  created_at: string;
}

export interface FamilyMember {
  family_id: string;
  user_id: string;
  role: UserRole;
  joined_at: string;
  profile?: Profile;
}

export interface Invite {
  token: string;
  family_id: string;
  created_by: string;
  expires_at: string;
  used_at?: string;
  used_by?: string;
}

export interface MedicineSchedule {
  times: string[];
  days: string[];
}

export interface Medicine {
  id: string;
  family_id: string;
  for_user_id: string;
  name: string;
  dose?: string;
  photo_url?: string;
  schedule: MedicineSchedule;
  start_date: string;
  end_date?: string;
  criticality: Criticality;
  created_by: string;
  created_at: string;
  profile?: Profile;
}

export interface DoseLog {
  id: string;
  medicine_id: string;
  family_id: string;
  for_user_id: string;
  scheduled_at: string;
  status: DoseStatus;
  responded_at?: string;
  responded_by?: string;
  handling_by?: string;
  notes?: string;
  medicine?: Medicine;
  handler?: Profile;
}

export interface Device {
  id: string;
  user_id: string;
  fcm_token: string;
  platform: Platform;
  updated_at: string;
}

export interface ActivityEvent {
  id: string;
  message: string;
  timestamp: string;
  type: 'taken' | 'skipped' | 'missed' | 'joined' | 'sos';
  dose_log?: DoseLog;
}

export type RootStackParamList = {
  Onboarding: undefined;
  PhoneAuth: undefined;
  RoleSelect: undefined;
  ProfileSetup: undefined;
  Main: undefined;
  CreateFamily: undefined;
  JoinFamily: { token?: string };
  ScanQR: undefined;
  AddMedicine: { familyId: string; elderId: string };
  EditMedicine: { medicine: Medicine };
  DoseDetail: { doseLog: DoseLog };
  FamilyMembers: undefined;
  SOS: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Medicines: undefined;
  Activity: undefined;
  Settings: undefined;
};
