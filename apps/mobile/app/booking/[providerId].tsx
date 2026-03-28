import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProvider, getProviderAvailability } from '../../services/providers';
import { createBooking } from '../../services/bookings';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import type { ProviderDetail, Service } from '../../types/models';

type Step = 'service' | 'date' | 'time' | 'location' | 'note' | 'confirm';

export default function BookingScreen() {
  const { providerId } = useLocalSearchParams<{ providerId: string }>();
  const router = useRouter();
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
      Alert.alert('Úspěch', 'Rezervace byla vytvořena! Čeká na potvrzení barberem.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Chyba', err.response?.data?.message || 'Nepodařilo se vytvořit rezervaci');
    },
  });

  // Generate next 14 days
  const dateOptions = useMemo(() => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, []);

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

  const canGoMobile = provider?.location_type === 'mobile' || provider?.location_type === 'both';
  const canGoSalon = provider?.location_type === 'salon' || provider?.location_type === 'both';

  if (!provider) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Progress */}
      <View style={styles.progress}>
        {(['service', 'date', 'time', 'location', 'note', 'confirm'] as Step[]).map((s, i) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              step === s && styles.progressDotActive,
              (['service', 'date', 'time', 'location', 'note', 'confirm'] as Step[]).indexOf(step) > i &&
                styles.progressDotDone,
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
          {dateOptions.map((date) => {
            const d = new Date(date);
            const label = d.toLocaleDateString('cs-CZ', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            });
            return (
              <TouchableOpacity
                key={date}
                style={[styles.optionCard, selectedDate === date && styles.optionCardSelected]}
                onPress={() => {
                  setSelectedDate(date);
                  setSelectedTime('');
                  setStep('time');
                }}
              >
                <Text style={styles.optionTitle}>{label}</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep('service')}>
            <Text style={styles.backBtnText}>Zpět</Text>
          </TouchableOpacity>
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
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep('date')}>
            <Text style={styles.backBtnText}>Zpět</Text>
          </TouchableOpacity>
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
                <Text style={styles.optionSubtitle}>{provider.salon_address || 'Adresa salonu'}</Text>
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

          <TouchableOpacity style={styles.backBtn} onPress={() => setStep('time')}>
            <Text style={styles.backBtnText}>Zpět</Text>
          </TouchableOpacity>
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
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep('location')}>
            <Text style={styles.backBtnText}>Zpět</Text>
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

          <TouchableOpacity style={styles.backBtn} onPress={() => setStep('note')}>
            <Text style={styles.backBtnText}>Zpět</Text>
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
  optionTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  optionSubtitle: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 2 },
  optionPrice: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.accent },
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
  backBtn: { alignItems: 'center', marginTop: Spacing.md },
  backBtnText: { color: Colors.accent, fontSize: FontSize.md },
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
});
