import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true, shouldShowInForeground: true,
  }),
});

export function usePushNotifications() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const notifRef = useRef<Notifications.EventSubscription>();
  const responseRef = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    if (!user) return;
    registerForPushNotifications();
    notifRef.current = Notifications.addNotificationReceivedListener(() => {});
    responseRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data.type === 'new_booking' || data.type === 'booking_status') {
        router.push(user.role === 'provider' ? '/(provider)/incoming' as any : '/(customer)/bookings' as any);
      } else if (data.type === 'new_review') {
        router.push('/(provider)/dashboard' as any);
      }
    });
    return () => {
      if (notifRef.current) Notifications.removeNotificationSubscription(notifRef.current);
      if (responseRef.current) Notifications.removeNotificationSubscription(responseRef.current);
    };
  }, [user]);

  async function registerForPushNotifications() {
    if (!Device.isDevice) return;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
      await api.post('/notifications/register', { token: pushToken.data, platform: Platform.OS });
    } catch (error) {
      console.error('Failed to register push token:', error);
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Výchozí',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
  }
}
