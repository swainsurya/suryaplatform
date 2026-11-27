import React, { useState } from 'react';
import {
  TextInput,
  StyleSheet,
  TextInputProps,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../theme';

export interface InputProps extends TextInputProps {
  style?: TextStyle | TextStyle[];
}

export const Input: React.FC<InputProps> = ({
  style,
  onFocus,
  onBlur,
  placeholderTextColor,
  ...props
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState<boolean>(false);

  return (
    <TextInput
      style={[
        styles.input,
        {
          backgroundColor: theme.card,
          borderColor: isFocused ? theme.ring : theme.input,
          color: theme.foreground,
        },
        isFocused && styles.inputFocused,
        props.editable === false && [styles.inputDisabled, { backgroundColor: theme.muted }],
        style,
      ]}
      placeholderTextColor={placeholderTextColor || theme.mutedForeground}
      onFocus={(e) => {
        setIsFocused(true);
        if (onFocus) onFocus(e);
      }}
      onBlur={(e) => {
        setIsFocused(false);
        if (onBlur) onBlur(e);
      }}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    height: 46,
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  inputFocused: {
    borderWidth: 1.5,
  },
  inputDisabled: {
    opacity: 0.5,
  },
});
