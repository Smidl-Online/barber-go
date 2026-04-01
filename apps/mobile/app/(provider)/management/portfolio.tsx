import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../services/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../constants/theme';
import type { PortfolioImage } from '../../../types/models';

const SCREEN_WIDTH = Dimensions.get('window').width;
const IMAGE_SIZE = (SCREEN_WIDTH - Spacing.md * 3) / 2;

export default function PortfolioScreen() {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');

  const { data: images = [], isLoading } = useQuery<PortfolioImage[]>({
    queryKey: ['provider-portfolio'],
    queryFn: async () => (await api.get('/provider/portfolio')).data,
  });

  const addMutation = useMutation({
    mutationFn: async (data: { image_url: string; caption?: string }) =>
      (await api.post('/provider/portfolio', data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-portfolio'] });
      closeModal();
    },
    onError: (err: any) => {
      Alert.alert('Chyba', err.response?.data?.message || 'Nepodařilo se přidat');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/provider/portfolio/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-portfolio'] });
    },
  });

  const closeModal = () => {
    setModalVisible(false);
    setImageUrl('');
    setCaption('');
  };

  const handleAdd = () => {
    if (!imageUrl.trim()) {
      Alert.alert('Chyba', 'URL obrázku je povinné');
      return;
    }
    addMutation.mutate({
      image_url: imageUrl.trim(),
      caption: caption.trim() || undefined,
    });
  };

  const handleDelete = (id: string) => {
    Alert.alert('Smazat obrázek?', 'Tuto akci nelze vrátit.', [
      { text: 'Zrušit', style: 'cancel' },
      { text: 'Smazat', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={20} color={Colors.white} />
        <Text style={styles.addBtnText}>Přidat obrázek</Text>
      </TouchableOpacity>

      {images.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="images-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Zatím žádné fotky</Text>
          <Text style={styles.emptyHint}>
            Přidejte fotky svých prací, aby zákazníci viděli vaši kvalitu
          </Text>
        </View>
      ) : (
        <FlatList
          data={images}
          numColumns={2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <View style={styles.imageCard}>
              <Image source={{ uri: item.image_url }} style={styles.image} />
              {item.caption && (
                <Text style={styles.caption} numberOfLines={2}>
                  {item.caption}
                </Text>
              )}
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item.id)}
              >
                <Ionicons name="close-circle" size={24} color={Colors.error} />
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.list}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Nový obrázek</Text>

            <Text style={styles.label}>URL obrázku *</Text>
            <TextInput
              style={styles.input}
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="https://example.com/photo.jpg"
              autoCapitalize="none"
              keyboardType="url"
            />

            {imageUrl.trim() !== '' && (
              <Image
                source={{ uri: imageUrl }}
                style={styles.preview}
              />
            )}

            <Text style={styles.label}>Popisek (volitelné)</Text>
            <TextInput
              style={styles.input}
              value={caption}
              onChangeText={setCaption}
              placeholder="např. Pánský fade střih"
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
              <Text style={styles.saveBtnText}>Přidat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtnModal} onPress={closeModal}>
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
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
  emptyHint: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  row: { justifyContent: 'space-between', marginBottom: Spacing.md },
  imageCard: {
    width: IMAGE_SIZE,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    backgroundColor: Colors.background,
  },
  caption: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    padding: Spacing.sm,
  },
  deleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.white,
    borderRadius: 12,
  },
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
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
  },
  preview: {
    width: '100%',
    height: 150,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    backgroundColor: Colors.background,
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },
  cancelBtnModal: { alignItems: 'center', marginTop: Spacing.md, paddingBottom: Spacing.lg },
  cancelBtnText: { color: Colors.textMuted, fontSize: FontSize.md },
});
