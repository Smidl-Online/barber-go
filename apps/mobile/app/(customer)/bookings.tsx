import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getBookings } from '../../services/bookings';
import BookingCard from '../../components/BookingCard';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import type { Booking } from '../../types/models';

export default function BookingsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bookings', filter],
    queryFn: () => getBookings(filter),
  });

  const bookings: Booking[] = data || [];

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, filter === 'upcoming' && styles.tabActive]}
          onPress={() => setFilter('upcoming')}
        >
          <Text style={[styles.tabText, filter === 'upcoming' && styles.tabTextActive]}>
            Nadcházející
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filter === 'past' && styles.tabActive]}
          onPress={() => setFilter('past')}
        >
          <Text style={[styles.tabText, filter === 'past' && styles.tabTextActive]}>
            Minulé
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: Spacing.xl }} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => router.push(`/booking/${item.id}` as any)}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {filter === 'upcoming' ? 'Žádné nadcházející rezervace' : 'Žádné minulé rezervace'}
            </Text>
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
  },
  tabText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.accent,
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
