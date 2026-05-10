import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { registerForPushNotifications, saveDeviceToken } from '../lib/notifications';

export function useAuthInit() {
  const { setSession, setProfile, setFamily, setMembership, setLoading } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) loadUserData(session.user.id);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        await loadUserData(session.user.id);
        const token = await registerForPushNotifications();
        if (token) await saveDeviceToken(session.user.id, token);
      } else {
        setProfile(null);
        setFamily(null);
        setMembership(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadUserData(userId: string) {
    setLoading(true);
    try {
      const [profileRes, memberRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase
          .from('family_members')
          .select('*, families(*)')
          .eq('user_id', userId)
          .single(),
      ]);

      if (profileRes.data) setProfile(profileRes.data);

      if (memberRes.data) {
        setMembership(memberRes.data);
        setFamily((memberRes.data as any).families);
      }
    } finally {
      setLoading(false);
    }
  }
}
