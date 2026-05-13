import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  // On physical device only — emulators can't receive push notifications
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('mira-reminders', {
      name: 'Medicine Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7BA88F',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
    await Notifications.setNotificationChannelAsync('mira-alerts', {
      name: 'Family Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#F87171',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
  }

  // Use Expo push token — compatible with the escalation worker's Expo Push API.
  // Requires a valid Expo project (projectId in app.json under expo.extra.eas.projectId).
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    // Fallback to device push token (works in bare workflow / without EAS)
    try {
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      return deviceToken.data;
    } catch {
      return null;
    }
  }
}

export async function saveDeviceToken(userId: string, token: string) {
  const platform = Platform.OS as 'ios' | 'android';
  const { error } = await supabase
    .from('devices')
    .upsert(
      { user_id: userId, fcm_token: token, platform, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (error) console.warn('[notifications] saveDeviceToken failed:', error.message);
}

// Listen for FCM token rotation (Android) and re-register.
// Returns a cleanup function.
export function watchTokenRefresh(userId: string): () => void {
  const subscription = Notifications.addPushTokenListener(async ({ data: token }) => {
    if (token) await saveDeviceToken(userId, token);
  });
  return () => subscription.remove();
}

export function setupNotificationListeners(
  onResponse: (response: Notifications.NotificationResponse) => void
): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener(onResponse);
  return () => sub.remove();
}

// Returns whether the user has granted notification permission.
export async function hasNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}
