import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

interface StarRatingProps {
  rating: number;
  size?: number;
  editable?: boolean;
  onRate?: (rating: number) => void;
}

export default function StarRating({ rating, size = 16, editable = false, onRate }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={styles.container}>
      {stars.map((star) => (
        <TouchableOpacity
          key={star}
          disabled={!editable}
          onPress={() => onRate?.(star)}
          style={{ padding: editable ? 4 : 0 }}
        >
          <Ionicons
            name={star <= rating ? 'star' : star - 0.5 <= rating ? 'star-half' : 'star-outline'}
            size={size}
            color={Colors.star}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
