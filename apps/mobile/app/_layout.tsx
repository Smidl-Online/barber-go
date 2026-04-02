import React, { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../stores/authStore';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { Colors } from '../constants/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function RootLayout() {
  const loadStoredAuth = useAuthStore((s) => s.loadStoredAuth);
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const wasLoggedIn = useRef(false);
  const router = useRouter();
  usePushNotifications();

  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Auto-logout: when user becomes null after being logged in (e.g. API 401 → refresh failed)
  useEffect(() => {
    if (user) {
      wasLoggedIn.current = true;
    } else if (!isLoading && wasLoggedIn.current) {
      wasLoggedIn.current = false;
      router.replace('/');
    }
  }, [user, isLoading]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.white,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(customer)" options={{ headerShown: false }} />
        <Stack.Screen name="(provider)" options={{ headerShown: false }} />
        <Stack.Screen name="provider/[id]" options={{ title: 'Detail barbera', headerBackTitle: 'Zpět' }} />
        <Stack.Screen name="booking/[providerId]" options={{ title: 'Rezervace', headerBackVisible: false }} />
        <Stack.Screen name="review/[bookingId]" options={{ title: 'Hodnocení', headerBackTitle: 'Zpět' }} />
        <Stack.Screen name="bookingDetail/[id]" options={{ title: 'Detail rezervace', headerBackTitle: 'Zpět' }} />
      </Stack>
    </QueryClientProvider>
  );
}
