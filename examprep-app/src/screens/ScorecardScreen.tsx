import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ExamSubmission, Exam } from '../types/exam';
import { StyledAlertModal, AlertOptions } from '../components/StyledAlertModal';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { FadeIn } from '../components/ui/loader';
import { useTheme } from '../theme';

interface ScorecardScreenProps {
  submission: ExamSubmission;
  exam?: Exam;
  onGoHome: () => void;
}

export const ScorecardScreen: React.FC<ScorecardScreenProps> = ({
  submission,
  exam,
  onGoHome,
}) => {
  const { theme, isDark } = useTheme();
  const [scorecardTab, setScorecardTab] = useState<'overview' | 'audit'>('overview');
  const [activeFilter, setActiveFilter] = useState<'all' | 'correct' | 'incorrect' | 'skipped'>('all');
  const [alertConfig, setAlertConfig] = useState<AlertOptions | null>(null);

  const showAlert = (options: AlertOptions) => {
    setAlertConfig(options);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${String(s).padStart(2, '0')}s`;
  };

  const accuracy = submission.attemptedCount > 0
    ? ((submission.correctCount / submission.attemptedCount) * 100).toFixed(1)
    : '0.0';

  const correctPercent = submission.totalQuestions > 0
    ? (submission.correctCount / submission.totalQuestions) * 100
    : 0;
  const wrongPercent = submission.totalQuestions > 0
    ? (submission.wrongCount / submission.totalQuestions) * 100
    : 0;
  const skippedPercent = submission.totalQuestions > 0
    ? (submission.skippedCount / submission.totalQuestions) * 100
    : 0;

  const violations = submission.violationsCount || 0;
  const integrityScore = Math.max(0, 100 - violations * 20);
  const isIntegrityClean = violations === 0;

  const handleDownloadPdf = () => {
    showAlert({
      title: 'Scorecard Report',
      message: `Scorecard for ${submission.examTitle} successfully generated!\n\nScore: ${submission.totalScore}/${submission.maxScore} (${submission.percentage.toFixed(1)}%)\nResult: ${submission.isPassed ? 'QUALIFIED' : 'NOT QUALIFIED'}\nCandidate: ${submission.studentName} (${submission.studentRollNumber || 'N/A'})`,
      type: submission.isPassed ? 'success' : 'info',
    });
  };

  // Find question details for audit stream
  const auditQuestions = (exam?.questions || []).map((q, idx) => {
    const ans = submission.answers?.find((a) => a.questionId === q.id);
    const isAttempted = ans?.selectedOptionIndex !== undefined && ans?.selectedOptionIndex !== null;
    const isCorrect = ans?.isCorrect ?? false;
    let category: 'correct' | 'incorrect' | 'skipped' = 'skipped';
    if (isAttempted) {
      category = isCorrect ? 'correct' : 'incorrect';
    }

    return {
      index: idx + 1,
      question: q,
      selectedOptionIndex: ans?.selectedOptionIndex,
      isCorrect,
      isAttempted,
      marksAwarded: ans?.marksAwarded ?? 0,
      category,
    };
  });

  const filteredQuestions = auditQuestions.filter((item) => {
    if (activeFilter === 'all') return true;
    return item.category === activeFilter;
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.surface }]} edges={['top', 'left', 'right', 'bottom']}>
      <FadeIn style={{ flex: 1, backgroundColor: theme.surface }}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.surface }]}
          style={{ backgroundColor: theme.surface }}
          showsVerticalScrollIndicator={false}
        >
        {/* Celebration / Result Hero Card */}
        <Card style={styles.heroCard}>
          <LinearGradient
            colors={
              submission.isPassed
                ? (isDark ? ['rgba(16, 185, 129, 0.15)', 'rgba(99, 102, 241, 0.1)', theme.card] : ['rgba(16, 185, 129, 0.1)', 'rgba(99, 102, 241, 0.05)', '#FFFFFF'])
                : (isDark ? ['rgba(239, 68, 68, 0.15)', 'rgba(99, 102, 241, 0.1)', theme.card] : ['rgba(239, 68, 68, 0.1)', 'rgba(99, 102, 241, 0.05)', '#FFFFFF'])
            }
            style={styles.heroGradient}
          >
            {/* Trophy Badge */}
            <View style={styles.trophyContainer}>
              <View
                style={[
                  styles.trophyCircle,
                  { backgroundColor: submission.isPassed ? '#10B981' : '#EF4444' },
                ]}
              >
                <Ionicons
                  name={submission.isPassed ? 'trophy' : 'ribbon'}
                  size={36}
                  color="#FFFFFF"
                />
              </View>
              {submission.isPassed && (
                <View style={styles.verifiedMark}>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                </View>
              )}
            </View>

            {/* Status Label Pill */}
            <Badge
              variant={submission.isPassed ? 'success' : 'destructive'}
              style={styles.statusPill}
              textStyle={styles.statusPillText}
            >
              {submission.isPassed ? 'QUALIFIED' : 'NEEDS IMPROVEMENT'}
            </Badge>

            <Text style={[styles.studentGreeting, { color: theme.mutedForeground }]}>
              Well done, {submission.studentName}!
            </Text>
            <Text
              style={[
                styles.qualifiedTitle,
                { color: submission.isPassed ? theme.foreground : '#EF4444' },
              ]}
            >
              {submission.isPassed ? 'Assessment Completed Successfully' : 'Assessment Completed'}
            </Text>
            <Text style={[styles.examSubjectText, { color: theme.foreground }]}>{submission.examTitle}</Text>
            <Text style={[styles.submittedAtText, { color: theme.mutedForeground }]}>
              Candidate: {submission.studentRollNumber || 'N/A'} • Submitted at {new Date(submission.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </LinearGradient>
        </Card>

        {/* Tab Switch Navigation: Overview vs Answer Key */}
        <View style={[styles.tabSwitchBar, { backgroundColor: theme.secondary, borderColor: theme.border }]}>
          <TouchableOpacity
            style={[
              styles.tabSwitchItem,
              scorecardTab === 'overview' && [styles.tabSwitchItemActive, { backgroundColor: theme.card }],
            ]}
            activeOpacity={0.8}
            onPress={() => setScorecardTab('overview')}
          >
            <Ionicons
              name="stats-chart-outline"
              size={14}
              color={scorecardTab === 'overview' ? theme.foreground : theme.mutedForeground}
            />
            <Text
              style={[
                styles.tabSwitchText,
                { color: scorecardTab === 'overview' ? theme.foreground : theme.mutedForeground },
              ]}
            >
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabSwitchItem,
              scorecardTab === 'audit' && [styles.tabSwitchItemActive, { backgroundColor: theme.card }],
            ]}
            activeOpacity={0.8}
            onPress={() => setScorecardTab('audit')}
          >
            <Ionicons
              name="document-text-outline"
              size={14}
              color={scorecardTab === 'audit' ? theme.foreground : theme.mutedForeground}
            />
            <Text
              style={[
                styles.tabSwitchText,
                { color: scorecardTab === 'audit' ? theme.foreground : theme.mutedForeground },
              ]}
            >
              Answer Key ({auditQuestions.length})
            </Text>
          </TouchableOpacity>
        </View>

        {scorecardTab === 'overview' && (
          <>
        {/* Notice if exam was concluded early by teacher */}
        {submission.isEndedByTeacher && (
          <Card
            style={[
              styles.alertNoticeCard,
              isDark ? { backgroundColor: 'rgba(217, 119, 6, 0.14)', borderColor: '#B45309' } : {},
            ]}
          >
            <CardContent style={styles.alertNoticeContentRow}>
              <Ionicons name="warning-outline" size={20} color="#F59E0B" />
              <View style={styles.alertNoticeContent}>
                <Text style={[styles.alertNoticeTitle, isDark && { color: '#FCD34D' }]}>
                  Exam Concluded Early by Instructor
                </Text>
                <Text style={[styles.alertNoticeSub, isDark && { color: '#FDE68A' }]}>
                  The teacher ended this examination from the administration panel. All your recorded
                  answers were submitted and evaluated immediately.
                </Text>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Proctor Disqualification / Termination Alert */}
        {submission.isTerminatedByProctor && (
          <Card
            style={[
              styles.alertNoticeCard,
              styles.alertNoticeCardDanger,
              isDark ? { backgroundColor: 'rgba(239, 68, 68, 0.14)', borderColor: '#B91C1C' } : {},
            ]}
          >
            <CardContent style={styles.alertNoticeContentRow}>
              <Ionicons name="shield-outline" size={20} color="#EF4444" />
              <View style={styles.alertNoticeContent}>
                <Text style={[styles.alertNoticeTitle, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
                  Assessment Terminated by Proctor
                </Text>
                <Text style={[styles.alertNoticeSub, { color: isDark ? '#FECACA' : '#B91C1C' }]}>
                  {submission.terminationReason ||
                    'Security infractions reached maximum threshold. Recorded choices were submitted for audit.'}
                </Text>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Score Matrix (3-Card Stats Grid) */}
        <View style={styles.scoreMatrixRow}>
          {/* Card 1: Score */}
          <Card style={styles.matrixCard}>
            <CardContent style={styles.matrixCardInner}>
              <View style={styles.matrixCardHeader}>
                <Ionicons name="medal-outline" size={14} color={theme.foreground} />
                <Text style={[styles.matrixCardTitle, { color: theme.mutedForeground }]}>SCORE</Text>
              </View>
              <View style={styles.scoreNumberRow}>
                <Text style={[styles.bigNumber, { color: theme.foreground }]}>
                  {submission.totalScore}
                </Text>
                <Text style={[styles.maxScoreLabel, { color: theme.mutedForeground }]}>/{submission.maxScore}</Text>
              </View>
              <Badge variant="outline" style={styles.tagChip}>
                Pass: {exam?.passingPercentage || 40}%
              </Badge>
            </CardContent>
          </Card>

          {/* Card 2: Accuracy */}
          <Card style={styles.matrixCard}>
            <CardContent style={styles.matrixCardInner}>
              <View style={styles.matrixCardHeader}>
                <Ionicons name="locate-outline" size={14} color="#10B981" />
                <Text style={[styles.matrixCardTitle, { color: theme.mutedForeground }]}>ACCURACY</Text>
              </View>
              <View style={styles.scoreNumberRow}>
                <Text style={[styles.bigNumber, { color: '#10B981' }]}>{accuracy}</Text>
                <Text style={[styles.maxScoreLabel, { color: theme.mutedForeground }]}>%</Text>
              </View>
              <Badge variant="secondary" style={styles.tagChip}>
                {submission.percentage.toFixed(1)}% Score
              </Badge>
            </CardContent>
          </Card>

          {/* Card 3: Time Taken */}
          <Card style={styles.matrixCard}>
            <CardContent style={styles.matrixCardInner}>
              <View style={styles.matrixCardHeader}>
                <Ionicons name="time-outline" size={14} color="#6366F1" />
                <Text style={[styles.matrixCardTitle, { color: theme.mutedForeground }]}>TIME</Text>
              </View>
              <View style={styles.scoreNumberRow}>
                <Text style={[styles.timeNumber, { color: theme.foreground }]}>{formatTime(submission.timeTakenSeconds)}</Text>
              </View>
              <Badge variant="outline" style={styles.tagChip}>
                of {exam?.durationMinutes || 60}m
              </Badge>
            </CardContent>
          </Card>
        </View>

        {/* Attempt Performance Breakdown Bar */}
        <Card style={styles.breakdownCard}>
          <CardContent style={{ paddingVertical: 14 }}>
            <View style={styles.breakdownHeader}>
              <Text style={[styles.breakdownTitle, { color: theme.foreground }]}>Attempt Performance Breakdown</Text>
              <Badge variant="secondary" style={{ borderRadius: 6 }}>
                {submission.totalQuestions} Questions
              </Badge>
            </View>

            {/* Stacked Visual Bar */}
            <View style={[styles.stackedBar, { backgroundColor: theme.border }]}>
              <View style={[styles.barSlice, { width: `${correctPercent}%`, backgroundColor: '#10B981' }]} />
              <View style={[styles.barSlice, { width: `${wrongPercent}%`, backgroundColor: '#EF4444' }]} />
              <View style={[styles.barSlice, { width: `${skippedPercent}%`, backgroundColor: isDark ? '#52525B' : '#D4D4D8' }]} />
            </View>

            {/* Legend Items */}
            <View style={styles.legendRow}>
              <View style={styles.legendCol}>
                <View style={[styles.legendIndicator, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.legendNumber, { color: theme.foreground }]}>{submission.correctCount}</Text>
                <Text style={[styles.legendLabel, { color: theme.mutedForeground }]}>Correct</Text>
              </View>

              <View style={styles.legendCol}>
                <View style={[styles.legendIndicator, { backgroundColor: '#EF4444' }]} />
                <Text style={[styles.legendNumber, { color: theme.foreground }]}>{submission.wrongCount}</Text>
                <Text style={[styles.legendLabel, { color: theme.mutedForeground }]}>Incorrect</Text>
              </View>

              <View style={styles.legendCol}>
                <View style={[styles.legendIndicator, { backgroundColor: isDark ? '#52525B' : '#D4D4D8' }]} />
                <Text style={[styles.legendNumber, { color: theme.foreground }]}>{submission.skippedCount}</Text>
                <Text style={[styles.legendLabel, { color: theme.mutedForeground }]}>Skipped</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Proctoring Audit Shield Card */}
        <Card style={styles.proctorAuditCard}>
          <CardContent style={styles.proctorAuditContent}>
            <View style={[styles.proctorAuditIcon, { backgroundColor: theme.secondary }]}>
              <Ionicons
                name={isIntegrityClean ? 'shield-checkmark' : 'shield-half'}
                size={24}
                color={isIntegrityClean ? '#10B981' : '#EF4444'}
              />
            </View>
            <View style={styles.proctorAuditTextCol}>
              <View style={styles.proctorAuditTitleRow}>
                <Text style={[styles.proctorAuditTitle, { color: theme.foreground }]}>
                  {isIntegrityClean ? 'Integrity Score: Clean' : `Integrity Score: ${violations} Alert(s)`}
                </Text>
                <Badge
                  variant={isIntegrityClean ? 'success' : 'destructive'}
                  style={styles.integrityScoreBadge}
                >
                  {integrityScore}%
                </Badge>
              </View>
              <Text style={[styles.proctorAuditSub, { color: theme.mutedForeground }]}>
                {isIntegrityClean
                  ? 'Verified Proctoring Session • 0 App Switch Violations • Single Device Hardware Verified.'
                  : `Verified Proctoring Session • ${violations} App Switch Infractions Logged • Audited.`}
              </Text>
            </View>
          </CardContent>
        </Card>
          </>
        )}

        {/* Answer Key & Audit Section */}
        {scorecardTab === 'audit' && (
        <View style={styles.auditSection}>
          <View style={styles.auditSectionHeader}>
            <Text style={[styles.auditSectionTitle, { color: theme.foreground }]}>Answer Key & Audit</Text>
            <Badge variant="outline" style={styles.detailedBadge} textStyle={[styles.detailedBadgeText, { color: theme.foreground }]}>
              <Ionicons name="eye-outline" size={11} color={theme.foreground} style={{ marginRight: 3 }} />
              Detailed View
            </Badge>
          </View>

          {/* Filter Buttons */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
            <Button
              variant={activeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              style={styles.filterBtn}
              onPress={() => setActiveFilter('all')}
            >
              All ({auditQuestions.length})
            </Button>

            <Button
              variant={activeFilter === 'correct' ? 'default' : 'outline'}
              size="sm"
              style={styles.filterBtn}
              onPress={() => setActiveFilter('correct')}
            >
              <View style={[styles.filterDot, { backgroundColor: '#10B981' }]} />
              Correct ({submission.correctCount})
            </Button>

            <Button
              variant={activeFilter === 'incorrect' ? 'default' : 'outline'}
              size="sm"
              style={styles.filterBtn}
              onPress={() => setActiveFilter('incorrect')}
            >
              <View style={[styles.filterDot, { backgroundColor: '#EF4444' }]} />
              Incorrect ({submission.wrongCount})
            </Button>

            <Button
              variant={activeFilter === 'skipped' ? 'default' : 'outline'}
              size="sm"
              style={styles.filterBtn}
              onPress={() => setActiveFilter('skipped')}
            >
              <View style={[styles.filterDot, { backgroundColor: '#A1A1AA' }]} />
              Skipped ({submission.skippedCount})
            </Button>
          </ScrollView>

          {/* Audit Question Cards */}
          <View style={styles.auditList}>
            {filteredQuestions.map((item) => {
              const { index, question, selectedOptionIndex, isCorrect, isAttempted, marksAwarded } = item;
              const letters = ['A', 'B', 'C', 'D'];

              return (
                <Card key={question.id} style={styles.auditCard}>
                  <CardContent style={{ paddingVertical: 12, gap: 10 }}>
                    {/* Status & Marks Header */}
                    <View style={styles.auditCardHeader}>
                      {isCorrect ? (
                        <Badge variant="success" style={styles.chipCorrect}>
                          <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                          Correct (+{marksAwarded} Marks)
                        </Badge>
                      ) : isAttempted ? (
                        <Badge variant="destructive" style={styles.chipIncorrect}>
                          <Ionicons name="close-circle" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                          Incorrect ({marksAwarded} Marks)
                        </Badge>
                      ) : (
                        <Badge variant="secondary" style={styles.chipSkipped}>
                          <Ionicons name="remove-circle-outline" size={12} color="#71717A" style={{ marginRight: 4 }} />
                          Skipped (0 Marks)
                        </Badge>
                      )}
                      <Text style={[styles.questionIndexLabel, { color: theme.mutedForeground }]}>Q {index}</Text>
                    </View>

                    <Text style={[styles.auditQuestionPrompt, { color: theme.foreground }]}>{question.questionText}</Text>

                    {/* Candidate Selection vs Correct Selection */}
                    <View style={styles.comparisonBox}>
                      {isAttempted && (
                        <View
                          style={[
                            styles.comparisonRow,
                            {
                              backgroundColor: isCorrect
                                ? 'rgba(16, 185, 129, 0.12)'
                                : 'rgba(239, 68, 68, 0.12)',
                              borderColor: isCorrect ? (isDark ? '#065F46' : '#A7F3D0') : (isDark ? '#7F1D1D' : '#FECACA'),
                            },
                          ]}
                        >
                          <View style={styles.compLeft}>
                            <View
                              style={[
                                styles.compLetterChip,
                                { backgroundColor: isCorrect ? '#10B981' : '#EF4444' },
                              ]}
                            >
                              <Text style={styles.compLetterText}>
                                {selectedOptionIndex !== null && selectedOptionIndex !== undefined ? letters[selectedOptionIndex] : '-'}
                              </Text>
                            </View>
                            <Text style={[styles.compText, { color: theme.foreground }]} numberOfLines={2}>
                              {selectedOptionIndex !== null && selectedOptionIndex !== undefined ? question.options[selectedOptionIndex] : ''}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.compTag,
                              { color: isCorrect ? '#10B981' : '#EF4444' },
                            ]}
                          >
                            {isCorrect ? 'Your Choice ✓' : 'Your Answer ✗'}
                          </Text>
                        </View>
                      )}

                      {!isCorrect && (
                        <View style={[styles.comparisonRow, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: isDark ? '#065F46' : '#A7F3D0' }]}>
                          <View style={styles.compLeft}>
                            <View style={[styles.compLetterChip, { backgroundColor: '#10B981' }]}>
                              <Text style={styles.compLetterText}>
                                {letters[question.correctOptionIndex]}
                              </Text>
                            </View>
                            <Text style={[styles.compText, { color: theme.foreground }]} numberOfLines={2}>
                              {question.options[question.correctOptionIndex]}
                            </Text>
                          </View>
                          <Text style={[styles.compTag, { color: '#10B981' }]}>
                            Correct Answer ✓
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Step-by-Step Explanation Box */}
                    {question.explanation && (
                      <View style={[styles.explanationBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                        <View style={styles.explanationHeader}>
                          <Ionicons name="bulb-outline" size={13} color={theme.foreground} />
                          <Text style={[styles.explanationTitle, { color: theme.foreground }]}>Step-by-step Solution</Text>
                        </View>
                        <Text style={[styles.explanationBody, { color: theme.mutedForeground }]}>{question.explanation}</Text>
                      </View>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </View>
        </View>
        )}

        {/* Bottom Action Buttons */}
        <View style={styles.actionButtonsCol}>
          <Button
            variant="default"
            size="lg"
            style={styles.downloadPdfBtn}
            onPress={handleDownloadPdf}
          >
            <Ionicons name="download-outline" size={18} color={theme.primaryForeground} style={{ marginRight: 6 }} />
            <Text style={[styles.downloadPdfText, { color: theme.primaryForeground }]}>Download Scorecard PDF</Text>
          </Button>

          <Button
            variant="outline"
            size="lg"
            style={styles.homeBtn}
            onPress={onGoHome}
          >
            <Ionicons name="home-outline" size={18} color={theme.foreground} style={{ marginRight: 6 }} />
            <Text style={[styles.homeBtnText, { color: theme.foreground }]}>Back to Dashboard Home</Text>
          </Button>
        </View>
      </ScrollView>
    </FadeIn>

      {/* Styled Alert Modal */}
      {alertConfig && (
        <StyledAlertModal
          visible={true}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          buttons={alertConfig.buttons}
          onClose={() => setAlertConfig(null)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  heroCard: {
    borderRadius: 14,
    overflow: 'hidden',
    padding: 0,
  },
  heroGradient: {
    paddingTop: 24,
    paddingBottom: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  trophyContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  trophyCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  verifiedMark: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  studentGreeting: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717A',
  },
  qualifiedTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  examSubjectText: {
    fontSize: 13,
    color: '#09090B',
    fontWeight: '700',
    textAlign: 'center',
  },
  submittedAtText: {
    fontSize: 11,
    color: '#71717A',
    textAlign: 'center',
  },
  alertNoticeCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  alertNoticeCardDanger: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  alertNoticeContentRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  alertNoticeContent: {
    flex: 1,
  },
  alertNoticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  alertNoticeSub: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 16,
  },
  scoreMatrixRow: {
    flexDirection: 'row',
    gap: 8,
  },
  matrixCard: {
    flex: 1,
    borderRadius: 10,
  },
  matrixCardInner: {
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  matrixCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matrixCardTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#71717A',
    letterSpacing: 0.5,
  },
  scoreNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  bigNumber: {
    fontSize: 22,
    fontWeight: '900',
  },
  maxScoreLabel: {
    fontSize: 11,
    color: '#71717A',
    fontWeight: '700',
  },
  timeNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: '#09090B',
  },
  tagChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  breakdownCard: {
    borderRadius: 12,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#09090B',
  },
  stackedBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 12,
  },
  barSlice: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  legendCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#09090B',
  },
  legendLabel: {
    fontSize: 11,
    color: '#71717A',
  },
  proctorAuditCard: {
    borderRadius: 12,
  },
  proctorAuditContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  proctorAuditIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proctorAuditTextCol: {
    flex: 1,
  },
  proctorAuditTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  proctorAuditTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#09090B',
  },
  integrityScoreBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  proctorAuditSub: {
    fontSize: 10,
    color: '#71717A',
    lineHeight: 14,
  },
  auditSection: {
    gap: 10,
  },
  auditSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  auditSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#09090B',
  },
  detailedBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  detailedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#09090B',
  },
  filterBar: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  filterBtn: {
    borderRadius: 8,
    height: 32,
    paddingHorizontal: 10,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  auditList: {
    gap: 10,
  },
  auditCard: {
    borderRadius: 12,
  },
  auditCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipCorrect: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipIncorrect: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipSkipped: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  questionIndexLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#71717A',
  },
  auditQuestionPrompt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#09090B',
    lineHeight: 18,
  },
  comparisonBox: {
    gap: 6,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  compLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  compLetterChip: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compLetterText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  compText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#09090B',
    flex: 1,
  },
  compTag: {
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 6,
  },
  explanationBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 4,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  explanationTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#09090B',
  },
  explanationBody: {
    fontSize: 11,
    color: '#52525B',
    lineHeight: 16,
  },
  actionButtonsCol: {
    gap: 8,
    marginTop: 6,
  },
  downloadPdfBtn: {
    height: 48,
    borderRadius: 10,
  },
  downloadPdfText: {
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '800',
  },
  homeBtn: {
    height: 48,
    borderRadius: 10,
  },
  homeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#09090B',
  },
  tabSwitchBar: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  tabSwitchItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabSwitchItemActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  tabSwitchText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
