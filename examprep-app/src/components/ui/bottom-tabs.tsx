import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';

export type TabKey = 'exams' | 'results' | 'profile';

export interface TabItem {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  badge?: number;
}

export interface BottomTabsProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  examsBadge?: number;
  resultsBadge?: number;
}

export const BottomTabs: React.FC<BottomTabsProps> = ({
  activeTab,
  onTabChange,
  examsBadge,
  resultsBadge,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);
  const barHeight = 56 + bottomPadding;

  const tabs: TabItem[] = [
    {
      key: 'exams',
      label: 'Exams',
      icon: 'book-outline',
      activeIcon: 'book',
      badge: examsBadge,
    },
    {
      key: 'results',
      label: 'Results',
      icon: 'ribbon-outline',
      activeIcon: 'ribbon',
      badge: resultsBadge,
    },
    {
      key: 'profile',
      label: 'Profile',
      icon: 'person-outline',
      activeIcon: 'person',
    },
  ];

  const handleTabPress = (key: TabKey) => {
    if (key === activeTab) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onTabChange(key);
  };

  return (
    <View
      style={[
        styles.container,
        {
          height: barHeight,
          paddingBottom: bottomPadding,
          backgroundColor: theme.card,
          borderTopColor: theme.border,
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, isActive && styles.tabButtonActive]}
            onPress={() => handleTabPress(tab.key)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            {isActive && <View style={[styles.activeBar, { backgroundColor: theme.primary }]} />}
            <View style={styles.iconWrapper}>
              <Ionicons
                name={isActive ? tab.activeIcon : tab.icon}
                size={22}
                color={isActive ? theme.primary : theme.mutedForeground}
              />
              {tab.badge !== undefined && tab.badge > 0 && (
                <View style={[styles.badgeIndicator, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.badgeText, { color: theme.primaryForeground }]}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                isActive
                  ? [styles.tabLabelActive, { color: theme.foreground }]
                  : [styles.tabLabelInactive, { color: theme.mutedForeground }],
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 6,
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    gap: 3,
  },
  tabButtonActive: {},
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIndicator: {
    position: 'absolute',
    top: -4,
    right: -8,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  tabLabel: {
    fontSize: 11,
  },
  tabLabelActive: {
    fontWeight: '800',
  },
  tabLabelInactive: {
    fontWeight: '500',
  },
  activeBar: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 2.5,
    borderRadius: 2,
  },
});
