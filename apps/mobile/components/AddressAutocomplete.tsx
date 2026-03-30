import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';

interface AddressResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelect?: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
}

export default function AddressAutocomplete({
  value,
  onChangeText,
  onSelect,
  placeholder = 'Zadejte adresu...',
}: AddressAutocompleteProps) {
  const [results, setResults] = useState<AddressResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '5',
        countrycodes: 'cz,sk',
        'accept-language': 'cs',
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        {
          headers: {
            'User-Agent': 'BarberGo/1.0',
          },
        }
      );
      const data: AddressResult[] = await response.json();
      setResults(data);
      setShowResults(data.length > 0);
    } catch {
      setResults([]);
      setShowResults(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTextChange = (text: string) => {
    onChangeText(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAddress(text), 400);
  };

  const handleSelect = (item: AddressResult) => {
    const shortAddress = item.display_name.split(',').slice(0, 3).join(',');
    onChangeText(shortAddress);
    setShowResults(false);
    setResults([]);
    onSelect?.(shortAddress, parseFloat(item.lat), parseFloat(item.lon));
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrap}>
        <Ionicons name="location-outline" size={20} color={Colors.accent} style={styles.icon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          onFocus={() => results.length > 0 && setShowResults(true)}
        />
        {loading && <ActivityIndicator size="small" color={Colors.accent} style={styles.loader} />}
        {value.length > 0 && !loading && (
          <TouchableOpacity
            onPress={() => {
              onChangeText('');
              setResults([]);
              setShowResults(false);
            }}
            style={styles.clearBtn}
          >
            <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {showResults && (
        <View style={styles.resultsList}>
          {results.map((item) => (
            <TouchableOpacity
              key={item.place_id}
              style={styles.resultItem}
              onPress={() => handleSelect(item)}
            >
              <Ionicons name="location" size={16} color={Colors.accent} />
              <Text style={styles.resultText} numberOfLines={2}>
                {item.display_name}
              </Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.attribution}>OpenStreetMap</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 10,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  loader: {
    marginLeft: Spacing.sm,
  },
  clearBtn: {
    marginLeft: Spacing.sm,
    padding: 4,
  },
  resultsList: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  resultText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 18,
  },
  attribution: {
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: 'right',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
});
