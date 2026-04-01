import { Stack } from 'expo-router';
import { Colors } from '../../../constants/theme';

export default function ManagementLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'Zpět',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="services" options={{ title: 'Služby' }} />
      <Stack.Screen name="availability" options={{ title: 'Pracovní doba' }} />
      <Stack.Screen name="portfolio" options={{ title: 'Portfolio' }} />
    </Stack>
  );
}
