import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../theme/colors';

export default function StatusBadge({ status }) {
  const getBadgeStyle = () => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return { bg: colors.status.pendingBg, text: colors.status.pendingText };
      case 'accepted':
      case 'ready':
      case 'confirmed':
        return { bg: colors.status.readyBg, text: colors.status.readyText };
      case 'completed':
      case 'delivered':
      case 'in stock':
        return { bg: colors.status.deliveredBg, text: colors.status.deliveredText };
      case 'declined':
      case 'cancelled':
      case 'out of stock':
        return { bg: colors.status.cancelledBg, text: colors.status.cancelledText };
      case 'low stock':
        return { bg: colors.status.lowStockBg, text: colors.status.lowStockText };
      default:
        return { bg: colors.borderLight, text: colors.textSecondary };
    }
  };

  const styleConfig = getBadgeStyle();

  return (
    <View style={[styles.badge, { backgroundColor: styleConfig.bg }]}>
      <Text style={[styles.text, { color: styleConfig.text }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
