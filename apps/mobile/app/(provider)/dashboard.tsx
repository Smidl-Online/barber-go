import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getBookings } from '../../services/bookings';
import BookingCard from '../../components/BookingCard';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import type { Booking } from '../../types/models';

export default function DashboardScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['bookings', 'upcoming'],
    queryFn: () => getBookings('upcoming'),
  });

  const bookings: Booking[] = data || [];
  const todayStr = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter((b) => b.booking_date.startsWith(todayStr));
  const upcomingBookings = bookings.filter((b) => !b.booking_date.startsWith(todayStr));

  return (
    <View style={styles.container}>
      {/* Stats cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="today" size={28} color={Colors.accent} />
          <Text style={styles.statNumber}>{todayBookings.length}</Text>
          <Text style={styles.statLabel}>Dnes</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="calendar" size={28} color={Colors.success} />
          <Text style={styles.statNumber}>{upcomingBookings.length}</Text>
          <Text style={styles.statLabel}>Nadcházející</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="hourglass" size={28} color={Colors.warning} />
          <Text style={styles.statNumber}>
            {bookings.filter((b) => b.status === 'pending').length}
          </Text>
          <Text style={styles.statLabel}>Čeká</Text>
        </View>
      </View>

      {/* Today's bookings */}
      <Text style={styles.sectionTitle}>
        {todayBookings.length > 0 ? 'Dnešní rezervace' : 'Nadcházející rezervace'}
      </Text>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.accent} />
      ) : (
        <FlatList
          data={todayBookings.length > 0 ? todayBookings : upcomingBookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BookingCard booking={item} onPress={() => {}} isProvider />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>Žádné nadcházející rezervace</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  statsRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statNumber: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  list: { padding: Spacing.md },
  empty: {
    textAlign: 'center',
    color: Colors.textMuted,
    marginTop: Spacing.lg,
    fontSize: FontSize.md,
  },
});
