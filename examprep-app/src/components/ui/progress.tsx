import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { shadcn } from '../../theme';

export interface ProgressProps {
  value: number; // 0 to 100
  style?: ViewStyle | ViewStyle[];
  indicatorStyle?: ViewStyle | ViewStyle[];
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  style,
  indicatorStyle,
}) => {
  const clampedValue = Math.min(100, Math.max(0, value || 0));

  return (
    <View style={[styles.root, style]}>
      <View
        style={[
          styles.indicator,
          { width: `${clampedValue}%` },
          indicatorStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    height: 6,
    width: '100%',
    borderRadius: 9999,
    backgroundColor: shadcn.secondary,
    overflow: 'hidden',
  },
  indicator: {
    height: '100%',
    backgroundColor: shadcn.primary,
    borderRadius: 9999,
  },
});
