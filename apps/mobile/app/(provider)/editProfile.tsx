import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';

const LOCATION_TYPES = [
  { value: 'salon', label: 'Salon', icon: 'business' as const },
  { value: 'mobile', label: 'Mobilni', icon: 'car' as const },
  { value: 'both', label: 'Oboji', icon: 'swap-horizontal' as const },
];

const CATEGORIES = [
  'Pansky holic',
  'Damsky kadernik',
  'Unisex',
  'Barber shop',
  'Vizazistka',
  'Manikura',
];

export default function EditProfileScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['provider-profile'],
    queryFn: async () => (await api.get('/provider/profile')).data,
  });

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [category, setCategory] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [locationType, setLocationType] = useState('salon');
  const [salonAddress, setSalonAddress] = useState('');
  const [serviceRadius, setServiceRadius] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setCategory(profile.category || '');
      setExperienceYears(profile.experience_years?.toString() || '');
      setLocationType(profile.location_type || 'salon');
      setSalonAddress(profile.salon_address || '');
      setServiceRadius(profile.service_radius_km?.toString() || '');
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      (await api.put('/provider/profile', data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
      Alert.alert('Uloženo', 'Profil byl úspěšně aktualizován');
    },
    onError: (err: any) => {
      Alert.alert('Chyba', err.response?.data?.message || 'Nepodařilo se uložit');
    },
  });

  const handleSave = () => {
    if (!displayName.trim()) {
      Alert.alert('Chyba', 'Zobrazované jméno je povinné');
      return;
    }

    mutation.mutate({
      display_name: displayName.trim(),
      bio: bio.trim() || undefined,
      category: category || undefined,
      experience_years: experienceYears ? (parseInt(experienceYears, 10) || undefined) : undefined,
      location_type: locationType,
      salon_address: salonAddress.trim() || undefined,
      service_radius_km: serviceRadius ? (parseFloat(serviceRadius) || undefined) : undefined,
    });
  };

  const handleLogout = () => {
    Alert.alert('Odhlášení', 'Opravdu se chcete odhlásit?', [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Odhlásit',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/');
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={32} color={Colors.white} />
        </View>
        <View style={styles.profileHeaderInfo}>
          <Text style={styles.profileName}>{user?.full_name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Základní údaje</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Zobrazované jméno *</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Jak vás uvidí zákazníci"
          placeholderTextColor={Colors.textMuted}
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Pár slov o vás a vašich službách..."
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Kategorie</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, category === cat && styles.chipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Roky zkušeností</Text>
        <TextInput
          style={styles.input}
          value={experienceYears}
          onChangeText={setExperienceYears}
          placeholder="např. 5"
          placeholderTextColor={Colors.textMuted}
          keyboardType="numeric"
        />
      </View>

      <Text style={styles.sectionLabel}>Lokace</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Typ služby</Text>
        <View style={styles.locationRow}>
          {LOCATION_TYPES.map((lt) => (
            <TouchableOpacity
              key={lt.value}
              style={[styles.locationBtn, locationType === lt.value && styles.locationBtnActive]}
              onPress={() => setLocationType(lt.value)}
            >
              <Ionicons
                name={lt.icon}
                size={20}
                color={locationType === lt.value ? Colors.white : Colors.textLight}
              />
              <Text
                style={[
                  styles.locationBtnText,
                  locationType === lt.value && styles.locationBtnTextActive,
                ]}
              >
                {lt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {(locationType === 'salon' || locationType === 'both') && (
          <>
            <Text style={styles.label}>Adresa salónu</Text>
            <TextInput
              style={styles.input}
              value={salonAddress}
              onChangeText={setSalonAddress}
              placeholder="Ulice, město"
              placeholderTextColor={Colors.textMuted}
            />
          </>
        )}

        {(locationType === 'mobile' || locationType === 'both') && (
          <>
            <Text style={styles.label}>Dojezdový radius (km)</Text>
            <TextInput
              style={styles.input}
              value={serviceRadius}
              onChangeText={setServiceRadius}
              placeholder="např. 15"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
            />
          </>
        )}
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, mutation.isPending && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.saveBtnText}>Uložit profil</Text>
        )}
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>Odhlásit se</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeaderInfo: { flex: 1 },
  profileName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  profileEmail: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },

  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textLight,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
  },
  chipActive: {
    backgroundColor: Colors.accent,
  },
  chipText: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  chipTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  locationBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
  },
  locationBtnActive: {
    backgroundColor: Colors.accent,
  },
  locationBtnText: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    fontWeight: '600',
  },
  locationBtnTextActive: {
    color: Colors.white,
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: FontSize.lg,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  logoutText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.error,
  },
});
