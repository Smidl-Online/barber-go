import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getBookings } from '../../../services/bookings';
import BookingCard from '../../../components/BookingCard';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../constants/theme';
import type { Booking } from '../../../types/models';

export default function BookingsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['bookings', filter],
    queryFn: () => getBookings(filter),
  });

  const bookings: Booking[] = data || [];

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsWrap}>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, filter === 'upcoming' && styles.tabActive]}
            onPress={() => setFilter('upcoming')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="time-outline"
              size={16}
              color={filter === 'upcoming' ? Colors.white : Colors.textLight}
            />
            <Text style={[styles.tabText, filter === 'upcoming' && styles.tabTextActive]}>
              Nadcházející
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, filter === 'past' && styles.tabActive]}
            onPress={() => setFilter('past')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color={filter === 'past' ? Colors.white : Colors.textLight}
            />
            <Text style={[styles.tabText, filter === 'past' && styles.tabTextActive]}>
              Minulé
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: Spacing.xl }} />
      ) : isError ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.error} />
          <Text style={styles.emptyTitle}>Nepodařilo se načíst rezervace</Text>
          <Text style={styles.emptyHint}>
            {(error as any)?.response?.data?.message || 'Zkontrolujte připojení a zkuste to znovu'}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => refetch()}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={18} color={Colors.white} />
            <Text style={styles.retryBtnText}>Zkusit znovu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => router.push(`/(customer)/bookings/${item.id}` as any)}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons
                name={filter === 'upcoming' ? 'calendar-outline' : 'archive-outline'}
                size={48}
                color={Colors.border}
              />
              <Text style={styles.emptyTitle}>
                {filter === 'upcoming' ? 'Žádné nadcházející rezervace' : 'Žádné minulé rezervace'}
              </Text>
              <Text style={styles.emptyHint}>
                {filter === 'upcoming'
                  ? 'Objednejte se u barbera v sekci Objevovat'
                  : 'Zde se zobrazí vaše dokončené rezervace'
                }
              </Text>
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
  tabsWrap: {
    padding: Spacing.md,
    paddingBottom: 0,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.white,
  },
  list: {
    padding: Spacing.md,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: Spacing.xxl * 2,
    gap: Spacing.sm,
  },
  emptyTitle: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  emptyHint: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    paddingHorizontal: Spacing.xl,
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  retryBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
