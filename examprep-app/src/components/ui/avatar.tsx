import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '../../theme';

export interface AvatarProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export const Avatar: React.FC<AvatarProps> = ({
  size = 36,
  style,
  children,
}) => {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.secondary,
          borderColor: theme.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export interface AvatarFallbackProps {
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
  text?: string;
}

export const AvatarFallback: React.FC<AvatarFallbackProps> = ({
  style,
  children,
  text,
}) => {
  const { theme } = useTheme();
  return (
    <Text style={[styles.fallbackText, { color: theme.secondaryForeground }, style]}>
      {text || children}
    </Text>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },
  fallbackText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
