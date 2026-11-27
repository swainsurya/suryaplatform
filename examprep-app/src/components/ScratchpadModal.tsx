import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  useWindowDimensions,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface ScratchpadModalProps {
  visible: boolean;
  onClose: () => void;
  questionNumber: number;
  isDarkMode?: boolean;
}

export const ScratchpadModal: React.FC<ScratchpadModalProps> = ({
  visible,
  onClose,
  questionNumber,
  isDarkMode = true,
}) => {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetHeight = Math.min(height * 0.78, 650);
  const bottomPadding = Math.max(insets.bottom, 20);

  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser'>('pen');

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          setCurrentPath(`M ${Math.round(locationX)} ${Math.round(locationY)}`);
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          setCurrentPath((prev) => `${prev} L ${Math.round(locationX)} ${Math.round(locationY)}`);
        },
        onPanResponderRelease: () => {
          setCurrentPath((prev) => {
            if (prev) {
              setPaths((existing) => [...existing, prev]);
            }
            return '';
          });
        },
      }),
    []
  );

  const handleClear = () => {
    setPaths([]);
    setCurrentPath('');
  };

  const handleUndo = () => {
    setPaths((prev) => prev.slice(0, -1));
  };

  const strokeColor = isDarkMode ? '#FAFAFA' : '#09090B';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View
          style={[
            styles.sheetContainer,
            {
              height: sheetHeight,
              paddingBottom: bottomPadding,
              backgroundColor: isDarkMode ? '#18181B' : '#FFFFFF',
              borderColor: isDarkMode ? '#27272A' : '#E2E8F0',
            },
          ]}
        >
          {/* Handle */}
          <View
            style={[
              styles.handle,
              { backgroundColor: isDarkMode ? '#3F3F46' : '#D4D4D8' },
            ]}
          />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: isDarkMode ? '#27272A' : '#F4F4F5',
                    borderColor: isDarkMode ? '#3F3F46' : '#E4E4E7',
                  },
                ]}
              >
                <Ionicons
                  name="pencil"
                  size={16}
                  color={isDarkMode ? '#FAFAFA' : '#09090B'}
                />
              </View>
              <View>
                <Text
                  style={[
                    styles.title,
                    { color: isDarkMode ? '#FAFAFA' : '#09090B' },
                  ]}
                >
                  Quick Scratchpad
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    { color: isDarkMode ? '#A1A1AA' : '#71717A' },
                  ]}
                >
                  Rough Work • Finger Drawing
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <Button
                variant="ghost"
                size="sm"
                style={styles.actionBtn}
                onPress={handleUndo}
                disabled={paths.length === 0}
              >
                <Ionicons
                  name="arrow-undo-outline"
                  size={18}
                  color={paths.length > 0 ? (isDarkMode ? '#FAFAFA' : '#09090B') : '#71717A'}
                />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                style={styles.actionBtn}
                onPress={handleClear}
                disabled={paths.length === 0}
              >
                <Text
                  style={[
                    styles.clearText,
                    paths.length === 0 && { color: '#71717A' },
                  ]}
                >
                  Clear
                </Text>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                style={styles.iconBtn}
                onPress={onClose}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={isDarkMode ? '#FAFAFA' : '#09090B'}
                />
              </Button>
            </View>
          </View>

          {/* Focus Meta Strip */}
          <View
            style={[
              styles.focusPill,
              {
                backgroundColor: isDarkMode ? '#27272A' : '#F8FAFC',
                borderColor: isDarkMode ? '#3F3F46' : '#E2E8F0',
              },
            ]}
          >
            <Badge variant="outline" style={styles.focusBadge}>
              Question {questionNumber}
            </Badge>
            <Text
              style={[
                styles.focusText,
                { color: isDarkMode ? '#A1A1AA' : '#71717A' },
              ]}
              numberOfLines={1}
            >
              Draft calculations here (auto-cleared after test)
            </Text>
          </View>

          {/* Canvas Area */}
          <View
            style={[
              styles.canvasContainer,
              {
                backgroundColor: isDarkMode ? '#111113' : '#FAFAFA',
                borderColor: isDarkMode ? '#27272A' : '#E2E8F0',
              },
            ]}
            {...panResponder.panHandlers}
          >
            {paths.length === 0 && !currentPath && (
              <View style={styles.gridOverlay} pointerEvents="none">
                <Text
                  style={[
                    styles.hintWatermark,
                    { color: isDarkMode ? '#27272A' : '#D4D4D8' },
                  ]}
                >
                  Draw with finger here
                </Text>
              </View>
            )}

            <Svg style={StyleSheet.absoluteFill}>
              {paths.map((p, i) => (
                <Path
                  key={i}
                  d={p}
                  stroke={strokeColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ))}
              {currentPath ? (
                <Path
                  d={currentPath}
                  stroke={strokeColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ) : null}
            </Svg>
          </View>

          {/* Tool Dock Footer */}
          <View style={styles.toolDock}>
            <View style={styles.toolGroup}>
              <Button
                variant={activeTool === 'pen' ? 'default' : 'secondary'}
                size="sm"
                style={styles.toolBtn}
                onPress={() => setActiveTool('pen')}
              >
                <Ionicons
                  name="brush-outline"
                  size={16}
                  color={activeTool === 'pen' ? (isDarkMode ? '#09090B' : '#FAFAFA') : (isDarkMode ? '#A1A1AA' : '#71717A')}
                />
              </Button>
            </View>

            <Button
              variant="default"
              size="sm"
              style={styles.doneBtn}
              onPress={onClose}
            >
              <Text
                style={[
                  styles.doneBtnText,
                  { color: isDarkMode ? '#09090B' : '#FAFAFA' },
                ]}
              >
                Return to Exam
              </Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 11, 0.65)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    height: 32,
    paddingHorizontal: 8,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  iconBtn: {
    width: 32,
    height: 32,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 8,
    marginBottom: 10,
  },
  focusBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  focusText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  canvasContainer: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintWatermark: {
    fontSize: 13,
    fontWeight: '600',
  },
  toolDock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  toolGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  toolBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
