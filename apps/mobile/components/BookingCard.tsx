import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import type { Booking } from '../types/models';

interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
  isProvider?: boolean;
}

const statusLabels: Record<string, { text: string; color: string }> = {
  pending: { text: 'Čeká na potvrzení', color: Colors.warning },
  confirmed: { text: 'Potvrzeno', color: Colors.success },
  cancelled_by_customer: { text: 'Zrušeno zákazníkem', color: Colors.error },
  cancelled_by_provider: { text: 'Zrušeno barberem', color: Colors.error },
  completed: { text: 'Dokončeno', color: Colors.primary },
  no_show: { text: 'Nedostavil se', color: Colors.textMuted },
};

export default function BookingCard({ booking, onPress, isProvider }: BookingCardProps) {
  const status = statusLabels[booking.status] || { text: booking.status, color: Colors.textMuted };
  const date = new Date(booking.booking_date).toLocaleDateString('cs-CZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.dateSection}>
        <Text style={styles.date}>{date}</Text>
        <Text style={styles.time}>{booking.start_time}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.info}>
        <Text style={styles.serviceName}>{booking.service.name}</Text>
        <Text style={styles.providerName}>
          {isProvider ? booking.customer?.full_name : booking.provider.display_name}
        </Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  dateSection: {
    alignItems: 'center',
    width: 60,
  },
  date: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  time: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.accent,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  info: {
    flex: 1,
  },
  serviceName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  providerName: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
});
