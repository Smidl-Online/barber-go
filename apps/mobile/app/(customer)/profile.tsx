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
      // Update auth store with new user data
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatarPlaceholder}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <Ionicons name="person" size={40} color={Colors.white} />
            )}
          </View>
          {isEditing ? (
            <TextInput
              style={styles.nameInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Jméno a příjmení"
              placeholderTextColor={Colors.accentLight}
              autoFocus
            />
          ) : (
            <Text style={styles.name}>{user?.full_name}</Text>
          )}
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color={Colors.textLight} />
            <Text style={styles.infoText}>{user?.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color={Colors.textLight} />
            {isEditing ? (
              <TextInput
                style={styles.infoInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Telefonní číslo"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.infoText}>
                {user?.phone || 'Nezadáno'}
              </Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color={Colors.textLight} />
            <Text style={styles.infoText}>
              {user?.role === 'provider' ? 'Barber' : 'Zákazník'}
            </Text>
          </View>
        </View>

        {isEditing ? (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={Colors.white} />
                  <Text style={styles.saveBtnText}>Uložit</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Ionicons name="close" size={20} color={Colors.textLight} />
              <Text style={styles.cancelBtnText}>Zrušit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
            <Ionicons name="create-outline" size={20} color={Colors.accent} />
            <Text style={styles.editBtnText}>Upravit profil</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Odhlásit se</Text>
        </TouchableOpacity>
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
  nameInput: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.white,
    borderBottomWidth: 2,
    borderBottomColor: Colors.accentLight,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    textAlign: 'center',
    minWidth: 200,
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
  infoInput: {
    marginLeft: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: Colors.accent,
    paddingVertical: 2,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: 8,
  },
  editBtnText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.accent,
  },
  editActions: {
    marginHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: 8,
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
    borderRadius: BorderRadius.lg,
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
