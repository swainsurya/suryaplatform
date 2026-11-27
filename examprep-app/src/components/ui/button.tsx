import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  TouchableOpacityProps,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';

export type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link';

export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  isLoading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  haptic?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'default',
  children,
  isLoading = false,
  style,
  textStyle,
  disabled,
  onPress,
  haptic = true,
  ...props
}) => {
  const { theme } = useTheme();

  const handlePress = (e: any) => {
    if (disabled || isLoading) return;
    if (haptic) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    if (onPress) {
      onPress(e);
    }
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'destructive':
        return { backgroundColor: theme.destructive };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.border,
        };
      case 'secondary':
        return { backgroundColor: theme.secondary };
      case 'ghost':
        return { backgroundColor: 'transparent' };
      case 'link':
        return {
          backgroundColor: 'transparent',
          paddingHorizontal: 0,
          paddingVertical: 0,
          height: 'auto' as any,
        };
      case 'default':
      default:
        return { backgroundColor: theme.primary };
    }
  };

  const getVariantTextStyle = (): TextStyle => {
    switch (variant) {
      case 'destructive':
        return { color: theme.destructiveForeground };
      case 'outline':
        return { color: theme.foreground };
      case 'secondary':
        return { color: theme.secondaryForeground };
      case 'ghost':
        return { color: theme.foreground };
      case 'link':
        return {
          color: theme.primary,
          textDecorationLine: 'underline',
        };
      case 'default':
      default:
        return { color: theme.primaryForeground };
    }
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'sm':
        return styles.sizeSm;
      case 'lg':
        return styles.sizeLg;
      case 'icon':
        return styles.sizeIcon;
      case 'default':
      default:
        return styles.sizeDefault;
    }
  };

  const getSizeTextStyle = (): TextStyle => {
    switch (size) {
      case 'sm':
        return styles.textSizeSm;
      case 'lg':
        return styles.textSizeLg;
      case 'icon':
      case 'default':
      default:
        return styles.textSizeDefault;
    }
  };

  const renderContent = () => {
    if (isLoading) {
      const indicatorColor =
        variant === 'default' || variant === 'destructive'
          ? theme.primaryForeground
          : theme.foreground;
      return <ActivityIndicator size="small" color={indicatorColor} />;
    }

    return React.Children.map(children, (child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return (
          <Text
            style={[
              styles.baseText,
              getVariantTextStyle(),
              getSizeTextStyle(),
              textStyle,
            ]}
          >
            {child}
          </Text>
        );
      }
      return child;
    });
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        getVariantStyle(),
        getSizeStyle(),
        disabled && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  baseText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  sizeDefault: {
    height: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sizeSm: {
    height: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sizeLg: {
    height: 52,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  sizeIcon: {
    width: 44,
    height: 44,
    padding: 0,
  },
  textSizeDefault: {
    fontSize: 14,
    fontWeight: '600',
  },
  textSizeSm: {
    fontSize: 12,
    fontWeight: '600',
  },
  textSizeLg: {
    fontSize: 16,
    fontWeight: '700',
  },
});
