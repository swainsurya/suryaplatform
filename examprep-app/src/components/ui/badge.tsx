import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../theme';

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  style,
  textStyle,
}) => {
  const { theme, isDark } = useTheme();

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'secondary':
        return { backgroundColor: theme.secondary };
      case 'destructive':
        return { backgroundColor: isDark ? '#450A0A' : '#FEE2E2' };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.border,
        };
      case 'success':
        return { backgroundColor: isDark ? '#052E16' : '#DCFCE7' };
      case 'default':
      default:
        return { backgroundColor: theme.primary };
    }
  };

  const getVariantTextStyle = (): TextStyle => {
    switch (variant) {
      case 'secondary':
        return { color: theme.secondaryForeground };
      case 'destructive':
        return { color: isDark ? '#FCA5A5' : '#B91C1C' };
      case 'outline':
        return { color: theme.foreground };
      case 'success':
        return { color: isDark ? '#86EFAC' : '#15803D' };
      case 'default':
      default:
        return { color: theme.primaryForeground };
    }
  };

  const renderChildren = () => {
    return React.Children.map(children, (child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return (
          <Text style={[styles.baseText, getVariantTextStyle(), textStyle]}>
            {child}
          </Text>
        );
      }
      return child;
    });
  };

  return (
    <View style={[styles.base, getVariantStyle(), style]}>
      {renderChildren()}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 20,
    gap: 4,
  },
  baseText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
