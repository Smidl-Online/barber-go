import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import StarRating from './StarRating';
import type { Provider } from '../types/models';

interface ProviderCardProps {
  provider: Provider;
  onPress: () => void;
}

export default function ProviderCard({ provider, onPress }: ProviderCardProps) {
  const locationLabel =
    provider.location_type === 'mobile'
      ? 'Přijede k vám'
      : provider.location_type === 'salon'
        ? 'Salon'
        : 'Salon i mobilní';

  const locationIcon =
    provider.location_type === 'mobile' ? 'car' : provider.location_type === 'salon' ? 'business' : 'swap-horizontal';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {provider.profile_photo_url ? (
        <Image source={{ uri: provider.profile_photo_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Ionicons name="person" size={28} color={Colors.white} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {provider.display_name}
        </Text>
        <View style={styles.ratingRow}>
          <StarRating rating={provider.avg_rating} size={14} />
          <Text style={styles.ratingText}>
            {provider.avg_rating.toFixed(1)} ({provider.review_count})
          </Text>
        </View>
        <View style={styles.badges}>
          <View style={styles.badge}>
            <Ionicons name={locationIcon as any} size={12} color={Colors.accent} />
            <Text style={styles.badgeText}>{locationLabel}</Text>
          </View>
          {provider.min_price != null && (
            <Text style={styles.price}>od {provider.min_price} Kč</Text>
          )}
        </View>
        {provider.distance_km !== null && (
          <Text style={styles.distance}>{provider.distance_km} km</Text>
        )}
      </View>
      <View style={styles.chevronWrap}>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.lg,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingText: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginLeft: 4,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(233, 69, 96, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: FontSize.xs,
    color: Colors.accent,
    marginLeft: 4,
    fontWeight: '600',
  },
  price: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  distance: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  chevronWrap: {
    marginLeft: Spacing.sm,
  },
});
