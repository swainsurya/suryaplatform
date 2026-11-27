import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AntiLeakWatermarkProps {
  rollNumber: string;
  studentName: string;
}

export const AntiLeakWatermark: React.FC<AntiLeakWatermarkProps> = ({
  rollNumber,
  studentName,
}) => {
  const lineText = `ROLL: ${rollNumber || '2024-CS-042'} • ${studentName.toUpperCase() || 'STUDENT'} • SURYA EXAMPREP SECURE HUD`;

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={[styles.textRow, { transform: [{ rotate: '-15deg' }] }]}>
        <Text style={styles.watermarkText}>{lineText}</Text>
      </View>
      <View style={[styles.textRow, { transform: [{ rotate: '-15deg' }], marginLeft: 40 }]}>
        <Text style={styles.watermarkText}>{lineText}</Text>
      </View>
      <View style={[styles.textRow, { transform: [{ rotate: '-15deg' }], marginLeft: -20 }]}>
        <Text style={styles.watermarkText}>{lineText}</Text>
      </View>
      <View style={[styles.textRow, { transform: [{ rotate: '-15deg' }], marginLeft: 60 }]}>
        <Text style={styles.watermarkText}>{lineText}</Text>
      </View>
      <View style={[styles.textRow, { transform: [{ rotate: '-15deg' }] }]}>
        <Text style={styles.watermarkText}>{lineText}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-around',
    overflow: 'hidden',
    zIndex: 1,
    opacity: 0.04,
  },
  textRow: {
    width: '180%',
    left: '-40%',
  },
  watermarkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#131B2E',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
});
