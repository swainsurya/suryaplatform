import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import {
  StudentProfile,
  Exam,
  ExamSubmission,
  DeviceExamAttemptRecord,
} from '../types/exam';
import {
  getStudentProfile,
  saveStudentProfile,
  getRecentScorecards,
  getAllAvailableExams,
  getExamByCode,
  isExamAttemptedOnDevice,
  getDeviceExamAttempt,
  defaultMockExams,
} from '../services/storage';
import { subscribeToExams, normalizeExamCode } from '../services/firebase';
import { getExamScheduleInfo, getExamAttemptInfo } from '../services/examUtils';
import { QRScannerModal } from '../components/QRScannerModal';
import { StyledAlertModal, AlertOptions } from '../components/StyledAlertModal';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Separator } from '../components/ui/separator';
import { BottomTabs, TabKey } from '../components/ui/bottom-tabs';
import { Spinner, Skeleton, FadeIn } from '../components/ui/loader';

interface StudentEntryScreenProps {
  initialTab?: TabKey;
  onProceedToReadiness: (exam: Exam, profile: StudentProfile) => void;
  onViewScorecard: (submission: ExamSubmission, fromTab?: TabKey) => void;
}

export const StudentEntryScreen: React.FC<StudentEntryScreenProps> = ({
  initialTab = 'exams',
  onProceedToReadiness,
  onViewScorecard,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [profile, setProfile] = useState<StudentProfile>({
    name: 'Ananya Roy',
    rollNumber: '2024-CS-042',
    email: 'ananya.roy@engg.edu',
    department: 'B.Tech Computer Science & Engineering',
  });
  const [examCode, setExamCode] = useState<string>('');
  const [matchedExam, setMatchedExam] = useState<Exam | null>(null);
  const [allExams, setAllExams] = useState<Exam[]>(defaultMockExams);
  const [recentScorecards, setRecentScorecards] = useState<ExamSubmission[]>([]);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isLoadingExams, setIsLoadingExams] = useState<boolean>(true);

  // Cloud lookup, single-attempt, and verification state
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [accessError, setAccessError] = useState<string>('');
  const [isAttemptedOnDevice, setIsAttemptedOnDevice] = useState<boolean>(false);
  const [pastAttemptRecord, setPastAttemptRecord] = useState<DeviceExamAttemptRecord | null>(null);

  // Profile Edit Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editRoll, setEditRoll] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editDept, setEditDept] = useState<string>('');

  // Custom Styled Alert State
  const [alertConfig, setAlertConfig] = useState<AlertOptions | null>(null);

  const showAlert = (options: AlertOptions) => {
    setAlertConfig(options);
  };

  const loadData = useCallback(async () => {
    try {
      const loadedProfile = await getStudentProfile();
      const scorecards = await getRecentScorecards();
      const exams = await getAllAvailableExams();
      setProfile(loadedProfile);
      setRecentScorecards(scorecards);
      setAllExams(exams);

      if (exams && exams.length > 0) {
        setExamCode(exams[0].code);
        setMatchedExam(exams[0]);
      }
    } finally {
      setIsLoadingExams(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Subscribe to live exams in Firestore
    const unsubscribe = subscribeToExams((remoteExams) => {
      setIsLoadingExams(false);
      if (remoteExams && remoteExams.length > 0) {
        setAllExams(remoteExams);
        setMatchedExam((prev) => {
          if (!prev) {
            setExamCode(remoteExams[0].code);
            return remoteExams[0];
          }
          return prev;
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [loadData]);

  // Re-check single-attempt lock whenever matched exam changes
  useEffect(() => {
    let isMounted = true;
    const checkAttempt = async () => {
      if (!matchedExam) {
        setIsAttemptedOnDevice(false);
        setPastAttemptRecord(null);
        return;
      }
      const attempted = await isExamAttemptedOnDevice(matchedExam.id, matchedExam.code);
      if (isMounted) {
        setIsAttemptedOnDevice(attempted);
        if (attempted) {
          const rec = await getDeviceExamAttempt(matchedExam.id, matchedExam.code);
          setPastAttemptRecord(rec);
        } else {
          setPastAttemptRecord(null);
        }
      }
    };
    checkAttempt();
    return () => {
      isMounted = false;
    };
  }, [matchedExam]);

  // Live auto-verification as student types or pastes code
  useEffect(() => {
    const raw = (examCode || '').trim();

    const timer = setTimeout(async () => {
      if (!raw || raw.length < 3) {
        setMatchedExam(null);
        setAccessError('');
        return;
      }

      if (/^https?:\/\//i.test(raw) && !normalizeExamCode(raw)) {
        setMatchedExam(null);
        setAccessError('Please include an exam code (e.g. ?exam=EXAM-6724) or enter code directly.');
        return;
      }

      setIsSearching(true);
      try {
        const found = await getExamByCode(raw);
        if (found) {
          setMatchedExam(found);
          setAccessError('');
        } else {
          setMatchedExam(null);
          if (raw.length >= 4) {
            setAccessError(`Exam code "${raw}" not found in database.`);
          }
        }
      } catch {
        setMatchedExam(null);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [examCode]);

  const handleCodeChange = (text: string) => {
    const extracted = normalizeExamCode(text);
    if (text.includes('http') || text.includes('?') || text.includes('&')) {
      if (extracted) {
        setExamCode(extracted);
      } else {
        setExamCode(text);
      }
    } else {
      setExamCode(text.toUpperCase());
    }
    if (accessError) setAccessError('');
  };

  const handleSelectExam = (exam: Exam) => {
    setExamCode(exam.code);
    setMatchedExam(exam);
    if (accessError) setAccessError('');
  };

  const handleOpenProfileEdit = () => {
    setEditName(profile.name);
    setEditRoll(profile.rollNumber);
    setEditEmail(profile.email);
    setEditDept(profile.department);
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      showAlert({
        title: 'Name Required',
        message: 'Please enter candidate full name.',
        type: 'warning',
      });
      return;
    }
    const updated: StudentProfile = {
      name: editName.trim(),
      rollNumber: editRoll.trim() || '2024-CS-001',
      email: editEmail.trim() || 'candidate@engg.edu',
      department: editDept.trim() || 'B.Tech Computer Science',
    };
    setProfile(updated);
    await saveStudentProfile(updated);
    setIsProfileModalOpen(false);
    showAlert({
      title: 'Profile Saved',
      message: 'Candidate credentials updated successfully.',
      type: 'success',
    });
  };

  const handleProceed = async () => {
    setAccessError('');

    if (!profile.name.trim()) {
      showAlert({
        title: 'Full Name Required',
        message: 'Please enter candidate full name to begin the examination.',
        type: 'warning',
      });
      return;
    }

    let targetExam = matchedExam;
    if (!targetExam) {
      const cleanCode = (examCode || '').trim();
      if (!cleanCode) {
        showAlert({
          title: 'Code Required',
          message: 'Please enter or scan an exam access code.',
          type: 'warning',
        });
        return;
      }

      if (/^https?:\/\//i.test(cleanCode) && !normalizeExamCode(cleanCode)) {
        showAlert({
          title: 'Invalid Code Link',
          message: 'The link does not contain an exam parameter. Enter your code or link with ?exam=CODE.',
          type: 'warning',
        });
        return;
      }

      setIsSearching(true);
      try {
        targetExam = (await getExamByCode(cleanCode)) || null;
      } finally {
        setIsSearching(false);
      }
    }

    if (!targetExam) {
      const msg = `Exam code "${examCode.trim()}" was not found. Please verify with your instructor.`;
      setAccessError(msg);
      showAlert({
        title: 'Exam Not Found',
        message: msg,
        type: 'danger',
      });
      return;
    }

    if (targetExam.isActive === false) {
      const msg = targetExam.isEnded
        ? `Exam "${targetExam.title}" has been ended by the instructor.`
        : `Exam "${targetExam.title}" is currently closed or inactive.`;
      setAccessError(msg);
      showAlert({
        title: 'Exam Inactive',
        message: msg,
        type: 'warning',
      });
      return;
    }

    const schedule = getExamScheduleInfo(targetExam);
    if (schedule.isUpcoming) {
      const msg = `Exam is scheduled to begin at ${schedule.startTimeFormatted}.`;
      setAccessError(msg);
      showAlert({
        title: 'Upcoming Assessment',
        message: msg,
        type: 'info',
      });
      return;
    }
    if (schedule.isExpired) {
      const msg = `The scheduled exam window closed on ${schedule.endTimeFormatted}.`;
      setAccessError(msg);
      showAlert({
        title: 'Assessment Closed',
        message: msg,
        type: 'danger',
      });
      return;
    }

    const attemptInfo = getExamAttemptInfo(targetExam, recentScorecards);
    if (attemptInfo.isFull) {
      const msg = `All ${attemptInfo.maxCandidates} candidate sheets for this exam have been taken.`;
      setAccessError(msg);
      showAlert({
        title: 'Capacity Full',
        message: msg,
        type: 'danger',
      });
      return;
    }

    const attempted = await isExamAttemptedOnDevice(targetExam.id, targetExam.code);
    if (targetExam.singleAttemptOnly !== false && attempted) {
      const past = await getDeviceExamAttempt(targetExam.id, targetExam.code);
      const msg = `You have already completed this exam on this device${
        past?.submittedAt ? ' on ' + new Date(past.submittedAt).toLocaleDateString() : ''
      }. Only 1 attempt is allowed.`;
      setAccessError(msg);
      showAlert({
        title: 'Already Attempted',
        message: msg,
        type: 'warning',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'View Scorecard',
            onPress: () => {
              const matchedSub = recentScorecards.find(
                (s) =>
                  s.examId === targetExam?.id ||
                  s.examCode === targetExam?.code ||
                  s.id === (past?.submissionId || pastAttemptRecord?.submissionId)
              );
              if (matchedSub) {
                onViewScorecard(matchedSub, activeTab);
              } else if (recentScorecards.length > 0) {
                onViewScorecard(recentScorecards[0], activeTab);
              }
            },
          },
        ],
      });
      return;
    }

    onProceedToReadiness(targetExam, profile);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.headerBackground }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: theme.surface }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Minimalist Top Bar */}
        <View style={[styles.topBar, { backgroundColor: theme.headerBackground, borderBottomColor: theme.headerBorder }]}>
          <View style={styles.brandRow}>
            <View style={[styles.brandBadge, { backgroundColor: theme.primary }]}>
              <Ionicons name="shield-checkmark" size={16} color={theme.primaryForeground} />
            </View>
            <Text style={[styles.brandName, { color: theme.foreground }]}>ExamPrep</Text>
            <Badge variant="outline" style={styles.platformBadge}>
              Surya Cloud
            </Badge>
          </View>

          <View style={styles.topRightActions}>
            {/* Dark / Light Mode Switcher */}
            <TouchableOpacity
              style={[
                styles.themeToggleBtn,
                { backgroundColor: theme.secondary, borderColor: theme.border },
              ]}
              activeOpacity={0.7}
              onPress={toggleTheme}
              accessibilityLabel="Toggle Dark/Light Mode"
            >
              <Ionicons
                name={isDark ? 'sunny' : 'moon'}
                size={15}
                color={isDark ? '#FCD34D' : '#09090B'}
              />
            </TouchableOpacity>

            {/* Profile Pill */}
            <TouchableOpacity
              style={[styles.profilePill, { backgroundColor: theme.secondary }]}
              activeOpacity={0.7}
              onPress={() => setActiveTab('profile')}
            >
              <Avatar size={26}>
                <AvatarFallback text={(profile.name.slice(0, 1) || 'S').toUpperCase()} />
              </Avatar>
              <Text style={[styles.profilePillName, { color: theme.foreground }]} numberOfLines={1}>
                {profile.name.split(' ')[0]}
              </Text>
              <Ionicons name="chevron-forward" size={12} color={theme.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Segmented Tab Switch Navigation Bar */}
        <View style={[styles.topTabSwitchWrapper, { backgroundColor: theme.headerBackground, borderBottomColor: theme.headerBorder }]}>
          <View style={[styles.topTabSwitchBar, { backgroundColor: theme.secondary, borderColor: theme.border }]}>
            {([
              { key: 'exams', label: 'Exams', icon: 'book-outline', activeIcon: 'book' },
              { key: 'results', label: 'Results', icon: 'ribbon-outline', activeIcon: 'ribbon' },
              { key: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
            ] as const).map((t) => {
              const isTabActive = activeTab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    styles.topTabSwitchItem,
                    isTabActive && [styles.topTabSwitchItemActive, { backgroundColor: theme.card }],
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setActiveTab(t.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isTabActive }}
                >
                  <Ionicons
                    name={isTabActive ? t.activeIcon : t.icon}
                    size={14}
                    color={isTabActive ? theme.foreground : theme.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.topTabSwitchText,
                      { color: isTabActive ? theme.foreground : theme.mutedForeground },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Tab-driven Content with Preserved Scroll & Smooth FadeIn Animation */}
        <FadeIn transitionKey={activeTab} style={{ flex: 1, backgroundColor: theme.surface }}>
          {/* ========================================================
              TAB 1: EXAMS & CODE ENTRY
             ======================================================== */}
          <ScrollView
            contentContainerStyle={[styles.scrollBody, { backgroundColor: theme.surface }]}
            style={{ flex: 1, backgroundColor: theme.surface, display: activeTab === 'exams' ? 'flex' : 'none' }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
                <View style={styles.heroSection}>
                  <Text style={[styles.heroTitle, { color: theme.foreground }]}>Student Assessment</Text>
                  <Text style={[styles.heroSubtitle, { color: theme.mutedForeground }]}>
                    Enter your exam code or pick a scheduled paper below
                  </Text>
                </View>

                {/* Exam Access Code Card */}
                <Card style={styles.card}>
                  <CardHeader style={{ paddingBottom: 10 }}>
                    <CardTitle style={[styles.sectionHeaderTitle, { color: theme.mutedForeground }]}>
                      EXAM ACCESS CODE
                    </CardTitle>
                  </CardHeader>

                  <CardContent style={{ paddingTop: 0, gap: 14 }}>
                    <View style={styles.inputContainer}>
                      <Input
                        style={styles.inputField}
                        value={examCode}
                        onChangeText={handleCodeChange}
                        placeholder="e.g. EXAM-6724"
                        autoCapitalize="characters"
                        autoCorrect={false}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        style={styles.qrButton}
                        onPress={() => setIsQrModalOpen(true)}
                      >
                        <Ionicons name="qr-code-outline" size={16} color={theme.secondaryForeground} style={{ marginRight: 4 }} />
                        <Text style={[styles.qrButtonText, { color: theme.secondaryForeground }]}>SCAN</Text>
                      </Button>
                    </View>

                    {/* Quick-Select Exam Chips */}
                    <View style={styles.chipsSection}>
                      <View style={styles.chipsHeaderRow}>
                        <Text style={[styles.chipsLabel, { color: theme.mutedForeground }]}>SCHEDULED EXAMS</Text>
                        {isSearching && <Spinner size="sm" color={theme.mutedForeground} />}
                      </View>

                      {isLoadingExams ? (
                        <View style={{ gap: 6 }}>
                          <Skeleton height={38} borderRadius={8} />
                          <Skeleton height={38} borderRadius={8} />
                        </View>
                      ) : (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.chipsRow}
                        >
                          {allExams.map((ex) => {
                            const isSelected = matchedExam?.code === ex.code;
                            return (
                              <TouchableOpacity
                                key={ex.code}
                                style={[
                                  styles.examChip,
                                  { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                                  isSelected && { backgroundColor: theme.primary, borderColor: theme.primary },
                                ]}
                                activeOpacity={0.7}
                                onPress={() => handleSelectExam(ex)}
                              >
                                <Text
                                  style={[
                                    styles.examChipCode,
                                    { color: theme.foreground },
                                    isSelected && { color: theme.primaryForeground },
                                  ]}
                                >
                                  {ex.code}
                                </Text>
                                <Text
                                  style={[
                                    styles.examChipSubject,
                                    { color: theme.mutedForeground },
                                    isSelected && { color: isDark ? '#52525B' : '#A1A1AA' },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {ex.subject || ex.title}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      )}
                    </View>

                    {/* Error Notice */}
                    {accessError ? (
                      <View
                        style={[
                          styles.errorNotice,
                          isDark && { backgroundColor: 'rgba(239, 68, 68, 0.14)', borderColor: '#7F1D1D' },
                        ]}
                      >
                        <Ionicons name="alert-circle" size={15} color="#EF4444" />
                        <Text style={[styles.errorNoticeText, isDark && { color: '#FCA5A5' }]}>{accessError}</Text>
                      </View>
                    ) : null}

                    {/* Matched Exam Preview Card */}
                    {matchedExam && (() => {
                      const schedule = getExamScheduleInfo(matchedExam);
                      const attemptInfo = getExamAttemptInfo(matchedExam, recentScorecards);

                      return (
                        <View style={[styles.previewBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                          <View style={styles.previewTop}>
                            <Badge variant="secondary">
                              <Text style={[styles.previewBadgeText, { color: theme.secondaryForeground }]}>{matchedExam.code}</Text>
                            </Badge>
                            <Badge variant={matchedExam.enableAiProctoring !== false ? 'destructive' : 'secondary'}>
                              <Ionicons
                                name={matchedExam.enableAiProctoring !== false ? 'shield-checkmark' : 'book-outline'}
                                size={11}
                                color={matchedExam.enableAiProctoring !== false ? (isDark ? '#FCA5A5' : '#EF4444') : theme.mutedForeground}
                                style={{ marginRight: 3 }}
                              />
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: '700',
                                  color: matchedExam.enableAiProctoring !== false
                                    ? (isDark ? '#FCA5A5' : '#B91C1C')
                                    : theme.secondaryForeground,
                                }}
                              >
                                {matchedExam.enableAiProctoring !== false ? 'AI Proctored' : 'Standard'}
                              </Text>
                            </Badge>
                          </View>

                          <Text style={[styles.previewTitle, { color: theme.foreground }]} numberOfLines={2}>
                            {matchedExam.title}
                          </Text>
                          <Text style={[styles.previewSubject, { color: theme.mutedForeground }]}>{matchedExam.subject}</Text>

                          <View style={styles.metaSummaryRow}>
                            <View style={styles.metaItem}>
                              <Ionicons name="time-outline" size={13} color={theme.mutedForeground} />
                              <Text style={[styles.metaText, { color: theme.mutedForeground }]}>{matchedExam.durationMinutes} mins</Text>
                            </View>
                            <Text style={[styles.metaDot, { color: theme.border }]}>•</Text>
                            <View style={styles.metaItem}>
                              <Ionicons name="list-outline" size={13} color={theme.mutedForeground} />
                              <Text style={[styles.metaText, { color: theme.mutedForeground }]}>{matchedExam.questions.length} MCQs</Text>
                            </View>
                            <Text style={[styles.metaDot, { color: theme.border }]}>•</Text>
                            <View style={styles.metaItem}>
                              <Ionicons name="ribbon-outline" size={13} color={theme.mutedForeground} />
                              <Text style={[styles.metaText, { color: theme.mutedForeground }]}>{matchedExam.totalMarks} Marks</Text>
                            </View>
                          </View>

                          {/* Schedule or Single Attempt Note */}
                          {(matchedExam.startTime || isAttemptedOnDevice || attemptInfo.maxCandidates !== null) && (
                            <View style={[styles.previewFooterNotice, { borderTopColor: theme.border }]}>
                              {isAttemptedOnDevice ? (
                                <View style={styles.alreadyRow}>
                                  <Ionicons name="lock-closed" size={13} color="#F59E0B" />
                                  <Text style={styles.alreadyText}>
                                    Completed on this device (1 attempt allowed)
                                  </Text>
                                </View>
                              ) : schedule.isUpcoming ? (
                                <Text style={styles.scheduleTextUpcoming}>
                                  Starts on {schedule.startTimeFormatted}
                                </Text>
                              ) : schedule.isExpired ? (
                                <Text style={styles.scheduleTextExpired}>Assessment window closed</Text>
                              ) : attemptInfo.remainingSheets !== null ? (
                                <Text style={styles.sheetText}>
                                  {attemptInfo.remainingSheets} sheets available
                                </Text>
                              ) : null}
                            </View>
                          )}
                        </View>
                      );
                    })()}

                    {/* Action CTA Button */}
                    <Button
                      variant={
                        matchedExam?.singleAttemptOnly !== false && isAttemptedOnDevice
                          ? 'secondary'
                          : 'default'
                      }
                      size="lg"
                      style={styles.actionBtn}
                      isLoading={isSearching}
                      onPress={handleProceed}
                    >
                      {matchedExam?.singleAttemptOnly !== false && isAttemptedOnDevice ? (
                        <View style={styles.btnRow}>
                          <Ionicons name="lock-closed" size={16} color={theme.mutedForeground} />
                          <Text style={[styles.actionBtnTextSecondary, { color: theme.mutedForeground }]}>Already Attempted</Text>
                        </View>
                      ) : (
                        <View style={styles.btnRow}>
                          <Text style={[styles.actionBtnText, { color: theme.primaryForeground }]}>Start Assessment</Text>
                          <Ionicons name="arrow-forward" size={16} color={theme.primaryForeground} />
                        </View>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Quick Results Teaser */}
                {recentScorecards.length > 0 && (
                  <Card style={styles.scorecardsCard}>
                    <CardHeader style={styles.scorecardsHeader}>
                      <CardTitle style={{ fontSize: 13, fontWeight: '700' }}>Recent Result</CardTitle>
                      <TouchableOpacity
                        onPress={() => setActiveTab('results')}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.viewScorecardLink, { color: theme.foreground }]}>See All</Text>
                      </TouchableOpacity>
                    </CardHeader>
                    <CardContent style={{ paddingTop: 0 }}>
                      <TouchableOpacity
                        style={styles.scorecardRow}
                        activeOpacity={0.8}
                        onPress={() => onViewScorecard(recentScorecards[0], activeTab)}
                      >
                        <View style={[styles.scoreValueCircle, { backgroundColor: theme.secondary, borderColor: theme.border }]}>
                          <Text style={[styles.scoreValueText, { color: theme.foreground }]}>
                            {recentScorecards[0].percentage.toFixed(0)}%
                          </Text>
                        </View>
                        <View style={styles.scorecardMetaCol}>
                          <Text style={[styles.scorecardExamName, { color: theme.foreground }]} numberOfLines={1}>
                            {recentScorecards[0].examTitle}
                          </Text>
                          <Text style={[styles.scorecardDate, { color: theme.mutedForeground }]}>
                            {recentScorecards[0].examCode} • Score: {recentScorecards[0].totalScore} / {recentScorecards[0].maxScore}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={theme.mutedForeground} />
                      </TouchableOpacity>
                    </CardContent>
                  </Card>
                )}
          </ScrollView>

          {/* ========================================================
              TAB 2: RESULTS & HISTORY
             ======================================================== */}
          <ScrollView
            contentContainerStyle={[styles.scrollBody, { backgroundColor: theme.surface }]}
            style={{ flex: 1, backgroundColor: theme.surface, display: activeTab === 'results' ? 'flex' : 'none' }}
            showsVerticalScrollIndicator={false}
          >
                <View style={styles.heroSection}>
                  <Text style={[styles.heroTitle, { color: theme.foreground }]}>Results & Scorecards</Text>
                  <Text style={[styles.heroSubtitle, { color: theme.mutedForeground }]}>
                    Review past submissions, detailed metrics, and integrity records
                  </Text>
                </View>

                {recentScorecards.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <CardContent style={styles.emptyCardContent}>
                      <View style={[styles.emptyIconCircle, { backgroundColor: theme.secondary }]}>
                        <Ionicons name="document-text-outline" size={32} color={theme.mutedForeground} />
                      </View>
                      <Text style={[styles.emptyTitle, { color: theme.foreground }]}>No Submissions Yet</Text>
                      <Text style={[styles.emptySub, { color: theme.mutedForeground }]}>
                        Once you finish an examination, your certified scorecard and question breakdown will appear here.
                      </Text>
                      <Button
                        variant="default"
                        size="sm"
                        style={{ marginTop: 12 }}
                        onPress={() => setActiveTab('exams')}
                      >
                        Go to Exams
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <View style={{ gap: 12 }}>
                    {recentScorecards.map((sc, idx) => (
                      <Card key={sc.id || idx} style={styles.resultItemCard}>
                        <CardContent style={{ paddingVertical: 14 }}>
                          <View style={styles.resultItemHeader}>
                            <Badge variant={sc.isPassed ? 'success' : 'destructive'} style={{ borderRadius: 6 }}>
                              {sc.isPassed ? 'QUALIFIED' : 'NEEDS IMPROVEMENT'}
                            </Badge>
                            <Text style={[styles.resultItemDate, { color: theme.mutedForeground }]}>
                              {new Date(sc.submittedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </View>

                          <Text style={[styles.resultItemTitle, { color: theme.foreground }]}>{sc.examTitle}</Text>
                          <Text style={[styles.resultItemCode, { color: theme.mutedForeground }]}>Paper Code: {sc.examCode}</Text>

                          <Separator style={{ marginVertical: 10 }} />

                          <View style={styles.resultStatsRow}>
                            <View style={styles.resultStatCol}>
                              <Text style={[styles.resultStatLabel, { color: theme.mutedForeground }]}>Score</Text>
                              <Text style={[styles.resultStatVal, { color: theme.foreground }]}>
                                {sc.totalScore} / {sc.maxScore}
                              </Text>
                            </View>
                            <View style={styles.resultStatCol}>
                              <Text style={[styles.resultStatLabel, { color: theme.mutedForeground }]}>Percentage</Text>
                              <Text style={[styles.resultStatVal, { color: sc.isPassed ? '#10B981' : '#EF4444' }]}>
                                {sc.percentage.toFixed(1)}%
                              </Text>
                            </View>
                            <View style={styles.resultStatCol}>
                              <Text style={[styles.resultStatLabel, { color: theme.mutedForeground }]}>Questions</Text>
                              <Text style={[styles.resultStatVal, { color: theme.foreground }]}>
                                {sc.attemptedCount} / {sc.totalQuestions}
                              </Text>
                            </View>
                          </View>

                          <Button
                            variant="outline"
                            size="sm"
                            style={styles.viewResultBtn}
                            onPress={() => onViewScorecard(sc, activeTab)}
                          >
                            <Ionicons name="eye-outline" size={14} color={theme.foreground} style={{ marginRight: 6 }} />
                            <Text style={[styles.viewResultBtnText, { color: theme.foreground }]}>View Full Audit Breakdown</Text>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </View>
                )}
          </ScrollView>

          {/* ========================================================
              TAB 3: CANDIDATE PROFILE & INTEGRITY
             ======================================================== */}
          <ScrollView
            contentContainerStyle={[styles.scrollBody, { backgroundColor: theme.surface }]}
            style={{ flex: 1, backgroundColor: theme.surface, display: activeTab === 'profile' ? 'flex' : 'none' }}
            showsVerticalScrollIndicator={false}
          >
                <View style={styles.heroSection}>
                  <Text style={[styles.heroTitle, { color: theme.foreground }]}>Candidate Profile</Text>
                  <Text style={[styles.heroSubtitle, { color: theme.mutedForeground }]}>
                    Verified student credentials and single-device integrity lock
                  </Text>
                </View>

                {/* Identity Card */}
                <Card style={styles.card}>
                  <CardContent style={styles.profileCardContent}>
                    <Avatar size={64} style={{ backgroundColor: theme.primary, alignSelf: 'center' }}>
                      <AvatarFallback
                        text={(profile.name.slice(0, 2) || 'ST').toUpperCase()}
                        style={{ fontSize: 22, color: theme.primaryForeground }}
                      />
                    </Avatar>

                    <View style={{ alignItems: 'center', marginTop: 10 }}>
                      <Text style={[styles.profileFullName, { color: theme.foreground }]}>{profile.name}</Text>
                      <Text style={[styles.profileRollNum, { color: theme.mutedForeground }]}>Roll #{profile.rollNumber}</Text>
                      <Badge variant="outline" style={{ marginTop: 6 }}>
                        <Ionicons name="checkmark-circle" size={11} color="#10B981" style={{ marginRight: 3 }} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: theme.foreground }}>Verified Candidate</Text>
                      </Badge>
                    </View>

                    <Separator style={{ marginVertical: 14 }} />

                    <View style={styles.profileFieldRow}>
                      <Text style={[styles.profileFieldLabel, { color: theme.mutedForeground }]}>Email</Text>
                      <Text style={[styles.profileFieldValue, { color: theme.foreground }]}>{profile.email || 'Not provided'}</Text>
                    </View>

                    <View style={styles.profileFieldRow}>
                      <Text style={[styles.profileFieldLabel, { color: theme.mutedForeground }]}>Department</Text>
                      <Text style={[styles.profileFieldValue, { color: theme.foreground }]}>{profile.department || 'Undergraduate'}</Text>
                    </View>

                    <View style={styles.profileFieldRow}>
                      <Text style={[styles.profileFieldLabel, { color: theme.mutedForeground }]}>Device Binding</Text>
                      <Text style={[styles.profileFieldValue, { color: theme.foreground }]}>
                        {Platform.OS === 'android' ? 'Android Native PIN' : Platform.OS === 'ios' ? 'iOS Device PIN' : 'Web Browser PIN'}
                      </Text>
                    </View>

                    <Button
                      variant="default"
                      size="default"
                      style={{ marginTop: 14 }}
                      onPress={handleOpenProfileEdit}
                    >
                      <Ionicons name="pencil-outline" size={15} color={theme.primaryForeground} style={{ marginRight: 6 }} />
                      <Text style={{ color: theme.primaryForeground, fontWeight: '700' }}>Edit Profile Information</Text>
                    </Button>
                  </CardContent>
                </Card>

                {/* System & Cloud Connectivity Card */}
                <Card style={styles.card}>
                  <CardHeader style={{ paddingBottom: 8 }}>
                    <CardTitle style={[styles.sectionHeaderTitle, { color: theme.mutedForeground }]}>SYSTEM STATUS</CardTitle>
                  </CardHeader>
                  <CardContent style={{ paddingTop: 0, gap: 10 }}>
                    <View style={styles.systemStatusRow}>
                      <View style={styles.statusDotGreen} />
                      <Text style={[styles.systemStatusText, { color: theme.foreground }]}>SuryaPlatform Cloud: Connected</Text>
                      <Badge variant="secondary" style={{ marginLeft: 'auto' }}>
                        99.8% Sync
                      </Badge>
                    </View>
                    <View style={styles.systemStatusRow}>
                      <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
                      <Text style={[styles.systemStatusText, { color: theme.foreground }]}>AI Proctoring Engine: Ready</Text>
                    </View>
                    <View style={styles.systemStatusRow}>
                      <Ionicons name="hardware-chip-outline" size={16} color={theme.foreground} />
                      <Text style={[styles.systemStatusText, { color: theme.foreground }]}>Kiosk Shield: Standby</Text>
                    </View>
                  </CardContent>
                </Card>
          </ScrollView>
        </FadeIn>

        {/* Bottom Tabs Navigation */}
        <BottomTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          examsBadge={allExams.length}
          resultsBadge={recentScorecards.length}
        />

        {/* QR Scanner Modal */}
        <QRScannerModal
          visible={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          onScanned={(code) => handleCodeChange(code)}
          availableExams={allExams}
        />

        {/* Profile Edit Modal */}
        <Modal
          visible={isProfileModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsProfileModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalHeading, { color: theme.foreground }]}>Candidate Profile</Text>
                <TouchableOpacity onPress={() => setIsProfileModalOpen(false)}>
                  <Ionicons name="close" size={20} color={theme.mutedForeground} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalForm}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.mutedForeground }]}>Full Name</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.foreground }]}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Candidate Name"
                    placeholderTextColor={theme.mutedForeground}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.mutedForeground }]}>Roll Number / ID</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.foreground }]}
                    value={editRoll}
                    onChangeText={setEditRoll}
                    placeholder="Roll Number"
                    placeholderTextColor={theme.mutedForeground}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.mutedForeground }]}>Department / Stream</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.foreground }]}
                    value={editDept}
                    onChangeText={setEditDept}
                    placeholder="Department"
                    placeholderTextColor={theme.mutedForeground}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.mutedForeground }]}>Email Address</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.foreground }]}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    placeholder="Email"
                    placeholderTextColor={theme.mutedForeground}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <Button
                  variant="default"
                  size="default"
                  style={{ marginTop: 6 }}
                  onPress={handleSaveProfile}
                >
                  Save Profile
                </Button>
              </View>
            </View>
          </View>
        </Modal>

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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#09090B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#09090B',
    letterSpacing: -0.3,
  },
  platformBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#F4F4F5',
    gap: 6,
  },
  profilePillName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#09090B',
    maxWidth: 90,
  },
  topTabSwitchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  topTabSwitchBar: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  topTabSwitchItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 8,
  },
  topTabSwitchItemActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  topTabSwitchText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 30,
  },
  heroSection: {
    marginBottom: 16,
    marginTop: 2,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#09090B',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#71717A',
    lineHeight: 18,
  },
  card: {
    borderRadius: 14,
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#71717A',
    fontWeight: '800',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputField: {
    flex: 1,
  },
  qrButton: {
    height: 44,
    paddingHorizontal: 12,
  },
  qrButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#09090B',
  },
  chipsSection: {
    gap: 6,
  },
  chipsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#71717A',
    letterSpacing: 0.5,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  examChip: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 2,
  },
  examChipSelected: {
    backgroundColor: '#09090B',
    borderColor: '#09090B',
  },
  examChipCode: {
    fontSize: 11,
    fontWeight: '800',
    color: '#09090B',
  },
  examChipCodeSelected: {
    color: '#FAFAFA',
  },
  examChipSubject: {
    fontSize: 10,
    color: '#71717A',
    maxWidth: 120,
  },
  examChipSubjectSelected: {
    color: '#A1A1AA',
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 10,
  },
  errorNoticeText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    flex: 1,
  },
  previewBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 6,
  },
  previewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#09090B',
    marginTop: 2,
  },
  previewSubject: {
    fontSize: 11,
    color: '#71717A',
  },
  metaSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#71717A',
    fontWeight: '600',
  },
  metaDot: {
    color: '#D4D4D8',
    fontSize: 11,
  },
  previewFooterNotice: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  alreadyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alreadyText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '700',
  },
  scheduleTextUpcoming: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '700',
  },
  scheduleTextExpired: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '700',
  },
  sheetText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
  },
  actionBtn: {
    borderRadius: 10,
    height: 48,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnText: {
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '800',
  },
  actionBtnTextSecondary: {
    color: '#71717A',
    fontSize: 14,
    fontWeight: '700',
  },
  scorecardsCard: {
    borderRadius: 12,
  },
  scorecardsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
  },
  viewScorecardLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#09090B',
  },
  scorecardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  scoreValueCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F4F4F5',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValueText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#09090B',
  },
  scorecardMetaCol: {
    flex: 1,
  },
  scorecardExamName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#09090B',
  },
  scorecardDate: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 2,
  },
  emptyCard: {
    borderRadius: 14,
    paddingVertical: 20,
  },
  emptyCardContent: {
    alignItems: 'center',
    gap: 8,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#09090B',
    marginTop: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#71717A',
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
  },
  resultItemCard: {
    borderRadius: 12,
  },
  resultItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  resultItemDate: {
    fontSize: 11,
    color: '#71717A',
  },
  resultItemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#09090B',
  },
  resultItemCode: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 2,
  },
  resultStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  resultStatCol: {
    alignItems: 'center',
  },
  resultStatLabel: {
    fontSize: 10,
    color: '#71717A',
    fontWeight: '600',
  },
  resultStatVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#09090B',
    marginTop: 2,
  },
  viewResultBtn: {
    borderRadius: 8,
    height: 36,
  },
  viewResultBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#09090B',
  },
  profileCardContent: {
    paddingVertical: 16,
  },
  profileFullName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#09090B',
  },
  profileRollNum: {
    fontSize: 12,
    color: '#71717A',
    marginTop: 2,
  },
  profileFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  profileFieldLabel: {
    fontSize: 12,
    color: '#71717A',
    fontWeight: '600',
  },
  profileFieldValue: {
    fontSize: 12,
    color: '#09090B',
    fontWeight: '700',
  },
  systemStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  systemStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#09090B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 11, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#09090B',
  },
  modalForm: {
    gap: 12,
  },
  inputGroup: {
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717A',
  },
  modalInput: {
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#09090B',
    backgroundColor: '#F8FAFC',
  },
});
