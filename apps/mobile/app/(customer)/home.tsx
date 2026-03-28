import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getProviders } from '../../services/providers';
import ProviderCard from '../../components/ProviderCard';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import type { Provider } from '../../types/models';

const SORT_OPTIONS = [
  { key: 'rating', label: 'Hodnocení' },
  { key: 'review_count', label: 'Počet recenzí' },
  { key: 'distance', label: 'Vzdálenost' },
];

const LOCATION_FILTERS = [
  { key: '', label: 'Vše' },
  { key: 'salon', label: 'Salon' },
  { key: 'mobile', label: 'Mobilní' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [locFilter, setLocFilter] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['providers', search, sortBy, locFilter],
    queryFn: () =>
      getProviders({
        search: search || undefined,
        sort_by: sortBy,
        location_type: locFilter || undefined,
        category: 'barber',
      } as any),
  });

  const providers: Provider[] = data?.data || [];

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Hledat barbera..."
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        {LOCATION_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, locFilter === f.key && styles.chipActive]}
            onPress={() => setLocFilter(f.key)}
          >
            <Text style={[styles.chipText, locFilter === f.key && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.chipDivider} />
        {SORT_OPTIONS.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.chip, sortBy === s.key && styles.chipActive]}
            onPress={() => setSortBy(s.key)}
          >
            <Text style={[styles.chipText, sortBy === s.key && styles.chipTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Provider list */}
      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: Spacing.xl }} />
      ) : (
        <FlatList
          data={providers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProviderCard
              provider={item}
              onPress={() => router.push(`/provider/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>Žádní barbeři nenalezeni</Text>
          }
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSize.md,
  },
  filters: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    maxHeight: 40,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    marginRight: Spacing.xs,
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
  chipDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.xs,
  },
  list: {
    padding: Spacing.md,
  },
  empty: {
    textAlign: 'center',
    color: Colors.textMuted,
    marginTop: Spacing.xl,
    fontSize: FontSize.md,
  },
});
