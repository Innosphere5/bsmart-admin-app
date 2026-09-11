import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radii, typography } from '../theme/colors';

export default function AdminHeader({
  title = "B'Smart Admin",
  hasNotificationBadge = true,
  notificationCount = 0,
  onNotificationPress,
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, height: 56 + insets.top }]}>
      {/* Left spacer for balanced layout */}
      <View style={styles.spacer} />

      <View style={styles.titleWrap}>
        <Image
          source={require('../../assets/logo.jpg')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.title}>{title}</Text>
      </View>

      <Pressable hitSlop={12} onPress={onNotificationPress} style={styles.iconBtn}>
        <View style={styles.bellWrap}>
          <Ionicons name="notifications-outline" size={22} color={colors.navy} />
          {notificationCount > 0 ? (
            <View style={styles.numberBadge}>
              <Text style={styles.numberBadgeText}>
                {notificationCount > 9 ? '9+' : notificationCount}
              </Text>
            </View>
          ) : hasNotificationBadge ? (
            <View style={styles.redBadgeDot} />
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  spacer: {
    width: 32,
    height: 32,
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  title: {
    ...typography.h2,
    color: colors.navy,
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: -0.3,
  },
  bellWrap: {
    position: 'relative',
  },
  redBadgeDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.red,
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  numberBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  numberBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
