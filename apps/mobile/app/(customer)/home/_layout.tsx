import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '../../../constants/theme';

export default function HomeStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'Zpět',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Objevovat', headerTitleStyle: { fontWeight: '800', fontSize: 20 } }} />
      <Stack.Screen name="provider/[id]" options={{ title: 'Detail barbera' }} />
      <Stack.Screen name="booking/[providerId]" options={{ title: 'Rezervace', headerBackVisible: false }} />
    </Stack>
  );
}
