import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  light?: boolean;
}

const SIZES = {
  sm: { icon: 20, title: 22, subtitle: 10 },
  md: { icon: 28, title: 30, subtitle: 12 },
  lg: { icon: 40, title: 44, subtitle: 15 },
};

export default function Logo({ size = 'lg', light = true }: LogoProps) {
  const s = SIZES[size];
  const color = light ? '#ffffff' : '#1a1a2e';
  const accentColor = '#e94560';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { width: s.icon * 1.6, height: s.icon * 1.6, borderRadius: s.icon * 0.4 }]}>
          <Ionicons name="cut" size={s.icon} color="#ffffff" />
        </View>
        <Text style={[styles.title, { fontSize: s.title, color }]}>
          Barber<Text style={{ color: accentColor }}>Go</Text>
        </Text>
      </View>
      {size === 'lg' && (
        <Text style={[styles.subtitle, { fontSize: s.subtitle, color: light ? 'rgba(255,255,255,0.7)' : '#666666' }]}>
          Najdi svého barbera. Kdekoli. Kdykoli.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
});
