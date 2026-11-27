import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  ViewStyle,
  StyleProp,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

// ==========================================
// 1. Sleek Spinner Loader
// ==========================================
export interface SpinnerProps {
  size?: 'sm' | 'default' | 'lg';
  color?: string;
  label?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'default',
  color,
  label,
  style,
  textStyle,
}) => {
  const { theme } = useTheme();
  const spinColor = color || theme.foreground;
  const [spinAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 850,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const iconSizes = {
    sm: 16,
    default: 22,
    lg: 32,
  };

  return (
    <View style={[styles.spinnerContainer, style]}>
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Ionicons
          name="sync"
          size={iconSizes[size]}
          color={spinColor}
        />
      </Animated.View>
      {label && (
        <Text style={[styles.spinnerLabel, { color: spinColor }, textStyle]}>
          {label}
        </Text>
      )}
    </View>
  );
};

// ==========================================
// 2. Pulse Skeleton Placeholder
// ==========================================
export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 6,
  style,
}) => {
  const { isDark } = useTheme();
  const [pulseAnim] = useState(() => new Animated.Value(0.35));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          backgroundColor: isDark ? '#27272A' : '#E4E4E7',
          width: width as any,
          height: height as any,
          borderRadius,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
};

// ==========================================
// 3. Smooth Fade-In Page/Tab Transition
// ==========================================
export interface FadeInProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  transitionKey?: string | number;
  style?: StyleProp<ViewStyle>;
}

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  duration = 240,
  delay = 0,
  transitionKey,
  style,
}) => {
  const [opacityAnim] = useState(() => new Animated.Value(0));
  const [translateYAnim] = useState(() => new Animated.Value(6));

  useEffect(() => {
    opacityAnim.setValue(0);
    translateYAnim.setValue(6);

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [transitionKey, duration, delay, opacityAnim, translateYAnim]);

  return (
    <Animated.View
      style={[
        {
          opacity: opacityAnim,
          transform: [{ translateY: translateYAnim }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  spinnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  spinnerLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  skeleton: {
    backgroundColor: '#E4E4E7',
  },
});
