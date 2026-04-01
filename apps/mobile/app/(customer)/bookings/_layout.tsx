import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '../../../constants/theme';

export default function BookingsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'Zpět',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Rezervace', headerTitleStyle: { fontWeight: '800', fontSize: 20 } }} />
      <Stack.Screen name="[id]" options={{ title: 'Detail rezervace' }} />
      <Stack.Screen name="review/[bookingId]" options={{ title: 'Hodnocení' }} />
    </Stack>
  );
}
