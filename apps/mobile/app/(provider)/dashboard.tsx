import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getBookings } from '../../services/bookings';
import BookingCard from '../../components/BookingCard';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { toVocative } from '../../utils/czechVocative';
import type { Booking } from '../../types/models';

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['bookings', 'upcoming'],
    queryFn: () => getBookings('upcoming'),
  });

  const bookings: Booking[] = data || [];
  const todayStr = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter((b) => b.booking_date.startsWith(todayStr));
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  const firstName = user?.full_name?.split(' ')[0] || '';
  const greeting = firstName ? `Ahoj, ${toVocative(firstName)}` : 'Ahoj';

  return (
    <View style={styles.container}>
      <FlatList
        data={todayBookings.length > 0 ? todayBookings : bookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BookingCard booking={item} onPress={() => {}} isProvider />
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <Text style={styles.greeting}>{greeting}</Text>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: Colors.accent + '15' }]}>
                  <Ionicons name="today" size={22} color={Colors.accent} />
                </View>
                <Text style={styles.statNumber}>{todayBookings.length}</Text>
                <Text style={styles.statLabel}>Dnes</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: Colors.success + '15' }]}>
                  <Ionicons name="calendar" size={22} color={Colors.success} />
                </View>
                <Text style={styles.statNumber}>{bookings.length}</Text>
                <Text style={styles.statLabel}>Celkem</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: Colors.warning + '15' }]}>
                  <Ionicons name="hourglass" size={22} color={Colors.warning} />
                </View>
                <Text style={styles.statNumber}>{pendingCount}</Text>
                <Text style={styles.statLabel}>Čeká</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>
              {todayBookings.length > 0 ? 'Dnešní rezervace' : 'Nadcházející rezervace'}
            </Text>
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: Spacing.xl }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.empty}>Žádné nadcházející rezervace</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  greeting: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statNumber: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: Spacing.xxl,
    gap: Spacing.sm,
  },
  empty: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: FontSize.md,
  },
});
