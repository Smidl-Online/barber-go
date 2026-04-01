import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import type { Service } from '../../../types/models';

export default function ServicesScreen() {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ['provider-services'],
    queryFn: async () => (await api.get('/provider/services')).data,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingService) {
        return (await api.put(`/provider/services/${editingService.id}`, data)).data;
      }
      return (await api.post('/provider/services', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-services'] });
      closeModal();
    },
    onError: (err: any) => {
      Alert.alert('Chyba', err.response?.data?.message || 'Nepodařilo se uložit');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/provider/services/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-services'] });
    },
  });

  const openModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setName(service.name);
      setDescription(service.description || '');
      setDuration(service.duration_minutes.toString());
      setPrice(service.price.toString());
    } else {
      setEditingService(null);
      setName('');
      setDescription('');
      setDuration('');
      setPrice('');
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingService(null);
  };

  const handleSave = () => {
    if (!name || !duration || !price) {
      Alert.alert('Chyba', 'Vyplňte název, délku a cenu');
      return;
    }
    saveMutation.mutate({
      name,
      description: description || undefined,
      duration_minutes: parseInt(duration),
      price: parseFloat(price),
    });
  };

  const handleDelete = (id: string) => {
    Alert.alert('Smazat službu?', 'Tuto akci nelze vrátit.', [
      { text: 'Zrušit', style: 'cancel' },
      { text: 'Smazat', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
        <Ionicons name="add" size={20} color={Colors.white} />
        <Text style={styles.addBtnText}>Přidat službu</Text>
      </TouchableOpacity>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.accent} />
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardInfo}>
                <Text style={styles.serviceName}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.serviceDesc}>{item.description}</Text>
                )}
                <Text style={styles.serviceMeta}>
                  {item.duration_minutes} min · {item.price} Kč
                </Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => openModal(item)}>
                  <Ionicons name="create-outline" size={22} color={Colors.accent} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Ionicons name="trash-outline" size={22} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={styles.list}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {editingService ? 'Upravit službu' : 'Nová služba'}
            </Text>

            <TextInput style={styles.input} placeholder="Název" value={name} onChangeText={setName} />
            <TextInput
              style={styles.input}
              placeholder="Popis (volitelné)"
              value={description}
              onChangeText={setDescription}
            />
            <TextInput
              style={styles.input}
              placeholder="Délka (min)"
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Cena (Kč)"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
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
  list: { paddingHorizontal: Spacing.md },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardInfo: { flex: 1 },
  serviceName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  serviceDesc: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 2 },
  serviceMeta: { fontSize: FontSize.sm, color: Colors.accent, fontWeight: '600', marginTop: 4 },
  cardActions: { justifyContent: 'center', gap: 12 },
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
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    marginBottom: Spacing.sm,
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },
  cancelBtn: { alignItems: 'center', marginTop: Spacing.md, paddingBottom: Spacing.lg },
  cancelBtnText: { color: Colors.textMuted, fontSize: FontSize.md },
});
