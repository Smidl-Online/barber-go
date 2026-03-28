import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBookings, updateBookingStatus } from '../../services/bookings';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import type { Booking } from '../../types/models';

export default function IncomingScreen() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bookings', 'all'],
    queryFn: () => getBookings('all'),
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateBookingStatus(id, { status: status as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err: any) => {
      Alert.alert('Chyba', err.response?.data?.message || 'Operace selhala');
    },
  });

  const bookings: Booking[] = data || [];

  const handleAction = (id: string, status: string, label: string) => {
    Alert.alert('Potvrdit', `Chcete ${label}?`, [
      { text: 'Zrušit', style: 'cancel' },
      { text: 'Ano', onPress: () => mutation.mutate({ id, status }) },
    ]);
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: Spacing.xl }} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const date = new Date(item.booking_date).toLocaleDateString('cs-CZ');
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.customerName}>{item.customer?.full_name || 'Zákazník'}</Text>
                  <Text style={styles.dateTime}>
                    {date} {item.start_time}
                  </Text>
                </View>
                <Text style={styles.serviceName}>{item.service.name}</Text>
                <Text style={styles.price}>{item.service.price} Kč</Text>
                {item.note && <Text style={styles.note}>Poznámka: {item.note}</Text>}

                {item.status === 'pending' && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.confirmBtn}
                      onPress={() => handleAction(item.id, 'confirmed', 'potvrdit rezervaci')}
                    >
                      <Ionicons name="checkmark" size={18} color={Colors.white} />
                      <Text style={styles.actionText}>Potvrdit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() =>
                        handleAction(item.id, 'cancelled_by_provider', 'zamítnout rezervaci')
                      }
                    >
                      <Ionicons name="close" size={18} color={Colors.white} />
                      <Text style={styles.actionText}>Zamítnout</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {item.status === 'confirmed' && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.completeBtn}
                      onPress={() => handleAction(item.id, 'completed', 'označit jako dokončené')}
                    >
                      <Ionicons name="checkmark-done" size={18} color={Colors.white} />
                      <Text style={styles.actionText}>Dokončit</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>Žádné rezervace</Text>
          }
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.md },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  customerName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  dateTime: { fontSize: FontSize.sm, color: Colors.textMuted },
  serviceName: { fontSize: FontSize.md, color: Colors.textLight, marginTop: 4 },
  price: { fontSize: FontSize.md, fontWeight: '700', color: Colors.accent, marginTop: 2 },
  note: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 8, marginTop: Spacing.md },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: 4,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: 4,
  },
  completeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: 4,
  },
  actionText: { color: Colors.white, fontWeight: '600', fontSize: FontSize.sm },
  statusBadge: { position: 'absolute', top: Spacing.sm, right: Spacing.sm },
  statusText: { fontSize: FontSize.xs, color: Colors.textMuted },
  empty: {
    textAlign: 'center',
    color: Colors.textMuted,
    marginTop: Spacing.xl,
    fontSize: FontSize.md,
  },
});
