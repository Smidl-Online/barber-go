import { useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowInForeground: true,
  }),
});

export function usePushNotifications() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    if (!user) return;

    registerForPushNotifications();

    // Handle notification when app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      // Notification received while app is open — handled by the notification handler above
    });

    // Handle notification tap
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;

      if (data.type === 'new_booking' || data.type === 'booking_status') {
        if (user.role === 'provider') {
          router.push('/(provider)/incoming' as any);
        } else {
          router.push('/(customer)/bookings' as any);
        }
      } else if (data.type === 'new_review') {
        router.push('/(provider)/dashboard' as any);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user]);

  async function registerForPushNotifications() {
    if (!Device.isDevice) {
      return; // Push notifications don't work on emulator
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return;
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const pushToken = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      // Register token with backend
      await api.post('/notifications/register', {
        token: pushToken.data,
        platform: Platform.OS,
      });
    } catch (error) {
      console.error('Failed to register push token:', error);
    }

    // Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Výchozí',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
  }
}
