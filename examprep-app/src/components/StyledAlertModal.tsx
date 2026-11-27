import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme';

export type AlertType = 'warning' | 'danger' | 'info' | 'success' | 'kiosk';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface AlertOptions {
  title: string;
  message: string;
  type?: AlertType;
  buttons?: AlertButton[];
}

export interface StyledAlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  type?: AlertType;
  buttons?: AlertButton[];
  onClose: () => void;
}

export const StyledAlertModal: React.FC<StyledAlertModalProps> = ({
  visible,
  title,
  message,
  type = 'info',
  buttons = [{ text: 'OK' }],
  onClose,
}) => {
  const { theme, isDark } = useTheme();

  React.useEffect(() => {
    if (visible) {
      try {
        if (type === 'danger' || type === 'warning') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else if (type === 'success') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } catch {}
    }
  }, [visible, type]);

  if (!visible) return null;

  const getThemeProps = () => {
    switch (type) {
      case 'danger':
        return {
          icon: 'alert-circle' as const,
          iconColor: '#EF4444',
          iconBg: isDark ? '#450A0A' : '#FEE2E2',
          badgeText: 'SECURITY ALERT',
          badgeColor: isDark ? '#FCA5A5' : '#B91C1C',
          badgeBg: isDark ? '#450A0A' : '#FEE2E2',
        };
      case 'warning':
        return {
          icon: 'warning' as const,
          iconColor: '#F59E0B',
          iconBg: isDark ? '#451A03' : '#FEF3C7',
          badgeText: 'WARNING',
          badgeColor: isDark ? '#FCD34D' : '#B45309',
          badgeBg: isDark ? '#451A03' : '#FEF3C7',
        };
      case 'kiosk':
        return {
          icon: 'lock-closed' as const,
          iconColor: '#6366F1',
          iconBg: isDark ? '#1E1B4B' : '#E0E7FF',
          badgeText: 'KIOSK ENFORCEMENT',
          badgeColor: isDark ? '#A5B4FC' : '#4338CA',
          badgeBg: isDark ? '#1E1B4B' : '#E0E7FF',
        };
      case 'success':
        return {
          icon: 'checkmark-circle' as const,
          iconColor: '#10B981',
          iconBg: isDark ? '#052E16' : '#DCFCE7',
          badgeText: 'CONFIRMED',
          badgeColor: isDark ? '#86EFAC' : '#15803D',
          badgeBg: isDark ? '#052E16' : '#DCFCE7',
        };
      case 'info':
      default:
        return {
          icon: 'information-circle' as const,
          iconColor: '#3B82F6',
          iconBg: isDark ? '#172554' : '#EFF6FF',
          badgeText: 'NOTICE',
          badgeColor: isDark ? '#93C5FD' : '#1D4ED8',
          badgeBg: isDark ? '#172554' : '#EFF6FF',
        };
    }
  };

  const themeProps = getThemeProps();

  const handleButtonPress = (btn: AlertButton) => {
    onClose();
    if (btn.onPress) {
      setTimeout(() => {
        btn.onPress!();
      }, 50);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              {/* Header Icon & Badge */}
              <View style={styles.header}>
                <View style={[styles.iconCircle, { backgroundColor: themeProps.iconBg }]}>
                  <Ionicons name={themeProps.icon} size={28} color={themeProps.iconColor} />
                </View>
                <View style={[styles.badge, { backgroundColor: themeProps.badgeBg }]}>
                  <Text style={[styles.badgeText, { color: themeProps.badgeColor }]}>
                    {themeProps.badgeText}
                  </Text>
                </View>
              </View>

              {/* Title & Content */}
              <View style={styles.body}>
                <Text style={[styles.title, { color: theme.foreground }]}>{title}</Text>
                <Text style={[styles.message, { color: theme.mutedForeground }]}>{message}</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                {buttons.map((btn, index) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestructive = btn.style === 'destructive';
                  const isPrimary = !isCancel && !isDestructive;

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        isCancel && [styles.cancelButton, { backgroundColor: theme.secondary }],
                        isDestructive && styles.destructiveButton,
                        isPrimary && [styles.primaryButton, { backgroundColor: theme.primary }],
                      ]}
                      activeOpacity={0.8}
                      onPress={() => handleButtonPress(btn)}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          isCancel && [styles.cancelButtonText, { color: theme.secondaryForeground }],
                          isDestructive && styles.destructiveButtonText,
                          isPrimary && [styles.primaryButtonText, { color: theme.primaryForeground }],
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  body: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cancelButton: {},
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  destructiveButton: {
    backgroundColor: '#EF4444',
  },
  destructiveButtonText: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '700',
  },
  primaryButton: {},
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
