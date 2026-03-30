import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { updateProfile } from '../../services/auth';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, setAuth, accessToken, refreshToken } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.full_name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      if (accessToken && refreshToken) {
        setAuth(updatedUser, accessToken, refreshToken);
      }
      setIsEditing(false);
    },
    onError: (err: any) => {
      Alert.alert('Chyba', err.response?.data?.message || 'Nepodařilo se uložit změny');
    },
  });

  const handleSave = () => {
    if (!editName.trim() || editName.trim().length < 2) {
      Alert.alert('Chyba', 'Jméno musí mít alespoň 2 znaky');
      return;
    }
    mutation.mutate({
      full_name: editName.trim(),
      phone: editPhone.trim() || null,
    });
  };

  const handleCancel = () => {
    setEditName(user?.full_name || '');
    setEditPhone(user?.phone || '');
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.decorCircle} />
          <View style={styles.avatarWrap}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.initials}>{initials}</Text>
              </View>
            )}
          </View>
          {isEditing ? (
            <TextInput
              style={styles.nameInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Jméno a příjmení"
              placeholderTextColor="rgba(255,255,255,0.5)"
              autoFocus
            />
          ) : (
            <Text style={styles.name}>{user?.full_name}</Text>
          )}
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Ionicons
              name={user?.role === 'provider' ? 'cut' : 'person'}
              size={12}
              color={Colors.accent}
            />
            <Text style={styles.roleText}>
              {user?.role === 'provider' ? 'Barber' : 'Zákazník'}
            </Text>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="mail-outline" size={18} color={Colors.accent} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>Email</Text>
              <Text style={styles.cardValue}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.cardRow}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="call-outline" size={18} color={Colors.accent} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>Telefon</Text>
              {isEditing ? (
                <TextInput
                  style={styles.cardInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Telefonní číslo"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.cardValue}>
                  {user?.phone || 'Nezadáno'}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          {isEditing ? (
            <>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={mutation.isPending}
                activeOpacity={0.8}
              >
                {mutation.isPending ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color={Colors.white} />
                    <Text style={styles.saveBtnText}>Uložit změny</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color={Colors.textLight} />
                <Text style={styles.cancelBtnText}>Zrušit</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={20} color={Colors.accent} />
              <Text style={styles.editBtnText}>Upravit profil</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            <Text style={styles.logoutText}>Odhlásit se</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(233, 69, 96, 0.1)',
  },
  avatarWrap: {
    marginBottom: Spacing.md,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(233, 69, 96, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  initials: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.white,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  name: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.white,
  },
  nameInput: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.white,
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    textAlign: 'center',
    minWidth: 200,
  },
  email: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  roleText: {
    fontSize: FontSize.sm,
    color: Colors.white,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    marginTop: -Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(233, 69, 96, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
    marginTop: 2,
  },
  cardInput: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
    borderBottomWidth: 1,
    borderBottomColor: Colors.accent,
    paddingVertical: 2,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.background,
    marginVertical: Spacing.md,
  },
  actionsSection: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  editBtnText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.accent,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: 8,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: 8,
  },
  cancelBtnText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textLight,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: 8,
  },
  logoutText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.error,
  },
});
