import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import type { AvailabilitySlot } from '../../types/models';

const DAY_NAMES = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];
const DAY_SHORT = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

export default function AvailabilityScreen() {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<AvailabilitySlot | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  const { data: slots = [], isLoading } = useQuery<AvailabilitySlot[]>({
    queryKey: ['provider-availability'],
    queryFn: async () => (await api.get('/provider/availability')).data,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { day_of_week: number; start_time: string; end_time: string }) => {
      if (editing) {
        return (await api.put(`/provider/availability/${editing.id}`, data)).data;
      }
      return (await api.post('/provider/availability', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-availability'] });
      closeModal();
    },
    onError: (err: any) => {
      Alert.alert('Chyba', err.response?.data?.message || 'Nepodařilo se uložit');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/provider/availability/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-availability'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ slot, active }: { slot: AvailabilitySlot; active: boolean }) =>
      (await api.put(`/provider/availability/${slot.id}`, {
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_active: active,
      })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-availability'] });
    },
  });

  const openModal = (slot?: AvailabilitySlot) => {
    if (slot) {
      setEditing(slot);
      setSelectedDay(slot.day_of_week);
      setStartTime(slot.start_time);
      setEndTime(slot.end_time);
    } else {
      setEditing(null);
      setSelectedDay(0);
      setStartTime('09:00');
      setEndTime('17:00');
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditing(null);
  };

  const handleSave = () => {
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      Alert.alert('Chyba', 'Čas musí být ve formátu HH:MM (např. 09:00)');
      return;
    }
    if (startTime >= endTime) {
      Alert.alert('Chyba', 'Konec musí být po začátku');
      return;
    }
    saveMutation.mutate({ day_of_week: selectedDay, start_time: startTime, end_time: endTime });
  };

  const handleDelete = (id: string) => {
    Alert.alert('Smazat?', 'Opravdu chcete smazat tuto dostupnost?', [
      { text: 'Zrušit', style: 'cancel' },
      { text: 'Smazat', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  // Group slots by day
  const slotsByDay = DAY_NAMES.map((name, idx) => ({
    day: idx,
    name,
    short: DAY_SHORT[idx],
    slots: slots.filter((s) => s.day_of_week === idx),
  }));

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
        <Ionicons name="add" size={20} color={Colors.white} />
        <Text style={styles.addBtnText}>Přidat pracovní dobu</Text>
      </TouchableOpacity>

      <FlatList
        data={slotsByDay}
        keyExtractor={(item) => item.day.toString()}
        renderItem={({ item }) => (
          <View style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayName}>{item.name}</Text>
              {item.slots.length === 0 && (
                <Text style={styles.dayOff}>Volno</Text>
              )}
            </View>
            {item.slots.map((slot) => (
              <View key={slot.id} style={styles.slotRow}>
                <Switch
                  value={slot.is_active}
                  onValueChange={(val) => toggleMutation.mutate({ slot, active: val })}
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                  thumbColor={Colors.white}
                />
                <Text style={[styles.slotTime, !slot.is_active && styles.slotInactive]}>
                  {slot.start_time} – {slot.end_time}
                </Text>
                <View style={styles.slotActions}>
                  <TouchableOpacity onPress={() => openModal(slot)}>
                    <Ionicons name="create-outline" size={20} color={Colors.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(slot.id)}>
                    <Ionicons name="trash-outline" size={20} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
        contentContainerStyle={styles.list}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {editing ? 'Upravit dostupnost' : 'Nová dostupnost'}
            </Text>

            <Text style={styles.label}>Den</Text>
            <View style={styles.dayPicker}>
              {DAY_SHORT.map((d, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.dayChip, selectedDay === idx && styles.dayChipActive]}
                  onPress={() => setSelectedDay(idx)}
                >
                  <Text style={[styles.dayChipText, selectedDay === idx && styles.dayChipTextActive]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Začátek (HH:MM)</Text>
            <TextInput
              style={styles.input}
              value={startTime}
              onChangeText={setStartTime}
              placeholder="09:00"
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.label}>Konec (HH:MM)</Text>
            <TextInput
              style={styles.input}
              value={endTime}
              onChangeText={setEndTime}
              placeholder="17:00"
              keyboardType="numbers-and-punctuation"
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Uložit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
              <Text style={styles.cancelBtnText}>Zrušit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    margin: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 6,
  },
  addBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },
  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  dayCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  dayName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  dayOff: { fontSize: FontSize.sm, color: Colors.textMuted, fontStyle: 'italic' },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
    marginTop: Spacing.xs,
  },
  slotTime: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    marginLeft: Spacing.sm,
    fontWeight: '600',
  },
  slotInactive: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  slotActions: { flexDirection: 'row', gap: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.lg },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textLight,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  dayPicker: { flexDirection: 'row', gap: 4 },
  dayChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
  },
  dayChipActive: { backgroundColor: Colors.accent },
  dayChipText: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '600' },
  dayChipTextActive: { color: Colors.white },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },
  cancelBtn: { alignItems: 'center', marginTop: Spacing.md, paddingBottom: Spacing.lg },
  cancelBtnText: { color: Colors.textMuted, fontSize: FontSize.md },
});
