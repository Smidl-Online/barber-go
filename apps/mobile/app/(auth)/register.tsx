import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { register as registerApi } from '../../services/auth';
import { useAuthStore } from '../../stores/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import Logo from '../../components/Logo';

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
  const [showPassword, setShowPassword] = useState(false);

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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoWrap}>
          <Logo size="md" light={false} />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Registrace</Text>
          <Text style={styles.subtitle}>Vytvořte si účet zdarma</Text>

          {/* Role toggle */}
          <View style={styles.roleToggle}>
            <TouchableOpacity
              style={[styles.roleBtn, role === 'customer' && styles.roleBtnActive]}
              onPress={() => setRole('customer')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="person-outline"
                size={18}
                color={role === 'customer' ? Colors.white : Colors.textLight}
              />
              <Text style={[styles.roleBtnText, role === 'customer' && styles.roleBtnTextActive]}>
                Zákazník
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleBtn, role === 'provider' && styles.roleBtnActive]}
              onPress={() => setRole('provider')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="cut-outline"
                size={18}
                color={role === 'provider' ? Colors.white : Colors.textLight}
              />
              <Text style={[styles.roleBtnText, role === 'provider' && styles.roleBtnTextActive]}>
                Barber
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Jméno a příjmení"
                placeholderTextColor={Colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
                autoComplete="name"
              />
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Heslo (min. 6 znaků)"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>Zaregistrovat se</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.linkWrap}>
          <Text style={styles.linkText}>Již máte účet? </Text>
          <Text style={styles.linkAccent}>Přihlásit se</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  roleToggle: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
  },
  roleBtnActive: {
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  roleBtnText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textLight,
  },
  roleBtnTextActive: {
    color: Colors.white,
  },
  inputGroup: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  eyeBtn: {
    padding: 4,
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  linkWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  linkText: {
    fontSize: FontSize.md,
    color: Colors.textLight,
  },
  linkAccent: {
    fontSize: FontSize.md,
    color: Colors.accent,
    fontWeight: '600',
  },
});
