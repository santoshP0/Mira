import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { Profile, UserRole, Family, FamilyMember } from '../types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  family: Family | null;
  myMembership: FamilyMember | null;
  isLoading: boolean;

  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setFamily: (family: Family | null) => void;
  setMembership: (membership: FamilyMember | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  family: null,
  myMembership: null,
  isLoading: true,

  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setFamily: (family) => set({ family }),
  setMembership: (myMembership) => set({ myMembership }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () =>
    set({ session: null, user: null, profile: null, family: null, myMembership: null }),
}));
