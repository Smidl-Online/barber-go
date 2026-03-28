import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <Ionicons name="person" size={40} color={Colors.white} />
          )}
        </View>
        <Text style={styles.name}>{user?.full_name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={20} color={Colors.textLight} />
          <Text style={styles.infoText}>{user?.email}</Text>
        </View>
        {user?.phone && (
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color={Colors.textLight} />
            <Text style={styles.infoText}>{user.phone}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Ionicons name="shield-checkmark-outline" size={20} color={Colors.textLight} />
          <Text style={styles.infoText}>
            {user?.role === 'provider' ? 'Barber' : 'Zákazník'}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>Odhlásit se</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.xl,
    alignItems: 'center',
    paddingBottom: Spacing.xxl,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  name: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.white,
  },
  email: {
    fontSize: FontSize.md,
    color: Colors.accentLight,
    marginTop: 4,
  },
  section: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  infoText: {
    marginLeft: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  logoutText: {
    marginLeft: Spacing.sm,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.error,
  },
});
