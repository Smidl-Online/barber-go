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

const statusConfig: Record<string, { text: string; color: string; icon: string }> = {
  pending: { text: 'Čeká na potvrzení', color: Colors.warning, icon: 'time-outline' },
  confirmed: { text: 'Potvrzeno', color: Colors.success, icon: 'checkmark-circle-outline' },
  cancelled_by_customer: { text: 'Zrušeno', color: Colors.error, icon: 'close-circle-outline' },
  cancelled_by_provider: { text: 'Zrušeno', color: Colors.error, icon: 'close-circle-outline' },
  completed: { text: 'Dokončeno', color: Colors.primary, icon: 'checkmark-done-outline' },
  no_show: { text: 'Nedostavil se', color: Colors.textMuted, icon: 'eye-off-outline' },
};

export default function BookingCard({ booking, onPress, isProvider }: BookingCardProps) {
  const status = statusConfig[booking.status] || { text: booking.status, color: Colors.textMuted, icon: 'help-outline' };
  const date = new Date(booking.booking_date).toLocaleDateString('cs-CZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Date badge */}
      <View style={styles.dateBadge}>
        <Text style={styles.dateTime}>{booking.start_time}</Text>
        <Text style={styles.dateLabel}>{date}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.serviceName} numberOfLines={1}>{booking.service.name}</Text>
        <Text style={styles.providerName} numberOfLines={1}>
          {isProvider ? booking.customer?.full_name : booking.provider.display_name}
        </Text>
        <View style={styles.statusRow}>
          <Ionicons name={status.icon as any} size={14} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
          {booking.status === 'completed' && !booking.review && !isProvider && (
            <View style={styles.reviewBadge}>
              <Ionicons name="star" size={10} color={Colors.white} />
              <Text style={styles.reviewBadgeText}>Ohodnotit</Text>
            </View>
          )}
          {booking.review && (
            <Ionicons name="star" size={14} color={Colors.star} style={{ marginLeft: 6 }} />
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dateBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(233, 69, 96, 0.06)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 64,
  },
  dateTime: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.accent,
  },
  dateLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textLight,
    marginTop: 2,
  },
  content: {
    flex: 1,
    marginLeft: Spacing.md,
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
    marginTop: 6,
    gap: 4,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  reviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.star,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginLeft: 6,
  },
  reviewBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.white,
  },
});
