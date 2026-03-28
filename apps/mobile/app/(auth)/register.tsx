import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { register as registerApi } from '../../services/auth';
import { useAuthStore } from '../../stores/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { role: initialRole } = useLocalSearchParams<{ role?: string }>();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'customer' | 'provider'>(
    (initialRole as 'customer' | 'provider') || 'customer'
  );
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Chyba', 'Vyplňte všechna povinná pole');
      return;
    }

    setLoading(true);
    try {
      const data = await registerApi({
        email,
        password,
        full_name: fullName,
        role,
      });
      setAuth(data.user, data.accessToken, data.refreshToken);

      if (data.user.role === 'provider') {
        router.replace('/(provider)/dashboard');
      } else {
        router.replace('/(customer)/home');
      }
    } catch (err: any) {
      Alert.alert('Chyba', err.response?.data?.message || 'Nepodařilo se registrovat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registrace</Text>

      <View style={styles.roleToggle}>
        <TouchableOpacity
          style={[styles.roleBtn, role === 'customer' && styles.roleBtnActive]}
          onPress={() => setRole('customer')}
        >
          <Text style={[styles.roleBtnText, role === 'customer' && styles.roleBtnTextActive]}>
            Zákazník
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleBtn, role === 'provider' && styles.roleBtnActive]}
          onPress={() => setRole('provider')}
        >
          <Text style={[styles.roleBtnText, role === 'provider' && styles.roleBtnTextActive]}>
            Barber
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Jméno a příjmení"
        value={fullName}
        onChangeText={setFullName}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Heslo (min. 6 znaků)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.buttonText}>Zaregistrovat se</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
        <Text style={styles.link}>Již máte účet? Přihlásit se</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  roleToggle: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  roleBtnActive: {
    backgroundColor: Colors.accent,
  },
  roleBtnText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.accent,
  },
  roleBtnTextActive: {
    color: Colors.white,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  link: {
    color: Colors.accent,
    textAlign: 'center',
    marginTop: Spacing.lg,
    fontSize: FontSize.md,
  },
});
