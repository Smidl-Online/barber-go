import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createReview } from '../../services/reviews';
import StarRating from '../../components/StarRating';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';

export default function ReviewScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const mutation = useMutation({
    mutationFn: createReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      Alert.alert('Děkujeme!', 'Vaše hodnocení bylo uloženo.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Chyba', err.response?.data?.message || 'Nepodařilo se uložit hodnocení');
    },
  });

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert('Chyba', 'Vyberte hodnocení (1-5 hvězdiček)');
      return;
    }

    mutation.mutate({
      booking_id: bookingId!,
      rating,
      comment: comment || undefined,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Jak jste byli spokojeni?</Text>

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
          <Text style={styles.submitBtnText}>Odeslat hodnocení</Text>
        )}
      </TouchableOpacity>
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
});
