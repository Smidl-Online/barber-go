import React, { useState, useMemo, useCallback, useLayoutEffect, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProvider, getProviderAvailability } from '../../services/providers';
import { createBooking } from '../../services/bookings';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import type { ProviderDetail, Service } from '../../types/models';

type Step = 'service' | 'date' | 'time' | 'location' | 'note' | 'confirm' | 'success';

const STEPS: Step[] = ['service', 'date', 'time', 'location', 'note', 'confirm'];

const STEP_LABELS: Record<string, string> = {
  service: 'Služba',
  date: 'Datum',
  time: 'Čas',
  location: 'Místo',
  note: 'Poznámka',
  confirm: 'Shrnutí',
};

export default function BookingScreen() {
  const { providerId } = useLocalSearchParams<{ providerId: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('service');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [locationType, setLocationType] = useState<'salon' | 'mobile'>('salon');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerLat, setCustomerLat] = useState<number | undefined>();
  const [customerLng, setCustomerLng] = useState<number | undefined>();
  const [note, setNote] = useState('');

  const { data: provider } = useQuery<ProviderDetail>({
    queryKey: ['provider', providerId],
    queryFn: () => getProvider(providerId!),
    enabled: !!providerId,
  });

  const { data: availData, isLoading: slotsLoading } = useQuery({
    queryKey: ['availability', providerId, selectedDate, selectedService?.id],
    queryFn: () => getProviderAvailability(providerId!, selectedDate, selectedService?.id),
    enabled: !!selectedDate && !!selectedService,
  });

  const slots: string[] = availData?.slots || [];

  const mutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setStep('success');
    },
    onError: (err: any) => {
      // Keep on confirm step so user can retry
    },
  });

  const workingDays = useMemo(() => {
    if (!provider) return new Set<number>();
    const days = new Set<number>();
    provider.availability.forEach((a) => {
      if (a.is_active) days.add(a.day_of_week);
    });
    return days;
  }, [provider]);

  const dateOptions = useMemo(() => {
    const dates: { date: string; available: boolean }[] = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const jsDay = d.getDay();
      const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
      dates.push({ date: dateStr, available: workingDays.has(dayIndex) });
    }
    return dates;
  }, [workingDays]);

  const handleConfirm = () => {
    if (!selectedService || !selectedDate || !selectedTime) return;

    mutation.mutate({
      provider_id: providerId!,
      service_id: selectedService.id,
      booking_date: selectedDate,
      start_time: selectedTime,
      location_type: locationType,
      customer_address: locationType === 'mobile' ? customerAddress : undefined,
      customer_lat: locationType === 'mobile' ? customerLat : undefined,
      customer_lng: locationType === 'mobile' ? customerLng : undefined,
      note: note || undefined,
    });
  };

  const goBack = useCallback(() => {
    if (step === 'success') {
      router.back();
      return;
    }
    const currentIndex = STEPS.indexOf(step);
    if (currentIndex <= 0) {
      router.back();
    } else {
      setStep(STEPS[currentIndex - 1]);
    }
  }, [step, router]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const handler = () => {
      goBack();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => subscription.remove();
  }, [goBack]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: step === 'success'
        ? () => null
        : () => (
            <TouchableOpacity
              onPress={goBack}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 6,
                paddingHorizontal: 4,
                marginLeft: 0,
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={22} color={Colors.white} />
              <Text style={{ color: Colors.white, fontSize: 16, fontWeight: '500', marginLeft: 2 }}>
                Zpět
              </Text>
            </TouchableOpacity>
          ),
    });
  }, [navigation, goBack, step]);

  const canGoMobile = provider?.location_type === 'mobile' || provider?.location_type === 'both';
  const canGoSalon = provider?.location_type === 'salon' || provider?.location_type === 'both';

  if (!provider) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  // Success screen
  if (step === 'success') {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIconCircle}>
          <Ionicons name="checkmark" size={64} color={Colors.white} />
        </View>
        <Text style={styles.successTitle}>Rezervace vytvořena!</Text>
        <Text style={styles.successSubtitle}>
          Čeká na potvrzení barberem. Jakmile ji potvrdí, dostanete notifikaci.
        </Text>

        <View style={styles.successSummary}>
          <View style={styles.successRow}>
            <View style={styles.successIconWrap}>
              <Ionicons name="cut-outline" size={18} color={Colors.accent} />
            </View>
            <Text style={styles.successRowText}>{selectedService?.name}</Text>
          </View>
          <View style={styles.successRow}>
            <View style={styles.successIconWrap}>
              <Ionicons name="calendar-outline" size={18} color={Colors.accent} />
            </View>
            <Text style={styles.successRowText}>
              {selectedDate && new Date(selectedDate).toLocaleDateString('cs-CZ', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </View>
          <View style={styles.successRow}>
            <View style={styles.successIconWrap}>
              <Ionicons name="time-outline" size={18} color={Colors.accent} />
            </View>
            <Text style={styles.successRowText}>{selectedTime}</Text>
          </View>
          <View style={[styles.successRow, { borderBottomWidth: 0 }]}>
            <View style={styles.successIconWrap}>
              <Ionicons name="cash-outline" size={18} color={Colors.accent} />
            </View>
            <Text style={[styles.successRowText, { color: Colors.accent, fontWeight: '700' }]}>
              {selectedService?.price} Kč
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.successBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.successBtnText}>Hotovo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStepIndex = STEPS.indexOf(step);

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Progress bar */}
      <View style={styles.progressWrap}>
        <View style={styles.progressBg}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressLabel}>
          {STEP_LABELS[step]} ({currentStepIndex + 1}/{STEPS.length})
        </Text>
      </View>

      {/* Step 1: Service */}
      {step === 'service' && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Vyberte službu</Text>
          <Text style={styles.stepHint}>Zvolte, co pro vás barber udělá</Text>
          {provider.services.map((svc) => (
            <TouchableOpacity
              key={svc.id}
              style={[styles.optionCard, selectedService?.id === svc.id && styles.optionCardSelected]}
              onPress={() => {
                setSelectedService(svc);
                setStep('date');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.serviceIconWrap}>
                <Ionicons name="cut" size={20} color={Colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{svc.name}</Text>
                <Text style={styles.optionSubtitle}>{svc.duration_minutes} min</Text>
              </View>
              <Text style={styles.optionPrice}>{svc.price} Kč</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Step 2: Date */}
      {step === 'date' && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Vyberte datum</Text>
          <Text style={styles.stepHint}>Příští 2 týdny</Text>
          {dateOptions.map(({ date, available }) => {
            const d = new Date(date);
            const label = d.toLocaleDateString('cs-CZ', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            });
            return (
              <TouchableOpacity
                key={date}
                style={[
                  styles.optionCard,
                  selectedDate === date && styles.optionCardSelected,
                  !available && styles.optionCardDisabled,
                ]}
                disabled={!available}
                onPress={() => {
                  setSelectedDate(date);
                  setSelectedTime('');
                  setStep('time');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.serviceIconWrap, !available && { opacity: 0.3 }]}>
                  <Ionicons name="calendar" size={20} color={available ? Colors.accent : Colors.textMuted} />
                </View>
                <Text style={[styles.optionTitle, { flex: 1 }, !available && styles.optionTitleDisabled]}>
                  {label}
                </Text>
                {!available ? (
                  <Text style={styles.closedLabel}>Zavřeno</Text>
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Step 3: Time */}
      {step === 'time' && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Vyberte čas</Text>
          <Text style={styles.stepHint}>Dostupné termíny pro vybraný den</Text>
          {slotsLoading ? (
            <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: Spacing.xl }} />
          ) : slots.length === 0 ? (
            <View style={styles.emptySlots}>
              <Ionicons name="time-outline" size={40} color={Colors.border} />
              <Text style={styles.emptyText}>Žádné volné termíny pro tento den</Text>
            </View>
          ) : (
            <View style={styles.timeGrid}>
              {slots.map((slot) => (
                <TouchableOpacity
                  key={slot}
                  style={[styles.timeSlot, selectedTime === slot && styles.timeSlotSelected]}
                  onPress={() => {
                    setSelectedTime(slot);
                    setStep('location');
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.timeSlotText, selectedTime === slot && styles.timeSlotTextSelected]}
                  >
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Step 4: Location */}
      {step === 'location' && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Kde se potkáme?</Text>
          <Text style={styles.stepHint}>Zvolte, kam se dostavíte</Text>

          {canGoSalon && (
            <TouchableOpacity
              style={[styles.locationCard, locationType === 'salon' && styles.locationCardSelected]}
              onPress={() => {
                setLocationType('salon');
                setStep('note');
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.locationIcon, locationType === 'salon' && styles.locationIconSelected]}>
                <Ionicons name="business" size={24} color={locationType === 'salon' ? Colors.white : Colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>V salonu</Text>
                {provider.salon_address ? (
                  <Text style={styles.optionSubtitle}>{provider.salon_address}</Text>
                ) : (
                  <Text style={[styles.optionSubtitle, { fontStyle: 'italic' }]}>
                    Adresa bude upřesněna
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          )}

          {canGoMobile && (
            <TouchableOpacity
              style={[styles.locationCard, locationType === 'mobile' && styles.locationCardSelected]}
              onPress={() => setLocationType('mobile')}
              activeOpacity={0.7}
            >
              <View style={[styles.locationIcon, locationType === 'mobile' && styles.locationIconSelected]}>
                <Ionicons name="car" size={24} color={locationType === 'mobile' ? Colors.white : Colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Přijede k vám</Text>
                <Text style={styles.optionSubtitle}>Barber přijede na vaši adresu</Text>
              </View>
            </TouchableOpacity>
          )}

          {locationType === 'mobile' && (
            <View style={{ marginTop: Spacing.lg }}>
              <Text style={styles.addressLabel}>Vaše adresa</Text>
              <AddressAutocomplete
                value={customerAddress}
                onChangeText={setCustomerAddress}
                onSelect={(address, lat, lng) => {
                  setCustomerLat(lat);
                  setCustomerLng(lng);
                }}
                placeholder="Začněte psát adresu..."
              />
              <TouchableOpacity
                style={[styles.nextBtn, !customerAddress && styles.nextBtnDisabled]}
                disabled={!customerAddress}
                onPress={() => setStep('note')}
                activeOpacity={0.8}
              >
                <Text style={styles.nextBtnText}>Pokračovat</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.white} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Step 5: Note */}
      {step === 'note' && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Poznámka</Text>
          <Text style={styles.stepHint}>Volitelné - sdělte barberovi cokoliv důležitého</Text>
          <View style={styles.noteInputWrap}>
            <Ionicons name="chatbubble-outline" size={20} color={Colors.textMuted} style={{ marginTop: 2 }} />
            <TextInput
              style={styles.noteInput}
              placeholder="Např. chci to kratší po stranách..."
              placeholderTextColor={Colors.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
            />
          </View>
          <TouchableOpacity style={styles.nextBtn} onPress={() => setStep('confirm')} activeOpacity={0.8}>
            <Text style={styles.nextBtnText}>Pokračovat ke shrnutí</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* Step 6: Confirm */}
      {step === 'confirm' && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Shrnutí rezervace</Text>
          <Text style={styles.stepHint}>Zkontrolujte údaje a potvrďte</Text>

          <View style={styles.summaryCard}>
            <SummaryRow icon="person" label="Barber" value={provider.display_name} />
            <SummaryRow icon="cut" label="Služba" value={selectedService?.name || ''} />
            <SummaryRow
              icon="calendar"
              label="Datum"
              value={selectedDate ? new Date(selectedDate).toLocaleDateString('cs-CZ', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              }) : ''}
            />
            <SummaryRow icon="time" label="Čas" value={selectedTime} />
            <SummaryRow
              icon="location"
              label="Místo"
              value={locationType === 'salon' ? (provider.salon_address || 'Salon') : customerAddress}
            />
            <SummaryRow
              icon="cash"
              label="Cena"
              value={`${selectedService?.price} Kč`}
              accent
              last
            />
            {note ? (
              <SummaryRow icon="chatbubble" label="Poznámka" value={note} last />
            ) : null}
          </View>

          {mutation.isError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color={Colors.error} />
              <Text style={styles.errorText}>
                {(mutation.error as any)?.response?.data?.message || 'Nepodařilo se vytvořit rezervaci. Zkuste to znovu.'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleConfirm}
            disabled={mutation.isPending}
            activeOpacity={0.8}
          >
            {mutation.isPending ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color={Colors.white} />
                <Text style={styles.confirmBtnText}>Potvrdit rezervaci</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  accent,
  last,
}: {
  icon: string;
  label: string;
  value: string;
  accent?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[summaryStyles.row, !last && summaryStyles.rowBorder]}>
      <View style={summaryStyles.labelWrap}>
        <Ionicons name={`${icon}-outline` as any} size={16} color={Colors.textMuted} />
        <Text style={summaryStyles.label}>{label}</Text>
      </View>
      <Text
        style={[summaryStyles.value, accent && { color: Colors.accent, fontWeight: '700' }]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: FontSize.md,
    color: Colors.textLight,
  },
  value: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    maxWidth: '55%',
    textAlign: 'right',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Progress
  progressWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  progressBg: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 6,
    fontWeight: '600',
  },

  stepContainer: { padding: Spacing.lg },
  stepTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  stepHint: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },

  // Option cards
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  optionCardSelected: { borderColor: Colors.accent },
  optionCardDisabled: { opacity: 0.45 },
  serviceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(233, 69, 96, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  optionTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  optionTitleDisabled: { color: Colors.textMuted },
  optionSubtitle: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 2 },
  optionPrice: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.accent },
  closedLabel: {
    fontSize: FontSize.sm,
    color: Colors.error,
    fontWeight: '600',
    fontStyle: 'italic',
  },

  // Time grid
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlot: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  timeSlotSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOpacity: 0.2,
  },
  timeSlotText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  timeSlotTextSelected: { color: Colors.white },
  emptySlots: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyText: { textAlign: 'center', color: Colors.textMuted, fontSize: FontSize.md },

  // Location
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  locationCardSelected: { borderColor: Colors.accent },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(233, 69, 96, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  locationIconSelected: {
    backgroundColor: Colors.accent,
  },
  addressLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },

  // Note
  noteInputWrap: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  noteInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // Buttons
  nextBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },

  // Summary
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  confirmBtn: {
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.xl,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fef2f2',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { flex: 1, fontSize: FontSize.sm, color: Colors.error, lineHeight: 18 },

  // Success
  successContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  successIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  successTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  successSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  successSummary: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: '100%',
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  successIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(233, 69, 96, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successRowText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  successBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.xl,
    paddingVertical: 16,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  successBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
});
