import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '../theme/colors';

const tabs = [
  { name: 'Dashboard', route: 'Overview', icon: 'grid-outline', activeIcon: 'grid' },
  { name: 'Inventory', route: 'Inventory', icon: 'cube-outline', activeIcon: 'cube' },
  { name: 'Orders', route: 'Orders', icon: 'cart-outline', activeIcon: 'cart' },
  { name: 'Masters', route: 'ManageMasters', icon: 'school-outline', activeIcon: 'school' },
  { name: 'Add', route: 'AddProduct', icon: 'add-circle-outline', activeIcon: 'add-circle' },
];

export default function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const currentRouteName = state?.routes[state?.index]?.name || 'Overview';
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <View style={[styles.tabBar, { paddingBottom: bottomInset, height: 56 + bottomInset }]}>
      {tabs.map((tab) => {
        const isActive = currentRouteName === tab.route;

        return (
          <Pressable
            key={tab.route}
            style={styles.tabItem}
            onPress={() => {
              if (navigation && !isActive) {
                navigation.navigate(tab.route);
              }
            }}
          >
            <View style={[styles.iconBox, isActive && styles.activeIconBox]}>
              <Ionicons
                name={isActive ? tab.activeIcon : tab.icon}
                size={20}
                color={isActive ? colors.white : colors.textMuted}
              />
            </View>
            <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
              {tab.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.sm,
    paddingTop: 6,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconBox: {
    width: 42,
    height: 28,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  activeIconBox: {
    backgroundColor: colors.navy,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
  },
  activeTabLabel: {
    color: colors.navy,
    fontWeight: '700',
  },
});
