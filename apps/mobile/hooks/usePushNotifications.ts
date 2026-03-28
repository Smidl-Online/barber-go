import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const { user, accessToken } = useAuthStore();
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !accessToken) return;

    registerForPushNotifications().then((token) => {
      if (token) {
        tokenRef.current = token;
        api.post('/notifications/register', { token, platform: Platform.OS }).catch(() => {});
      }
    });

    return () => {
      if (tokenRef.current) {
        api.post('/notifications/unregister', { token: tokenRef.current }).catch(() => {});
      }
    };
  }, [user?.id]);
}

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'BarberGo',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });
  return tokenData.data;
}
