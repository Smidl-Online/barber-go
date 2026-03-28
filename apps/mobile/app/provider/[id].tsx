import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getProvider } from '../../services/providers';
import StarRating from '../../components/StarRating';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import type { ProviderDetail } from '../../types/models';

const DAY_NAMES = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

export default function ProviderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: provider, isLoading } = useQuery<ProviderDetail>({
    queryKey: ['provider', id],
    queryFn: () => getProvider(id!),
    enabled: !!id,
  });

  if (isLoading || !provider) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const locationLabel =
    provider.location_type === 'mobile'
      ? 'Přijede k vám'
      : provider.location_type === 'salon'
        ? 'Salon'
        : 'Salon i mobilní';

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Hero */}
        <Image
          source={{ uri: provider.profile_photo_url || 'https://picsum.photos/400/300' }}
          style={styles.heroImage}
        />

        {/* Profile info */}
        <View style={styles.profileSection}>
          <Text style={styles.name}>{provider.display_name}</Text>
          <View style={styles.ratingRow}>
            <StarRating rating={provider.avg_rating} size={18} />
            <Text style={styles.ratingText}>
              {provider.avg_rating.toFixed(1)} ({provider.review_count} recenzí)
            </Text>
          </View>

          <View style={styles.badges}>
            <View style={styles.badge}>
              <Ionicons name="location" size={14} color={Colors.accent} />
              <Text style={styles.badgeText}>{locationLabel}</Text>
            </View>
            {provider.experience_years && (
              <View style={styles.badge}>
                <Ionicons name="ribbon" size={14} color={Colors.accent} />
                <Text style={styles.badgeText}>{provider.experience_years} let praxe</Text>
              </View>
            )}
          </View>

          <Text style={styles.bio}>{provider.bio}</Text>
          {provider.salon_address && (
            <View style={styles.addressRow}>
              <Ionicons name="navigate" size={14} color={Colors.textLight} />
              <Text style={styles.addressText}>{provider.salon_address}</Text>
            </View>
          )}
        </View>

        {/* Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Služby</Text>
          {provider.services.map((svc) => (
            <View key={svc.id} style={styles.serviceRow}>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{svc.name}</Text>
                {svc.description && (
                  <Text style={styles.serviceDesc}>{svc.description}</Text>
                )}
                <Text style={styles.serviceDuration}>{svc.duration_minutes} min</Text>
              </View>
              <Text style={styles.servicePrice}>
                {svc.price_note ? `${svc.price_note} ` : ''}{svc.price} Kč
              </Text>
            </View>
          ))}
        </View>

        {/* Portfolio */}
        {provider.portfolio_images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Galerie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {provider.portfolio_images.map((img) => (
                <View key={img.id} style={styles.portfolioItem}>
                  <Image source={{ uri: img.image_url }} style={styles.portfolioImage} />
                  {img.caption && <Text style={styles.portfolioCaption}>{img.caption}</Text>}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Availability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pracovní doba</Text>
          {provider.availability.map((a) => (
            <View key={a.id} style={styles.availRow}>
              <Text style={styles.dayName}>{DAY_NAMES[a.day_of_week]}</Text>
              <Text style={styles.availTime}>
                {a.start_time} – {a.end_time}
              </Text>
            </View>
          ))}
        </View>

        {/* Reviews */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recenze</Text>
          {provider.reviews.length === 0 ? (
            <Text style={styles.emptyText}>Zatím žádné recenze</Text>
          ) : (
            provider.reviews.map((rev) => (
              <View key={rev.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewAuthor}>{rev.customer.full_name}</Text>
                  <StarRating rating={rev.rating} size={12} />
                </View>
                {rev.comment && <Text style={styles.reviewComment}>{rev.comment}</Text>}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* CTA */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push(`/booking/${provider.id}`)}
        >
          <Text style={styles.ctaText}>Rezervovat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroImage: { width: '100%', height: 250 },
  profileSection: { padding: Spacing.lg, backgroundColor: Colors.white },
  name: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs },
  ratingText: { marginLeft: Spacing.sm, fontSize: FontSize.md, color: Colors.textLight },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeText: { marginLeft: 4, fontSize: FontSize.sm, color: Colors.accent, fontWeight: '600' },
  bio: { fontSize: FontSize.md, color: Colors.textLight, marginTop: Spacing.md, lineHeight: 22 },
  addressRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm },
  addressText: { marginLeft: 6, fontSize: FontSize.sm, color: Colors.textLight },
  section: { padding: Spacing.lg, backgroundColor: Colors.white, marginTop: Spacing.sm },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  serviceDesc: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 2 },
  serviceDuration: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  servicePrice: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.accent },
  portfolioItem: { marginRight: Spacing.sm },
  portfolioImage: { width: 200, height: 150, borderRadius: BorderRadius.md },
  portfolioCaption: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 4, textAlign: 'center' },
  availRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  dayName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, width: 40 },
  availTime: { fontSize: FontSize.md, color: Colors.textLight },
  reviewCard: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewAuthor: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  reviewComment: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: Spacing.xs },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted, textAlign: 'center' },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  ctaButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  ctaText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
});
