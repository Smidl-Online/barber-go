import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import Logo from '../components/Logo';

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
        <Logo size="lg" light />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Decorative circles */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <View style={styles.hero}>
        <Logo size="lg" light />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/(auth)/register?role=customer')}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add-outline" size={22} color={Colors.white} />
          <Text style={styles.primaryBtnText}>Registrovat se</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.8}
        >
          <Ionicons name="log-in-outline" size={22} color={Colors.white} />
          <Text style={styles.secondaryBtnText}>Přihlásit se</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/register?role=provider')}
          style={styles.barberBtn}
        >
          <Text style={styles.barberLink}>Jste barber? <Text style={styles.barberLinkAccent}>Registrujte se zde</Text></Text>
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
  decorCircle1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(233, 69, 96, 0.08)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: 100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(233, 69, 96, 0.05)',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  primaryBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.xl,
    paddingVertical: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  secondaryBtn: {
    borderColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1.5,
    borderRadius: BorderRadius.xl,
    paddingVertical: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  secondaryBtnText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  barberBtn: {
    paddingVertical: Spacing.md,
  },
  barberLink: {
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    fontSize: FontSize.sm,
  },
  barberLinkAccent: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
