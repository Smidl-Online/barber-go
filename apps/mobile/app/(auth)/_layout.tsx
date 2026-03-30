import { Stack } from 'expo-router';
import { Colors, FontSize } from '../../constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '700', fontSize: FontSize.lg },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Přihlášení' }} />
      <Stack.Screen name="register" options={{ title: 'Registrace' }} />
    </Stack>
  );
}
