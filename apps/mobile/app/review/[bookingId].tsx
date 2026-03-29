import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createReview, updateReview, deleteReview } from '../../services/reviews';
import { getBooking } from '../../services/bookings';
import StarRating from '../../components/StarRating';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ReviewScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);

  // Load booking to check for existing review
  const { data: booking } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => getBooking(bookingId!),
    enabled: !!bookingId,
  });

  useEffect(() => {
    if (booking?.review) {
      setRating(booking.review.rating);
      setComment(booking.review.comment || '');
      setExistingReviewId(booking.review.id);
    }
  }, [booking]);

  const isEditing = !!existingReviewId;

  const mutation = useMutation({
    mutationFn: async (data: { rating: number; comment?: string }) => {
      if (isEditing) {
        return updateReview(existingReviewId!, data);
      }
      return createReview({ booking_id: bookingId!, ...data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      Alert.alert('Děkujeme!', isEditing ? 'Hodnocení aktualizováno.' : 'Vaše hodnocení bylo uloženo.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Chyba', err.response?.data?.message || 'Nepodařilo se uložit hodnocení');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteReview(existingReviewId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      Alert.alert('Smazáno', 'Hodnocení bylo odstraněno.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Chyba', err.response?.data?.message || 'Nepodařilo se smazat hodnocení');
    },
  });

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert('Chyba', 'Vyberte hodnocení (1-5 hvězdiček)');
      return;
    }

    mutation.mutate({
      rating,
      comment: comment || undefined,
    });
  };

  const handleDelete = () => {
    Alert.alert('Smazat hodnocení?', 'Tuto akci nelze vrátit.', [
      { text: 'Zrušit', style: 'cancel' },
      { text: 'Smazat', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isEditing ? 'Upravit hodnocení' : 'Jak jste byli spokojeni?'}</Text>

      <View style={styles.starsContainer}>
        <StarRating rating={rating} size={40} editable onRate={setRating} />
        <Text style={styles.ratingLabel}>
          {rating === 0
            ? 'Klepněte na hvězdičku'
            : rating <= 2
              ? 'Mohlo to být lepší'
              : rating <= 3
                ? 'Solidní'
                : rating <= 4
                  ? 'Velmi dobrý'
                  : 'Výborný!'}
        </Text>
      </View>

      <TextInput
        style={styles.commentInput}
        placeholder="Napište komentář (volitelné)..."
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity
        style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={rating === 0 || mutation.isPending}
      >
        {mutation.isPending ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.submitBtnText}>
            {isEditing ? 'Aktualizovat hodnocení' : 'Odeslat hodnocení'}
          </Text>
        )}
      </TouchableOpacity>

      {isEditing && (
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
          <Text style={styles.deleteBtnText}>Smazat hodnocení</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.xl },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  starsContainer: { alignItems: 'center', marginBottom: Spacing.xl },
  ratingLabel: {
    fontSize: FontSize.lg,
    color: Colors.textLight,
    marginTop: Spacing.md,
  },
  commentInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 120,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  deleteBtnText: {
    color: Colors.error,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
