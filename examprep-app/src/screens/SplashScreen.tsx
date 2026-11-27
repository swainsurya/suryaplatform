import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(0.9));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      onFinish();
    }, 2200);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, onFinish]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1E1B4B', '#0F172A']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Glow Logo Card */}
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={[colors.primaryContainer, colors.secondary]}
            style={styles.logoCircle}
          >
            <Ionicons name="shield-checkmark" size={48} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.proctorBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.proctorBadgeText}>SECURE AI</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>ExamPrep</Text>
        <Text style={styles.subtitle}>Student Assessment Suite</Text>

        {/* System Capabilities Pills */}
        <View style={styles.capsuleGroup}>
          <View style={styles.capsule}>
            <Ionicons name="phone-portrait-outline" size={13} color={colors.tertiaryFixedDim} />
            <Text style={styles.capsuleText}>Android 7+ Compatible</Text>
          </View>
          <View style={styles.capsule}>
            <Ionicons name="lock-closed-outline" size={13} color={colors.tertiaryFixedDim} />
            <Text style={styles.capsuleText}>Native Kiosk Guard</Text>
          </View>
        </View>

        {/* Loading Indicator */}
        <View style={styles.loadingRow}>
          <View style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>Connecting Surya Cloud...</Text>
        </View>
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by SuryaPlatform</Text>
        <Text style={styles.versionText}>v1.0.0 • Mobile Native</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 12,
  },
  proctorBadge: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: colors.tertiaryFixedDim,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.tertiaryFixedDim,
  },
  proctorBadgeText: {
    color: colors.tertiaryFixedDim,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: 24,
  },
  capsuleGroup: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  capsuleText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingSpinner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.tertiaryFixedDim,
    borderTopColor: 'transparent',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    alignItems: 'center',
  },
  footerText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  versionText: {
    color: '#475569',
    fontSize: 10,
    marginTop: 2,
  },
});
