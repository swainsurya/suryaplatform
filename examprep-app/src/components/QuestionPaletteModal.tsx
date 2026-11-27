import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

interface QuestionPaletteModalProps {
  visible: boolean;
  onClose: () => void;
  totalQuestions: number;
  currentIndex: number;
  answers: Record<string, number | null>;
  markedReview: string[];
  questionIds: string[];
  onSelectQuestion: (index: number) => void;
  subject?: string;
  isDarkMode?: boolean;
}

export const QuestionPaletteModal: React.FC<QuestionPaletteModalProps> = ({
  visible,
  onClose,
  totalQuestions,
  currentIndex,
  answers,
  markedReview,
  questionIds,
  onSelectQuestion,
  subject,
  isDarkMode = true, // Default to true since palette is accessed during exam
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'all' | 'answered' | 'marked' | 'unvisited'>('all');

  const [translateY] = useState(() => new Animated.Value(400));
  const [backdropOpacity] = useState(() => new Animated.Value(0));

  // Counts
  let answeredCount = 0;
  let markedCount = 0;
  let notVisitedCount = 0;

  questionIds.forEach((qId, idx) => {
    if (markedReview.includes(qId)) {
      markedCount++;
    } else if (answers[qId] !== undefined && answers[qId] !== null) {
      answeredCount++;
    } else if (idx !== currentIndex) {
      notVisitedCount++;
    }
  });

  // Calculate dynamic tile columns
  const horizontalPadding = 32;
  const gap = 8;
  const targetCols = windowWidth > 640 ? 7 : windowWidth > 420 ? 6 : windowWidth > 360 ? 5 : 4;
  const tileWidth = Math.floor((windowWidth - horizontalPadding - (targetCols - 1) * gap) / targetCols);

  const sheetMaxHeight = Math.min(windowHeight * 0.75, 540);

  // Animate sheet in/out
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 24,
          stiffness: 220,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      translateY.setValue(400);
      backdropOpacity.setValue(0);
    }
  }, [visible, translateY, backdropOpacity]);

  const handleDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: sheetMaxHeight + 100,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [translateY, backdropOpacity, sheetMaxHeight, onClose]);

  // PanResponder for drag to dismiss
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 5,
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy > 0) {
            translateY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 80 || gesture.vy > 0.6) {
            handleDismiss();
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              damping: 20,
              stiffness: 250,
            }).start();
          }
        },
      }),
    [translateY, handleDismiss]
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropOpacity },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleDismiss}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheetContainer,
            {
              maxHeight: sheetMaxHeight,
              paddingBottom: Math.max(insets.bottom + 8, 20),
              transform: [{ translateY }],
              backgroundColor: isDarkMode ? '#18181B' : '#FFFFFF',
              borderColor: isDarkMode ? '#27272A' : '#E2E8F0',
            },
          ]}
        >
          {/* Drag Handle Area */}
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View
              style={[
                styles.handle,
                { backgroundColor: isDarkMode ? '#3F3F46' : '#CBD5E1' },
              ]}
            />
          </View>

          {/* Sheet Header */}
          <View style={styles.header}>
            <View>
              <Text
                style={[
                  styles.title,
                  { color: isDarkMode ? '#FAFAFA' : '#09090B' },
                ]}
              >
                Question Palette
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  { color: isDarkMode ? '#A1A1AA' : '#71717A' },
                ]}
              >
                {subject ? `${subject} • ` : ''}{totalQuestions} Questions
              </Text>
            </View>
            <Button
              variant="ghost"
              size="icon"
              style={styles.closeBtn}
              onPress={handleDismiss}
            >
              <Ionicons
                name="close"
                size={20}
                color={isDarkMode ? '#FAFAFA' : '#09090B'}
              />
            </Button>
          </View>

          {/* Filter Chips / Legend Bar */}
          <View style={styles.legendContainer}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: isDarkMode ? '#27272A' : '#F8FAFC',
                  borderColor: isDarkMode ? '#3F3F46' : '#E2E8F0',
                },
                filter === 'all' && [
                  styles.filterChipActive,
                  {
                    backgroundColor: isDarkMode ? '#FAFAFA' : '#09090B',
                    borderColor: isDarkMode ? '#FAFAFA' : '#09090B',
                  },
                ],
              ]}
              onPress={() => setFilter('all')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: isDarkMode ? '#A1A1AA' : '#52525B' },
                  filter === 'all' && [
                    styles.filterChipTextActive,
                    { color: isDarkMode ? '#09090B' : '#FAFAFA' },
                  ],
                ]}
              >
                All ({totalQuestions})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: isDarkMode ? '#27272A' : '#F8FAFC',
                  borderColor: isDarkMode ? '#3F3F46' : '#E2E8F0',
                },
                filter === 'answered' && [
                  styles.filterChipActive,
                  {
                    backgroundColor: isDarkMode ? '#FAFAFA' : '#09090B',
                    borderColor: isDarkMode ? '#FAFAFA' : '#09090B',
                  },
                ],
              ]}
              onPress={() => setFilter('answered')}
            >
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text
                style={[
                  styles.filterChipText,
                  { color: isDarkMode ? '#A1A1AA' : '#52525B' },
                  filter === 'answered' && [
                    styles.filterChipTextActive,
                    { color: isDarkMode ? '#09090B' : '#FAFAFA' },
                  ],
                ]}
              >
                Done ({answeredCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: isDarkMode ? '#27272A' : '#F8FAFC',
                  borderColor: isDarkMode ? '#3F3F46' : '#E2E8F0',
                },
                filter === 'marked' && [
                  styles.filterChipActive,
                  {
                    backgroundColor: isDarkMode ? '#FAFAFA' : '#09090B',
                    borderColor: isDarkMode ? '#FAFAFA' : '#09090B',
                  },
                ],
              ]}
              onPress={() => setFilter('marked')}
            >
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text
                style={[
                  styles.filterChipText,
                  { color: isDarkMode ? '#A1A1AA' : '#52525B' },
                  filter === 'marked' && [
                    styles.filterChipTextActive,
                    { color: isDarkMode ? '#09090B' : '#FAFAFA' },
                  ],
                ]}
              >
                Marked ({markedCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: isDarkMode ? '#27272A' : '#F8FAFC',
                  borderColor: isDarkMode ? '#3F3F46' : '#E2E8F0',
                },
                filter === 'unvisited' && [
                  styles.filterChipActive,
                  {
                    backgroundColor: isDarkMode ? '#FAFAFA' : '#09090B',
                    borderColor: isDarkMode ? '#FAFAFA' : '#09090B',
                  },
                ],
              ]}
              onPress={() => setFilter('unvisited')}
            >
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: isDarkMode ? '#52525B' : '#CBD5E1' },
                ]}
              />
              <Text
                style={[
                  styles.filterChipText,
                  { color: isDarkMode ? '#A1A1AA' : '#52525B' },
                  filter === 'unvisited' && [
                    styles.filterChipTextActive,
                    { color: isDarkMode ? '#09090B' : '#FAFAFA' },
                  ],
                ]}
              >
                Skip ({notVisitedCount})
              </Text>
            </TouchableOpacity>
          </View>

          <Separator style={{ marginBottom: 10 }} />

          {/* Responsive Tile Grid */}
          <ScrollView
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
          >
            {questionIds.map((qId, idx) => {
              const isCurrent = idx === currentIndex;
              const isMarked = markedReview.includes(qId);
              const isAnswered = answers[qId] !== undefined && answers[qId] !== null;

              if (filter === 'answered' && !isAnswered) return null;
              if (filter === 'marked' && !isMarked) return null;
              if (filter === 'unvisited' && (isAnswered || isMarked)) return null;

              let btnBg = isDarkMode ? '#27272A' : '#F8FAFC';
              let borderColor = isDarkMode ? '#3F3F46' : '#E2E8F0';
              let textColor = isDarkMode ? '#D4D4D8' : '#64748B';

              if (isMarked) {
                btnBg = isDarkMode ? '#451A03' : '#FEF3C7';
                borderColor = isDarkMode ? '#B45309' : '#F59E0B';
                textColor = isDarkMode ? '#FCD34D' : '#92400E';
              } else if (isAnswered) {
                btnBg = isDarkMode ? '#052E16' : '#DCFCE7';
                borderColor = isDarkMode ? '#059669' : '#10B981';
                textColor = isDarkMode ? '#86EFAC' : '#065F46';
              }

              return (
                <TouchableOpacity
                  key={qId}
                  style={[
                    styles.gridButton,
                    {
                      width: tileWidth,
                      height: Math.max(tileWidth * 0.95, 44),
                      backgroundColor: btnBg,
                      borderColor,
                    },
                    isCurrent && [
                      styles.currentTile,
                      {
                        borderColor: isDarkMode ? '#FAFAFA' : '#09090B',
                        shadowColor: isDarkMode ? '#FAFAFA' : '#09090B',
                      },
                    ],
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    try {
                      Haptics.selectionAsync();
                    } catch {}
                    onSelectQuestion(idx);
                    handleDismiss();
                  }}
                >
                  <Text style={[styles.gridButtonText, { color: textColor }]}>
                    {idx + 1}
                  </Text>
                  {isMarked && (
                    <View style={styles.miniMarkBadge}>
                      <Ionicons
                        name="bookmark"
                        size={9}
                        color={isDarkMode ? '#FCD34D' : '#B45309'}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(9, 9, 11, 0.65)',
  },
  sheetContainer: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handleArea: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 4.5,
    borderRadius: 2.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  legendContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  filterChipActive: {},
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  filterChipTextActive: {
    fontWeight: '700',
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
    justifyContent: 'flex-start',
  },
  gridButton: {
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gridButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  currentTile: {
    borderWidth: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  miniMarkBadge: {
    position: 'absolute',
    top: 2,
    right: 3,
  },
});
