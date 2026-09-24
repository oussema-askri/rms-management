import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { STATUS_COLORS } from '../../constants/config';

const StatusBadge = ({ status }) => {
  const config = STATUS_COLORS[status] || {
    bg: '#F5F5F5',
    text: '#666666',
    label: status,
  };

  // Map dot colors by status
  const dotColors = {
    pending: '#C26B1E',
    in_progress: '#2D5F9A',
    completed: '#27976A',
    cancelled: '#B53535',
  };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: dotColors[status] || config.text }]} />
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});

export default StatusBadge;
