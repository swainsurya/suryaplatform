import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { shadcn } from '../../theme';

export interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  style?: ViewStyle | ViewStyle[];
}

export const Separator: React.FC<SeparatorProps> = ({
  orientation = 'horizontal',
  style,
}) => {
  return (
    <View
      style={[
        orientation === 'horizontal' ? styles.horizontal : styles.vertical,
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  horizontal: {
    height: 1,
    width: '100%',
    backgroundColor: shadcn.border,
  },
  vertical: {
    width: 1,
    height: '100%',
    backgroundColor: shadcn.border,
  },
});
