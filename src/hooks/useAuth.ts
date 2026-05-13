import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { registerForPushNotifications, saveDeviceToken, watchTokenRefresh } from '../lib/notifications';

export function useAuthInit() {
  const { setSession, setProfile, setFamily, setMembership, setLoading } = useAuthStore();
  const tokenWatcherRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      if (session?.user) {
        await loadUserData(session.user.id);

        // Register push token and watch for rotation
        const token = await registerForPushNotifications();
        if (token) {
          await saveDeviceToken(session.user.id, token);
          // Stop previous watcher if any
          tokenWatcherRef.current?.();
          tokenWatcherRef.current = watchTokenRefresh(session.user.id);
        }
      } else {
        tokenWatcherRef.current?.();
        tokenWatcherRef.current = null;
        setProfile(null);
        setFamily(null);
        setMembership(null);
        setLoading(false);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
      tokenWatcherRef.current?.();
    };
  }, []);

  async function loadUserData(userId: string) {
    setLoading(true);
    try {
      const [profileRes, memberRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('family_members').select('*, families(*)').eq('user_id', userId).single(),
      ]);

      if (profileRes.error && profileRes.error.code !== 'PGRST116') {
        console.warn('[useAuthInit] profile load error:', profileRes.error.message);
      }
      if (profileRes.data) setProfile(profileRes.data);

      if (memberRes.data) {
        setMembership(memberRes.data);
        setFamily((memberRes.data as any).families);
      }
    } catch (err) {
      console.warn('[useAuthInit] loadUserData error:', err);
    } finally {
      setLoading(false);
    }
  }
}
