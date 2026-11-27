import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../theme';

export interface CardProps {
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ style, children }) => {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export interface CardHeaderProps {
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ style, children }) => {
  return <View style={[styles.cardHeader, style]}>{children}</View>;
};

export interface CardTitleProps {
  style?: TextStyle | TextStyle[];
  children: React.ReactNode;
}

export const CardTitle: React.FC<CardTitleProps> = ({ style, children }) => {
  const { theme } = useTheme();
  return (
    <Text style={[styles.cardTitle, { color: theme.cardForeground }, style]}>
      {children}
    </Text>
  );
};

export interface CardDescriptionProps {
  style?: TextStyle | TextStyle[];
  children: React.ReactNode;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({
  style,
  children,
}) => {
  const { theme } = useTheme();
  return (
    <Text style={[styles.cardDescription, { color: theme.mutedForeground }, style]}>
      {children}
    </Text>
  );
};

export interface CardContentProps {
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({ style, children }) => {
  return <View style={[styles.cardContent, style]}>{children}</View>;
};

export interface CardFooterProps {
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
}

export const CardFooter: React.FC<CardFooterProps> = ({ style, children }) => {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.cardFooter,
        { borderTopColor: theme.border },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 14,
    gap: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardContent: {
    gap: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
