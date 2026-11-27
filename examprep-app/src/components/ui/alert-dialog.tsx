import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Button, ButtonProps } from './button';
import { useTheme } from '../../theme';

export interface AlertDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  open,
  onOpenChange,
  children,
}) => {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange?.(false)}
    >
      <TouchableWithoutFeedback onPress={() => onOpenChange?.(false)}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.contentContainer}>{children}</View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export interface AlertDialogContentProps {
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
}

export const AlertDialogContent: React.FC<AlertDialogContentProps> = ({
  style,
  children,
}) => {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export interface AlertDialogHeaderProps {
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
}

export const AlertDialogHeader: React.FC<AlertDialogHeaderProps> = ({
  style,
  children,
}) => {
  return <View style={[styles.header, style]}>{children}</View>;
};

export interface AlertDialogTitleProps {
  style?: TextStyle | TextStyle[];
  children: React.ReactNode;
}

export const AlertDialogTitle: React.FC<AlertDialogTitleProps> = ({
  style,
  children,
}) => {
  const { theme } = useTheme();
  return <Text style={[styles.title, { color: theme.cardForeground }, style]}>{children}</Text>;
};

export interface AlertDialogDescriptionProps {
  style?: TextStyle | TextStyle[];
  children: React.ReactNode;
}

export const AlertDialogDescription: React.FC<AlertDialogDescriptionProps> = ({
  style,
  children,
}) => {
  const { theme } = useTheme();
  return (
    <Text style={[styles.description, { color: theme.mutedForeground }, style]}>
      {children}
    </Text>
  );
};

export interface AlertDialogFooterProps {
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
}

export const AlertDialogFooter: React.FC<AlertDialogFooterProps> = ({
  style,
  children,
}) => {
  return <View style={[styles.footer, style]}>{children}</View>;
};

export type AlertDialogActionProps = ButtonProps;

export const AlertDialogAction: React.FC<AlertDialogActionProps> = ({
  children,
  ...props
}) => {
  return (
    <Button variant="default" style={styles.actionButton} {...props}>
      {children}
    </Button>
  );
};

export type AlertDialogCancelProps = ButtonProps;

export const AlertDialogCancel: React.FC<AlertDialogCancelProps> = ({
  children,
  ...props
}) => {
  return (
    <Button variant="outline" style={styles.cancelButton} {...props}>
      {children}
    </Button>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 11, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 380,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    gap: 16,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
  cancelButton: {
    flex: 1,
  },
});
