import { Stack } from 'expo-router';
import { Colors } from '../../constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.white,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Přihlášení' }} />
      <Stack.Screen name="register" options={{ title: 'Registrace' }} />
    </Stack>
  );
}
