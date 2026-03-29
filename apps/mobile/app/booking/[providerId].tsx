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
import type { ProviderDetail, Service } from '../../types/models';

type Step = 'service' | 'date' | 'time' | 'location' | 'note' | 'confirm' | 'success';

const STEPS: Step[] = ['service', 'date', 'time', 'location', 'note', 'confirm'];

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

  // Build set of working day indices (0=Monday..6=Sunday)
  const workingDays = useMemo(() => {
    if (!provider) return new Set<number>();
    const days = new Set<number>();
    provider.availability.forEach((a) => {
      if (a.is_active) days.add(a.day_of_week);
    });
    return days;
  }, [provider]);

  // Generate next 14 days with availability info
  const dateOptions = useMemo(() => {
    const dates: { date: string; available: boolean }[] = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      // Convert JS getDay (0=Sun) to our format (0=Mon)
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

  // Android hardware back button
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const handler = () => {
      goBack();
      return true; // prevent default
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
              style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -8 }}
            >
              <Ionicons name="chevron-back" size={24} color={Colors.white} />
              <Text style={{ color: Colors.white, fontSize: 17 }}>Zpět</Text>
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
            <Ionicons name="cut-outline" size={18} color={Colors.textLight} />
            <Text style={styles.successRowText}>{selectedService?.name}</Text>
          </View>
          <View style={styles.successRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.textLight} />
            <Text style={styles.successRowText}>
              {selectedDate && new Date(selectedDate).toLocaleDateString('cs-CZ', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </View>
          <View style={styles.successRow}>
            <Ionicons name="time-outline" size={18} color={Colors.textLight} />
            <Text style={styles.successRowText}>{selectedTime}</Text>
          </View>
          <View style={styles.successRow}>
            <Ionicons name="cash-outline" size={18} color={Colors.textLight} />
            <Text style={[styles.successRowText, { color: Colors.accent, fontWeight: '700' }]}>
              {selectedService?.price} Kč
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.successBtn} onPress={() => router.back()}>
          <Text style={styles.successBtnText}>Hotovo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Progress */}
      <View style={styles.progress}>
        {STEPS.map((s, i) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              step === s && styles.progressDotActive,
              STEPS.indexOf(step) > i && styles.progressDotDone,
            ]}
          />
        ))}
      </View>

      {/* Step 1: Service */}
      {step === 'service' && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Vyberte službu</Text>
          {provider.services.map((svc) => (
            <TouchableOpacity
              key={svc.id}
              style={[styles.optionCard, selectedService?.id === svc.id && styles.optionCardSelected]}
              onPress={() => {
                setSelectedService(svc);
                setStep('date');
              }}
            >
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
              >
                <Text style={[styles.optionTitle, !available && styles.optionTitleDisabled]}>
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
          {slotsLoading ? (
            <ActivityIndicator size="large" color={Colors.accent} />
          ) : slots.length === 0 ? (
            <Text style={styles.emptyText}>Žádné volné termíny pro tento den</Text>
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

          {canGoSalon && (
            <TouchableOpacity
              style={[styles.optionCard, locationType === 'salon' && styles.optionCardSelected]}
              onPress={() => {
                setLocationType('salon');
                setStep('note');
              }}
            >
              <Ionicons name="business" size={24} color={Colors.accent} />
              <View style={{ marginLeft: Spacing.md, flex: 1 }}>
                <Text style={styles.optionTitle}>V salonu</Text>
                {provider.salon_address ? (
                  <Text style={styles.optionSubtitle}>{provider.salon_address}</Text>
                ) : (
                  <Text style={[styles.optionSubtitle, { fontStyle: 'italic' }]}>
                    Adresa bude upřesněna
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}

          {canGoMobile && (
            <TouchableOpacity
              style={[styles.optionCard, locationType === 'mobile' && styles.optionCardSelected]}
              onPress={() => setLocationType('mobile')}
            >
              <Ionicons name="car" size={24} color={Colors.accent} />
              <View style={{ marginLeft: Spacing.md, flex: 1 }}>
                <Text style={styles.optionTitle}>Přijede k vám</Text>
                <Text style={styles.optionSubtitle}>Barber přijede na vaši adresu</Text>
              </View>
            </TouchableOpacity>
          )}

          {locationType === 'mobile' && (
            <View style={{ marginTop: Spacing.md }}>
              <TextInput
                style={styles.input}
                placeholder="Vaše adresa"
                value={customerAddress}
                onChangeText={setCustomerAddress}
              />
              <TouchableOpacity
                style={[styles.nextBtn, !customerAddress && styles.nextBtnDisabled]}
                disabled={!customerAddress}
                onPress={() => setStep('note')}
              >
                <Text style={styles.nextBtnText}>Pokračovat</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      )}

      {/* Step 5: Note */}
      {step === 'note' && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Poznámka (volitelné)</Text>
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
            placeholder="Cokoliv, co by měl barber vědět..."
            value={note}
            onChangeText={setNote}
            multiline
          />
          <TouchableOpacity style={styles.nextBtn} onPress={() => setStep('confirm')}>
            <Text style={styles.nextBtnText}>Pokračovat ke shrnutí</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 6: Confirm */}
      {step === 'confirm' && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Shrnutí rezervace</Text>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Barber</Text>
              <Text style={styles.summaryValue}>{provider.display_name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Služba</Text>
              <Text style={styles.summaryValue}>{selectedService?.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Datum</Text>
              <Text style={styles.summaryValue}>
                {selectedDate && new Date(selectedDate).toLocaleDateString('cs-CZ')}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Čas</Text>
              <Text style={styles.summaryValue}>{selectedTime}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Místo</Text>
              <Text style={styles.summaryValue}>
                {locationType === 'salon' ? 'Salon' : customerAddress}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cena</Text>
              <Text style={[styles.summaryValue, { color: Colors.accent, fontWeight: '700' }]}>
                {selectedService?.price} Kč
              </Text>
            </View>
            {note ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Poznámka</Text>
                <Text style={styles.summaryValue}>{note}</Text>
              </View>
            ) : null}
          </View>

          {mutation.isError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={Colors.error} />
              <Text style={styles.errorText}>
                {(mutation.error as any)?.response?.data?.message || 'Nepodařilo se vytvořit rezervaci. Zkuste to znovu.'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleConfirm}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.confirmBtnText}>Potvrdit rezervaci</Text>
            )}
          </TouchableOpacity>

        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  progressDotActive: { backgroundColor: Colors.accent, width: 20 },
  progressDotDone: { backgroundColor: Colors.success },
  stepContainer: { padding: Spacing.lg },
  stepTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: { borderColor: Colors.accent },
  optionCardDisabled: { opacity: 0.45 },
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
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeSlotSelected: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  timeSlotText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  timeSlotTextSelected: { color: Colors.white },
  emptyText: { textAlign: 'center', color: Colors.textMuted, fontSize: FontSize.md },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nextBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  summaryLabel: { fontSize: FontSize.md, color: Colors.textLight },
  summaryValue: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, maxWidth: '60%', textAlign: 'right' },
  confirmBtn: {
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  confirmBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { flex: 1, fontSize: FontSize.sm, color: Colors.error },
  // Success screen
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
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    marginBottom: Spacing.lg,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  successRowText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  successBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
  },
  successBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
});
