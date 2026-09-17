import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, radii, spacing } from '../theme/colors';

/**
 * Base pulsing skeleton block with ultra-smooth native animation
 */
export function SkeletonBlock({ width = '100%', height = 16, borderRadius = 6, style }) {
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.skeletonBase,
        {
          width,
          height,
          borderRadius,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
}

/**
 * Skeleton UI layout for Order Cards in Admin Panel
 */
export function OrderCardSkeleton() {
  return (
    <View style={styles.orderCard}>
      {/* Top Header Row: Order Number, Status Badge & Price, Date */}
      <View style={styles.orderHeaderRow}>
        <View style={styles.rowAlign}>
          <SkeletonBlock width={95} height={22} borderRadius={radii.xs} />
          <SkeletonBlock width={72} height={22} borderRadius={radii.pill} style={{ marginLeft: 8 }} />
        </View>
        <View style={styles.colAlignRight}>
          <SkeletonBlock width={68} height={20} borderRadius={radii.xs} />
          <SkeletonBlock width={80} height={12} borderRadius={4} style={{ marginTop: 5 }} />
        </View>
      </View>

      {/* Customer Info */}
      <View style={styles.customerRow}>
        <SkeletonBlock width={140} height={16} borderRadius={4} />
        <SkeletonBlock width={90} height={13} borderRadius={4} style={{ marginTop: 4 }} />
      </View>

      {/* School Meta */}
      <View style={styles.metaRow}>
        <SkeletonBlock width={16} height={16} borderRadius={radii.pill} />
        <SkeletonBlock width={180} height={13} borderRadius={4} style={{ marginLeft: 6 }} />
      </View>

      {/* Footer Details: Items, PDF Badge & View Link */}
      <View style={styles.cardFooter}>
        <View style={styles.rowAlign}>
          <SkeletonBlock width={16} height={16} borderRadius={radii.pill} />
          <SkeletonBlock width={55} height={13} borderRadius={4} style={{ marginLeft: 6 }} />
        </View>

        <View style={styles.rowAlign}>
          <SkeletonBlock width={52} height={26} borderRadius={radii.sm} style={{ marginRight: 10 }} />
          <SkeletonBlock width={64} height={18} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}

/**
 * Skeleton List for Orders Screen
 */
export function OrdersSkeletonList({ count = 5 }) {
  const items = Array.from({ length: count }, (_, i) => i);
  return (
    <View style={styles.listContainer}>
      {items.map((key) => (
        <OrderCardSkeleton key={key} />
      ))}
    </View>
  );
}

/**
 * Skeleton UI layout for Product Cards in Admin Inventory / Product Page
 */
export function ProductCardSkeleton() {
  return (
    <View style={styles.productCard}>
      <View style={styles.productHeaderRow}>
        {/* Product Image Thumbnail */}
        <SkeletonBlock width={64} height={64} borderRadius={radii.sm} />

        {/* Product Meta Column */}
        <View style={styles.productMetaCol}>
          {/* Top Bar: Title & Status Badge */}
          <View style={styles.productTopBar}>
            <SkeletonBlock width="55%" height={16} borderRadius={4} />
            <SkeletonBlock width={68} height={18} borderRadius={radii.pill} />
          </View>

          {/* School & Class Line */}
          <View style={styles.productSubLine}>
            <SkeletonBlock width={12} height={12} borderRadius={radii.pill} />
            <SkeletonBlock width="65%" height={12} borderRadius={4} style={{ marginLeft: 4 }} />
          </View>

          {/* Category & Price Pills Row */}
          <View style={styles.productPillsRow}>
            <SkeletonBlock width={56} height={18} borderRadius={radii.xs} />
            <SkeletonBlock width={48} height={18} borderRadius={radii.xs} style={{ marginLeft: 6 }} />
            <SkeletonBlock width={45} height={12} borderRadius={4} style={{ marginLeft: 8 }} />
          </View>
        </View>
      </View>

      {/* Tap to Edit / Footer strip */}
      <View style={styles.productFooterStrip}>
        <SkeletonBlock width="50%" height={11} borderRadius={4} />
        <SkeletonBlock width={14} height={14} borderRadius={radii.pill} />
      </View>
    </View>
  );
}

/**
 * Skeleton List for Products / Inventory Screen
 */
export function ProductsSkeletonList({ count = 6 }) {
  const items = Array.from({ length: count }, (_, i) => i);
  return (
    <View style={styles.listContainer}>
      {items.map((key) => (
        <ProductCardSkeleton key={key} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonBase: {
    backgroundColor: '#E2E8F0',
  },
  listContainer: {
    gap: spacing.md,
  },
  // Order Card Skeleton Styles
  orderCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colAlignRight: {
    alignItems: 'flex-end',
  },
  customerRow: {
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm + 2,
    marginTop: 2,
  },
  // Product Card Skeleton Styles
  productCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  productHeaderRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  productMetaCol: {
    flex: 1,
    justifyContent: 'center',
  },
  productTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  productSubLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  productPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  productFooterStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 8,
    marginTop: 10,
  },
});
