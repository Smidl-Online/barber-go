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
import { useAuthStore } from '../../stores/authStore';
import ProviderCard from '../../components/ProviderCard';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import type { Provider } from '../../types/models';

const SORT_OPTIONS = [
  { key: 'rating', label: 'Hodnocení', icon: 'star-outline' as const },
  { key: 'review_count', label: 'Recenze', icon: 'chatbubble-outline' as const },
  { key: 'distance', label: 'Vzdálenost', icon: 'navigate-outline' as const },
];

const LOCATION_FILTERS = [
  { key: 'all', label: 'Vše', icon: 'grid-outline' as const },
  { key: 'salon', label: 'Salon', icon: 'business-outline' as const },
  { key: 'mobile', label: 'Mobilní', icon: 'car-outline' as const },
];

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [locFilter, setLocFilter] = useState('all');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['providers', search, sortBy, locFilter],
    queryFn: () =>
      getProviders({
        search: search || undefined,
        sort_by: sortBy,
        location_type: locFilter === 'all' ? undefined : locFilter,
        category: 'barber',
      } as any),
  });

  const providers: Provider[] = data?.data || [];
  const firstName = user?.full_name?.split(' ')[0] || '';

  return (
    <View style={styles.container}>
      {/* Header area */}
      <View style={styles.headerArea}>
        <Text style={styles.greeting}>
          Ahoj{firstName ? `, ${firstName}` : ''} 👋
        </Text>
        <Text style={styles.headerSubtitle}>Najdi si svého barbera</Text>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Hledat barbera..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filters}
        contentContainerStyle={styles.filtersContent}
      >
        {LOCATION_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, locFilter === f.key && styles.chipActive]}
            onPress={() => setLocFilter(f.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={f.icon}
              size={14}
              color={locFilter === f.key ? Colors.white : Colors.textLight}
            />
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
            activeOpacity={0.7}
          >
            <Ionicons
              name={s.icon}
              size={14}
              color={sortBy === s.key ? Colors.white : Colors.textLight}
            />
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
            <View style={styles.emptyWrap}>
              <Ionicons name="search-outline" size={48} color={Colors.border} />
              <Text style={styles.empty}>Žádní barbeři nenalezeni</Text>
              <Text style={styles.emptyHint}>Zkuste změnit filtry nebo vyhledávání</Text>
            </View>
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
  headerArea: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greeting: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    height: 48,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.white,
  },
  filters: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  filtersContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textLight,
  },
  chipTextActive: {
    color: Colors.white,
  },
  chipDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
    alignSelf: 'center',
  },
  list: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    gap: Spacing.sm,
  },
  empty: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  emptyHint: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
});
