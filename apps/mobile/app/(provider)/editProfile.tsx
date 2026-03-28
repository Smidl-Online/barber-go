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
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';

const LOCATION_TYPES = [
  { value: 'salon', label: 'Salón', icon: 'business' as const },
  { value: 'mobile', label: 'Mobilní', icon: 'car' as const },
  { value: 'both', label: 'Obojí', icon: 'swap-horizontal' as const },
];

const CATEGORIES = [
  'Pánský holič',
  'Dámský kadeřník',
  'Unisex',
  'Barber shop',
  'Vizážistka',
  'Manikúra',
];

export default function EditProfileScreen() {
  const queryClient = useQueryClient();

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
      experience_years: experienceYears ? parseInt(experienceYears) : undefined,
      location_type: locationType,
      salon_address: salonAddress.trim() || undefined,
      service_radius_km: serviceRadius ? parseFloat(serviceRadius) : undefined,
    });
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
      <Text style={styles.sectionTitle}>Základní údaje</Text>

      <Text style={styles.label}>Zobrazované jméno *</Text>
      <TextInput
        style={styles.input}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Jak vás uvidí zákazníci"
      />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={bio}
        onChangeText={setBio}
        placeholder="Pár slov o vás a vašich službách..."
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
        keyboardType="numeric"
      />

      <Text style={styles.sectionTitle}>Lokace</Text>

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
            keyboardType="numeric"
          />
        </>
      )}

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textLight,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
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
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  locationBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
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
    marginTop: Spacing.xl,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: FontSize.lg,
  },
});
