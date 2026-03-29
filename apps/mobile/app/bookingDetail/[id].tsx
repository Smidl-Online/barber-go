import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getBooking, updateBookingStatus } from '../../services/bookings';
import StarRating from '../../components/StarRating';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import type { Booking } from '../../types/models';

const statusLabels: Record<string, { text: string; color: string; icon: string }> = {
  pending: { text: 'Čeká na potvrzení', color: Colors.warning, icon: 'time' },
  confirmed: { text: 'Potvrzeno', color: Colors.success, icon: 'checkmark-circle' },
  cancelled_by_customer: { text: 'Zrušeno zákazníkem', color: Colors.error, icon: 'close-circle' },
  cancelled_by_provider: { text: 'Zrušeno barberem', color: Colors.error, icon: 'close-circle' },
  completed: { text: 'Dokončeno', color: Colors.primary, icon: 'checkmark-done-circle' },
  no_show: { text: 'Nedostavil se', color: Colors.textMuted, icon: 'alert-circle' },
};

interface BookingDetail extends Booking {
  review?: {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
  } | null;
  provider: { display_name: string; profile_photo_url: string | null; salon_address?: string };
  customer?: { full_name: string; phone?: string };
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isProvider = user?.role === 'provider';

  const { data: booking, isLoading } = useQuery<BookingDetail>({
    queryKey: ['booking', id],
    queryFn: () => getBooking(id!),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      updateBookingStatus(id!, {
        status: isProvider ? 'cancelled_by_provider' : 'cancelled_by_customer',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      Alert.alert('Hotovo', 'Rezervace byla zrušena');
    },
    onError: (err: any) => {
      Alert.alert('Chyba', err.response?.data?.message || 'Nepodařilo se zrušit');
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => updateBookingStatus(id!, { status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err: any) => {
      Alert.alert('Chyba', err.response?.data?.message || 'Nepodařilo se označit jako dokončené');
    },
  });

  const handleComplete = () => {
    Alert.alert('Dokončit rezervaci?', 'Opravdu chcete označit tuto rezervaci jako dokončenou?', [
      { text: 'Ne', style: 'cancel' },
      { text: 'Ano, dokončit', onPress: () => completeMutation.mutate() },
    ]);
  };

  const handleCancel = () => {
    Alert.alert('Zrušit rezervaci?', 'Opravdu chcete zrušit tuto rezervaci?', [
      { text: 'Ne', style: 'cancel' },
      { text: 'Ano, zrušit', style: 'destructive', onPress: () => cancelMutation.mutate() },
    ]);
  };

  if (isLoading || !booking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const status = statusLabels[booking.status] || {
    text: booking.status,
    color: Colors.textMuted,
    icon: 'help-circle',
  };
  const date = new Date(booking.booking_date).toLocaleDateString('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const canCancel = ['pending', 'confirmed'].includes(booking.status);
  const canReview = booking.status === 'completed' && !booking.review && !isProvider;
  const canComplete = booking.status === 'confirmed' && isProvider;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status banner */}
      <View style={[styles.statusBanner, { backgroundColor: status.color }]}>
        <Ionicons name={status.icon as any} size={24} color={Colors.white} />
        <Text style={styles.statusText}>{status.text}</Text>
      </View>

      {/* Service info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Služba</Text>
        <Text style={styles.serviceName}>{booking.service.name}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={16} color={Colors.textLight} />
          <Text style={styles.metaText}>{booking.service.duration_minutes} min</Text>
          <Ionicons name="cash-outline" size={16} color={Colors.textLight} style={{ marginLeft: 16 }} />
          <Text style={styles.metaText}>{booking.service.price} Kč</Text>
        </View>
      </View>

      {/* Date & Time */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Termín</Text>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={16} color={Colors.textLight} />
          <Text style={styles.metaText}>{date}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={16} color={Colors.textLight} />
          <Text style={styles.metaText}>
            {booking.start_time} – {booking.end_time}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons
            name={booking.location_type === 'salon' ? 'business-outline' : 'car-outline'}
            size={16}
            color={Colors.textLight}
          />
          <Text style={styles.metaText}>
            {booking.location_type === 'salon' ? 'V salónu' : 'Mobilní služba'}
          </Text>
        </View>
        {booking.location_type === 'mobile' && booking.customer_address && (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={16} color={Colors.textLight} />
            <Text style={styles.metaText}>{booking.customer_address}</Text>
          </View>
        )}
      </View>

      {/* Provider/Customer info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{isProvider ? 'Zákazník' : 'Barber'}</Text>
        <Text style={styles.personName}>
          {isProvider ? booking.customer?.full_name : booking.provider.display_name}
        </Text>
        {isProvider && booking.customer?.phone && (
          <View style={styles.metaRow}>
            <Ionicons name="call-outline" size={16} color={Colors.textLight} />
            <Text style={styles.metaText}>{booking.customer.phone}</Text>
          </View>
        )}
        {!isProvider && booking.provider.salon_address && (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={16} color={Colors.textLight} />
            <Text style={styles.metaText}>{booking.provider.salon_address}</Text>
          </View>
        )}
      </View>

      {/* Note */}
      {booking.note && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Poznámka</Text>
          <Text style={styles.noteText}>{booking.note}</Text>
        </View>
      )}

      {/* Review section */}
      {booking.review && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vaše hodnocení</Text>
          <StarRating rating={booking.review.rating} size={24} />
          {booking.review.comment && (
            <Text style={styles.reviewComment}>{booking.review.comment}</Text>
          )}
          {!isProvider && (
            <TouchableOpacity
              style={styles.editReviewBtn}
              onPress={() => router.push(`/review/${booking.id}` as any)}
            >
              <Ionicons name="create-outline" size={16} color={Colors.accent} />
              <Text style={styles.editReviewText}>Upravit hodnocení</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Actions */}
      {canReview && (
        <TouchableOpacity
          style={styles.reviewBtn}
          onPress={() => router.push(`/review/${booking.id}` as any)}
        >
          <Ionicons name="star" size={20} color={Colors.white} />
          <Text style={styles.reviewBtnText}>Napsat hodnocení</Text>
        </TouchableOpacity>
      )}

      {canComplete && (
        <TouchableOpacity
          style={styles.completeBtn}
          onPress={handleComplete}
        >
          <Ionicons name="checkmark-done" size={20} color={Colors.white} />
          <Text style={styles.completeBtnText}>Označit jako dokončené</Text>
        </TouchableOpacity>
      )}

      {canCancel && (
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Ionicons name="close-circle-outline" size={20} color={Colors.error} />
          <Text style={styles.cancelBtnText}>Zrušit rezervaci</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  statusText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  serviceName: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.xs,
  },
  metaText: {
    fontSize: FontSize.md,
    color: Colors.textLight,
  },
  personName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  noteText: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 20,
  },
  reviewComment: {
    fontSize: FontSize.md,
    color: Colors.text,
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  editReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
  },
  editReviewText: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    fontWeight: '600',
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.star,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  reviewBtnText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  completeBtnText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  cancelBtnText: {
    color: Colors.error,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
