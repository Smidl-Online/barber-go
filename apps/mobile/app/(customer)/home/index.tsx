import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getProviders } from '../../../services/providers';
import { useAuthStore } from '../../../stores/authStore';
import ProviderCard from '../../../components/ProviderCard';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import type { Provider } from '../../../types/models';

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
  const [sortModalVisible, setSortModalVisible] = useState(false);

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
  const activeSortLabel = SORT_OPTIONS.find((s) => s.key === sortBy)?.label || '';

  return (
    <View style={styles.container}>
      {/* Header area */}
      <View style={styles.headerArea}>
        <Text style={styles.greeting}>
          Ahoj{firstName ? `, ${firstName}` : ''} 👋
        </Text>
        <Text style={styles.headerSubtitle}>Najdi si svého barbera</Text>

        {/* Search bar + sort button */}
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="rgba(255,255,255,0.5)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Hledat barbera..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setSortModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="funnel-outline" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Location type pills */}
        <View style={styles.typePills}>
          {LOCATION_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.pill, locFilter === f.key && styles.pillActive]}
              onPress={() => setLocFilter(f.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={f.icon}
                size={14}
                color={locFilter === f.key ? Colors.primary : 'rgba(255,255,255,0.7)'}
              />
              <Text style={[styles.pillText, locFilter === f.key && styles.pillTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Active sort indicator */}
      <View style={styles.sortIndicator}>
        <TouchableOpacity
          style={styles.sortIndicatorBtn}
          onPress={() => setSortModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="swap-vertical-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.sortIndicatorText}>
            Řazení: <Text style={styles.sortIndicatorValue}>{activeSortLabel}</Text>
          </Text>
        </TouchableOpacity>
      </View>

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
              onPress={() => router.push(`/(customer)/home/provider/${item.id}` as any)}
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

      {/* Sort Modal */}
      <Modal
        visible={sortModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSortModalVisible(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Řazení</Text>
            {SORT_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[styles.modalOption, sortBy === s.key && styles.modalOptionActive]}
                onPress={() => {
                  setSortBy(s.key);
                  setSortModalVisible(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.modalOptionLeft}>
                  <Ionicons
                    name={s.icon}
                    size={20}
                    color={sortBy === s.key ? Colors.accent : Colors.textLight}
                  />
                  <Text
                    style={[
                      styles.modalOptionText,
                      sortBy === s.key && styles.modalOptionTextActive,
                    ]}
                  >
                    {s.label}
                  </Text>
                </View>
                {sortBy === s.key && (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.accent} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchContainer: {
    flex: 1,
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
  sortButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typePills: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  pillActive: {
    backgroundColor: Colors.white,
  },
  pillText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  pillTextActive: {
    color: Colors.primary,
  },
  sortIndicator: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  sortIndicatorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortIndicatorText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  sortIndicatorValue: {
    fontWeight: '700',
    color: Colors.text,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.md,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xs,
  },
  modalOptionActive: {
    backgroundColor: 'rgba(233, 69, 96, 0.08)',
  },
  modalOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  modalOptionText: {
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  modalOptionTextActive: {
    fontWeight: '700',
    color: Colors.accent,
  },
});
