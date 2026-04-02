import React, { useRef, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { getBookings, updateBookingStatus } from '../../services/bookings';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import type { Booking } from '../../types/models';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: 'Čeká na potvrzení', color: Colors.warning, icon: 'time-outline' },
  confirmed: { label: 'Potvrzeno', color: Colors.success, icon: 'checkmark-circle-outline' },
  completed: { label: 'Dokončeno', color: Colors.primary, icon: 'checkmark-done-outline' },
  cancelled_by_customer: { label: 'Zrušeno zákazníkem', color: Colors.error, icon: 'close-circle-outline' },
  cancelled_by_provider: { label: 'Zrušeno', color: Colors.error, icon: 'close-circle-outline' },
  no_show: { label: 'Nedostavil se', color: Colors.textMuted, icon: 'alert-circle-outline' },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || { label: status, color: Colors.textMuted, icon: 'help-circle-outline' as const };
}

export default function IncomingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const navigating = useRef(false);
  const navigateToDetail = useCallback((id: string) => {
    if (navigating.current) return;
    navigating.current = true;
    router.push(`/bookingDetail/${id}` as any);
    setTimeout(() => { navigating.current = false; }, 1000);
  }, [router]);

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
            const statusCfg = getStatusConfig(item.status);
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => navigateToDetail(item.id)}
              >
                <View style={styles.cardTop}>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeText}>{item.start_time}</Text>
                    <Text style={styles.dateText}>{date}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.serviceName}>{item.service?.name}</Text>
                    <Text style={styles.customerName}>{item.customer?.full_name || 'Zákazník'}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '15' }]}>
                      <Ionicons name={statusCfg.icon} size={14} color={statusCfg.color} />
                      <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.price}>{item.service?.price} Kč</Text>
                </View>

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
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.empty}>Žádné rezervace</Text>
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
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.md },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  timeBlock: {
    backgroundColor: Colors.accent + '10',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    minWidth: 64,
  },
  timeText: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.accent,
  },
  dateText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  cardInfo: { flex: 1 },
  serviceName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  customerName: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  statusText: { fontSize: FontSize.xs, fontWeight: '600' },
  price: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.accent },
  note: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
  },
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
