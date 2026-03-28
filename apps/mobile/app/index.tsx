import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  React.useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'provider') {
        router.replace('/(provider)/dashboard');
      } else {
        router.replace('/(customer)/home');
      }
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.logo}>BarberGo</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>💈 BarberGo</Text>
        <Text style={styles.subtitle}>Najdi svého barbera. Kdekoli. Kdykoli.</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/(auth)/register?role=customer')}
        >
          <Text style={styles.primaryBtnText}>Najít barbera</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push('/(auth)/register?role=provider')}
        >
          <Text style={styles.secondaryBtnText}>Jsem barber</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.loginLink}>Již mám účet — Přihlásit se</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: Spacing.xl,
    justifyContent: 'space-between',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 42,
    fontWeight: '900',
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.lg,
    color: Colors.accentLight,
    textAlign: 'center',
  },
  actions: {
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  primaryBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  secondaryBtn: {
    borderColor: Colors.white,
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  loginLink: {
    color: Colors.accentLight,
    textAlign: 'center',
    fontSize: FontSize.md,
    marginTop: Spacing.sm,
  },
});
