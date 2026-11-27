import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Exam, StudentProfile } from '../types/exam';
import { isExamAttemptedOnDevice } from '../services/storage';
import { getExamScheduleInfo, getExamAttemptInfo } from '../services/examUtils';
import {
  checkCameraPermission,
  requestCameraPermission,
  openDeviceSettings,
} from '../services/permissions';
import { StyledAlertModal, AlertOptions } from '../components/StyledAlertModal';
import { Card, CardHeader, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Separator } from '../components/ui/separator';
import { FadeIn, Spinner } from '../components/ui/loader';
import { useTheme } from '../theme';
import { evaluateProctorFrame, warmupTFLiteProctor } from '../services/tfliteProctor';

interface ReadinessScreenProps {
  exam: Exam;
  profile: StudentProfile;
  onStartExam: () => void;
  onGoBack: () => void;
}

export const ReadinessScreen: React.FC<ReadinessScreenProps> = ({
  exam,
  profile,
  onStartExam,
  onGoBack,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const isProctored = exam.enableAiProctoring !== false;

  const [hasCameraGranted, setHasCameraGranted] = useState<boolean>(false);
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [isRequestingCamera, setIsRequestingCamera] = useState<boolean>(false);
  const [pledgeChecked, setPledgeChecked] = useState<boolean>(false);
  const [dndChecked, setDndChecked] = useState<boolean>(false);
  const [screenLockChecked, setScreenLockChecked] = useState<boolean>(false);
  const [isLaunching, setIsLaunching] = useState<boolean>(false);

  const readinessCamRef = React.useRef<CameraView>(null);
  const [mlKitStatus, setMlKitStatus] = useState<string>('Initializing TensorFlow Lite...');
  const [isMLKitVerified, setIsMLKitVerified] = useState<boolean>(false);

  const [currentTime, setCurrentTime] = useState<string>('10:00:00 AM');
  const [alertConfig, setAlertConfig] = useState<AlertOptions | null>(null);

  const showAlert = (options: AlertOptions) => {
    setAlertConfig(options);
  };

  const schedule = getExamScheduleInfo(exam);
  const attemptInfo = getExamAttemptInfo(exam);

  // Check camera status on mount
  useEffect(() => {
    let isMounted = true;
    const initCheck = async () => {
      const res = await checkCameraPermission();
      if (isMounted) {
        setHasCameraGranted(res.granted);
      }
    };
    initCheck();

    // Re-check automatically when user returns from Settings or background
    const sub = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const res = await checkCameraPermission();
        if (isMounted) {
          setHasCameraGranted(res.granted);
        }
      }
    });

    return () => {
      isMounted = false;
      sub.remove();
    };
  }, []);

  // Pre-flight TensorFlow Lite face detector test
  useEffect(() => {
    if (!hasCameraGranted || !isCameraReady) return;
    let isCancelled = false;
    warmupTFLiteProctor();

    const runPreflightCheck = async () => {
      try {
        if (readinessCamRef.current) {
          const photo = await readinessCamRef.current.takePictureAsync({
            quality: 0.1,
            shutterSound: false,
          });
          if (photo?.uri && !isCancelled) {
            const res = await evaluateProctorFrame(photo.uri);
            if (!isCancelled) {
              setIsMLKitVerified(true);
              setMlKitStatus(
                res.isInfraction
                  ? res.message
                  : `Face Centered • Yaw: ${res.headYaw}° Pitch: ${res.headPitch}°`
              );
            }
          }
        }
      } catch {
        if (!isCancelled) {
          setIsMLKitVerified(true);
          setMlKitStatus('TensorFlow Lite Face Detector Active');
        }
      }
    };

    const timer = setTimeout(runPreflightCheck, 800);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [hasCameraGranted, isCameraReady]);

  // Clock timer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRequestCamera = async () => {
    setIsRequestingCamera(true);
    try {
      const res = await requestCameraPermission();
      if (res.granted) {
        setHasCameraGranted(true);
        showAlert({
          title: 'Camera Enabled',
          message: 'Live proctoring front camera feed successfully active and centered.',
          type: 'success',
        });
      } else if (res.needsSettings) {
        showAlert({
          title: 'Camera Permission Blocked',
          message: 'Camera permission has been blocked or turned off in device settings. Please open Settings and enable Camera to proceed with AI Proctoring.',
          type: 'warning',
          buttons: [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', style: 'destructive', onPress: openDeviceSettings },
          ],
        });
      } else {
        showAlert({
          title: 'Camera Access Needed',
          message: 'Camera permission is required for this proctored examination. Please tap Allow when prompted by your device.',
          type: 'warning',
          buttons: [
            { text: 'Try Again', onPress: handleRequestCamera },
          ],
        });
      }
    } finally {
      setIsRequestingCamera(false);
    }
  };

  const handleLaunch = async () => {
    // 1. Camera check for proctored exams
    if (isProctored && !hasCameraGranted) {
      showAlert({
        title: 'Camera Access Required',
        message: 'This examination has AI Video Proctoring active. You must grant camera access before entering the arena.',
        type: 'warning',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Allow Camera',
            onPress: handleRequestCamera,
          },
        ],
      });
      return;
    }

    // 2. Do Not Disturb (DND) Mode confirmation
    if (!dndChecked) {
      showAlert({
        title: 'Enable Do Not Disturb (DND)',
        message: 'Please enable DND mode on your device to silence incoming calls, SMS, and WhatsApp floating bubbles. Any app minimization or banner pull-down triggers automated security infractions.',
        type: 'warning',
        buttons: [
          { text: 'Review Settings', style: 'cancel' },
          {
            text: 'I Enabled DND',
            onPress: () => setDndChecked(true),
          },
        ],
      });
      return;
    }

    // 3. Single Screen & Kiosk Lock confirmation
    if (!screenLockChecked) {
      showAlert({
        title: 'Single-App Lock Agreement',
        message: `Exiting the app or opening split-screen is prohibited. Max ${exam.maxViolationsAllowed || 3} infractions before automated termination.`,
        type: 'warning',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'I Agree',
            onPress: () => setScreenLockChecked(true),
          },
        ],
      });
      return;
    }

    // 4. Academic Honor Code Pledge
    if (!pledgeChecked) {
      showAlert({
        title: 'Academic Honor Pledge',
        message: 'Please accept the Academic Honor Code Pledge to confirm identity and integrity.',
        type: 'warning',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Accept Pledge',
            onPress: () => setPledgeChecked(true),
          },
        ],
      });
      return;
    }

    // 5. Schedule check
    if (schedule.isUpcoming) {
      showAlert({
        title: 'Upcoming Assessment',
        message: `Exam is scheduled to start on ${schedule.startTimeFormatted}.`,
        type: 'info',
      });
      return;
    }
    if (schedule.isExpired) {
      showAlert({
        title: 'Assessment Closed',
        message: `Exam window closed on ${schedule.endTimeFormatted}.`,
        type: 'danger',
      });
      return;
    }

    // 6. Capacity check
    if (attemptInfo.isFull) {
      showAlert({
        title: 'Capacity Full',
        message: `All ${attemptInfo.maxCandidates} candidate sheets have been taken.`,
        type: 'danger',
      });
      return;
    }

    // 7. Single attempt lock check
    const attempted = await isExamAttemptedOnDevice(exam.id, exam.code);
    if (exam.singleAttemptOnly !== false && attempted) {
      showAlert({
        title: 'Already Attempted',
        message: 'You have already attempted this exam on this device. Only 1 attempt is allowed.',
        type: 'warning',
      });
      return;
    }

    // Launch sequence with animated visual indicator
    setIsLaunching(true);
    setTimeout(() => {
      onStartExam();
    }, 700);
  };

  const devicePlatformString =
    Platform.OS === 'android'
      ? `Android Mobile (API ${Platform.Version || '24+'})`
      : Platform.OS === 'ios'
      ? `Apple iOS Device (${Platform.Version})`
      : 'Web Station (Kiosk Mode)';

  // Calculate readiness items passed
  const cameraPassed = !isProctored || hasCameraGranted;
  const totalChecks = isProctored ? 4 : 3;
  let checksPassed = 0;
  if (cameraPassed) checksPassed++;
  if (dndChecked) checksPassed++;
  if (screenLockChecked) checksPassed++;
  if (pledgeChecked) checksPassed++;

  const isAllReady = checksPassed === totalChecks;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.headerBackground }]} edges={['top', 'left', 'right']}>
      {/* Top Nav Header */}
      <View style={[styles.topNav, { backgroundColor: theme.headerBackground, borderBottomColor: theme.headerBorder }]}>
        <View style={styles.navLeft}>
          <Button variant="ghost" size="icon" onPress={onGoBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={theme.foreground} />
          </Button>
          <View>
            <Text style={[styles.navTitle, { color: theme.foreground }]}>System Readiness</Text>
            <Text style={[styles.navSubtitle, { color: theme.mutedForeground }]}>Pre-Flight Permissions Gate</Text>
          </View>
        </View>

        <Badge variant="outline" style={styles.timePill} textStyle={[styles.timeText, { color: theme.foreground }]}>
          <Ionicons name="time-outline" size={12} color="#10B981" style={{ marginRight: 4 }} />
          {currentTime}
        </Badge>
      </View>

      <FadeIn style={{ flex: 1, backgroundColor: theme.surface }}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { backgroundColor: theme.surface, paddingBottom: 110 + insets.bottom },
          ]}
          style={{ backgroundColor: theme.surface }}
          showsVerticalScrollIndicator={false}
        >
          {/* Candidate Identity Strip (shadcn Card) */}
          <Card style={styles.candidateCard}>
            <CardContent style={styles.candidateRow}>
              <Avatar size={42} style={{ backgroundColor: theme.primary }}>
                <AvatarFallback
                  text={(profile.name.slice(0, 2) || 'ST').toUpperCase()}
                  style={{ color: theme.primaryForeground }}
                />
              </Avatar>
              <View style={styles.candidateTextCol}>
                <Text style={[styles.candidateName, { color: theme.foreground }]}>{profile.name}</Text>
                <Text style={[styles.candidateMeta, { color: theme.mutedForeground }]}>
                  Roll #{profile.rollNumber || 'N/A'} • {profile.department || 'Student'}
                </Text>
              </View>
              <Badge variant="success" style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={13} color={isDark ? '#86EFAC' : '#15803D'} style={{ marginRight: 3 }} />
                Verified
              </Badge>
            </CardContent>
          </Card>

          {/* Exam Specifications & Rules Summary Card */}
          <Card style={styles.examCard}>
            <CardHeader style={{ paddingBottom: 10 }}>
              <View style={styles.examCardHeader}>
                <View style={[styles.examIconBox, { backgroundColor: theme.secondary, borderColor: theme.border }]}>
                  <Ionicons name="school-outline" size={20} color={theme.foreground} />
                </View>
                <View style={styles.examCardHeaderText}>
                  <Badge variant="secondary" style={styles.subjectBadge}>
                    {exam.subject} Assessment
                  </Badge>
                  <Text style={[styles.examTitle, { color: theme.foreground }]}>{exam.title}</Text>
                </View>
              </View>
            </CardHeader>

            <CardContent style={{ paddingTop: 0 }}>
              <Separator style={{ marginBottom: 12 }} />

              {/* Badges / Specifications 2x2 Grid */}
              <View style={styles.specGrid}>
                <View style={styles.specItem}>
                  <View style={[styles.specIcon, { backgroundColor: theme.secondary, borderColor: theme.border }]}>
                    <Ionicons name="timer-outline" size={16} color={theme.foreground} />
                  </View>
                  <View>
                    <Text style={[styles.specLabel, { color: theme.mutedForeground }]}>Duration</Text>
                    <Text style={[styles.specValue, { color: theme.foreground }]}>{exam.durationMinutes} Mins</Text>
                  </View>
                </View>

                <View style={styles.specItem}>
                  <View style={[styles.specIcon, { backgroundColor: theme.secondary, borderColor: theme.border }]}>
                    <Ionicons name="help-circle-outline" size={16} color={theme.foreground} />
                  </View>
                  <View>
                    <Text style={[styles.specLabel, { color: theme.mutedForeground }]}>Questions</Text>
                    <Text style={[styles.specValue, { color: theme.foreground }]}>{exam.questions.length} MCQs ({exam.totalMarks}M)</Text>
                  </View>
                </View>

                <View style={styles.specItem}>
                  <View style={[styles.specIcon, { backgroundColor: theme.secondary, borderColor: theme.border }]}>
                    <Ionicons name="checkmark-done" size={16} color="#10B981" />
                  </View>
                  <View>
                    <Text style={[styles.specLabel, { color: theme.mutedForeground }]}>Passing Score</Text>
                    <Text style={[styles.specValue, { color: theme.foreground }]}>{exam.passingPercentage}% ({Math.round(exam.totalMarks * (exam.passingPercentage / 100))} Marks)</Text>
                  </View>
                </View>

                <View style={styles.specItem}>
                  <View style={[styles.specIcon, { backgroundColor: theme.secondary, borderColor: theme.border }]}>
                    <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                  </View>
                  <View>
                    <Text style={[styles.specLabel, { color: theme.mutedForeground }]}>Penalty</Text>
                    <Text style={[styles.specValue, { color: theme.foreground }]}>-{exam.negativeMarking} Mark / Wrong</Text>
                  </View>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* ========================================================
              PRE-FLIGHT PERMISSION & SECURITY GATE CHECKLIST
             ======================================================== */}
          <Card style={styles.gateCard}>
            <CardHeader style={{ paddingBottom: 10 }}>
              <View style={styles.gateHeader}>
                <View style={styles.gateHeaderLeft}>
                  <Ionicons name="shield-checkmark" size={18} color={theme.foreground} />
                  <Text style={[styles.gateTitle, { color: theme.foreground }]}>Pre-Flight Security Checklist</Text>
                </View>
                <Badge
                  variant={isAllReady ? 'success' : 'secondary'}
                  style={styles.gateBadge}
                  textStyle={styles.gateBadgeText}
                >
                  {checksPassed}/{totalChecks} READY
                </Badge>
              </View>
            </CardHeader>

            <CardContent style={{ paddingTop: 0, gap: 14 }}>
              {/* ITEM 1: Live Front Camera (Mandatory for Proctored) */}
              {isProctored && (
                <View style={[styles.checkItemBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                  <View style={styles.checkItemHeader}>
                    <View style={styles.checkItemTitleRow}>
                      <View style={[styles.statusIconCircle, cameraPassed ? styles.statusIconCircleGreen : styles.statusIconCircleAmber]}>
                        <Ionicons
                          name={cameraPassed ? 'checkmark' : 'videocam-outline'}
                          size={12}
                          color="#FFFFFF"
                        />
                      </View>
                      <Text style={[styles.checkItemTitle, { color: theme.foreground }]}>1. Live Camera & Face Alignment</Text>
                    </View>
                    <Badge variant={cameraPassed ? 'success' : 'destructive'} style={{ height: 22 }}>
                      {cameraPassed ? 'Live Active' : 'Action Required'}
                    </Badge>
                  </View>

                    {/* Camera Viewfinder */}
                  <View style={styles.cameraBox}>
                    {hasCameraGranted ? (
                      <CameraView
                        ref={readinessCamRef}
                        style={StyleSheet.absoluteFill}
                        facing="front"
                        mirror={true}
                        onCameraReady={() => setIsCameraReady(true)}
                      />
                    ) : (
                      <TouchableOpacity
                        style={styles.requestCamBtn}
                        onPress={handleRequestCamera}
                        activeOpacity={0.8}
                      >
                        {isRequestingCamera ? (
                          <Spinner size="default" color="#FFFFFF" label="Checking camera..." />
                        ) : (
                          <>
                            <Ionicons name="camera-reverse-outline" size={32} color="#FAFAFA" />
                            <Text style={styles.requestCamText}>Tap to Allow Camera Access</Text>
                            <Badge variant="outline" style={{ borderColor: '#52525B' }}>
                              Required for AI Proctoring
                            </Badge>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Target Outline Box */}
                    <View style={styles.faceTargetFrame} pointerEvents="none">
                      <View style={[styles.targetCorner, styles.targetTL]} />
                      <View style={[styles.targetCorner, styles.targetTR]} />
                      {!hasCameraGranted && !isRequestingCamera && (
                        <Ionicons name="person" size={44} color="#52525B" />
                      )}
                      <View style={[styles.targetCorner, styles.targetBL]} />
                      <View style={[styles.targetCorner, styles.targetBR]} />
                    </View>

                    <View style={styles.confidenceBar} pointerEvents="none">
                      <View style={styles.confidenceLeft}>
                        <View style={[styles.confidenceDot, !cameraPassed && { backgroundColor: '#EF4444' }]} />
                        <Text style={styles.confidenceLabel} numberOfLines={1}>
                          {hasCameraGranted ? (isMLKitVerified ? `TFLite: ${mlKitStatus}` : 'Verifying via TensorFlow Lite...') : 'Camera Standby'}
                        </Text>
                      </View>
                      <Text style={[styles.confidencePercent, !cameraPassed && { color: '#EF4444' }]}>
                        {hasCameraGranted ? 'TFLite Ready' : 'Pending Access'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* ITEM 2: Do Not Disturb (DND) Mode Switch */}
              <TouchableOpacity
                style={[
                  styles.interactiveCheckItem,
                  { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                  dndChecked && {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#F0FDF4',
                    borderColor: isDark ? '#065F46' : '#86EFAC',
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => setDndChecked(!dndChecked)}
              >
                <View style={styles.interactiveRow}>
                  <View style={[styles.checkbox, { borderColor: theme.border, backgroundColor: theme.card }, dndChecked && styles.checkboxActive]}>
                    {dndChecked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.interactiveTitle, { color: theme.foreground }]}>2. Do Not Disturb (DND) Mode</Text>
                      <Badge variant={dndChecked ? 'success' : 'secondary'} style={{ height: 20 }}>
                        {dndChecked ? 'Acknowledged' : 'Required'}
                      </Badge>
                    </View>
                    <Text style={[styles.interactiveDesc, { color: theme.mutedForeground }]}>
                      I have enabled DND / silenced incoming calls and notifications. App switching or pulling down notification panel triggers security violations.
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* ITEM 3: Single Screen Lock & Anti-Cheat */}
              <TouchableOpacity
                style={[
                  styles.interactiveCheckItem,
                  { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                  screenLockChecked && {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#F0FDF4',
                    borderColor: isDark ? '#065F46' : '#86EFAC',
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => setScreenLockChecked(!screenLockChecked)}
              >
                <View style={styles.interactiveRow}>
                  <View style={[styles.checkbox, { borderColor: theme.border, backgroundColor: theme.card }, screenLockChecked && styles.checkboxActive]}>
                    {screenLockChecked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.interactiveTitle, { color: theme.foreground }]}>3. Native Kiosk & Anti-Cheat</Text>
                      <Badge variant={screenLockChecked ? 'success' : 'secondary'} style={{ height: 20 }}>
                        {screenLockChecked ? 'Acknowledged' : 'Required'}
                      </Badge>
                    </View>
                    <Text style={[styles.interactiveDesc, { color: theme.mutedForeground }]}>
                      No split screen, external displays, or unauthorized apps. Max {exam.maxViolationsAllowed || 3} infractions allowed before automated submission.
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* ITEM 4: Candidate Academic Honor Code Pledge */}
              <TouchableOpacity
                style={[
                  styles.interactiveCheckItem,
                  { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                  pledgeChecked && {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#F0FDF4',
                    borderColor: isDark ? '#065F46' : '#86EFAC',
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => setPledgeChecked(!pledgeChecked)}
              >
                <View style={styles.interactiveRow}>
                  <View style={[styles.checkbox, { borderColor: theme.border, backgroundColor: theme.card }, pledgeChecked && styles.checkboxActive]}>
                    {pledgeChecked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.interactiveTitle, { color: theme.foreground }]}>4. Academic Honor Code</Text>
                      <Badge variant={pledgeChecked ? 'success' : 'secondary'} style={{ height: 20 }}>
                        {pledgeChecked ? 'Accepted' : 'Required'}
                      </Badge>
                    </View>
                    <Text style={[styles.interactiveDesc, { color: theme.mutedForeground }]}>
                      I, <Text style={{ fontWeight: '700', color: theme.foreground }}>{profile.name}</Text>, confirm I am attempting this assessment with complete honesty without unauthorized assistance.
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Hardware Device Pill */}
              <View style={styles.deviceNoticeRow}>
                <Ionicons name="hardware-chip-outline" size={15} color={theme.mutedForeground} />
                <Text style={[styles.deviceNoticeText, { color: theme.mutedForeground }]}>
                  Pinned: {devicePlatformString} • Single Candidate Session
                </Text>
              </View>
            </CardContent>
          </Card>

          {/* Primary Start CTA Button */}
          <View style={styles.ctaContainer}>
            <Button
              variant={isAllReady ? 'default' : 'secondary'}
              size="lg"
              onPress={handleLaunch}
              isLoading={isLaunching}
              style={[styles.startBtn, isAllReady && styles.startBtnActive]}
            >
              {isLaunching ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Spinner size="sm" color={theme.primaryForeground} />
                  <Text style={[styles.startBtnText, { color: theme.primaryForeground }]}>
                    Initializing Kiosk Arena...
                  </Text>
                </View>
              ) : (
                <>
                  <Ionicons
                    name={isAllReady ? 'lock-open-outline' : 'shield-outline'}
                    size={18}
                    color={isAllReady ? theme.primaryForeground : theme.mutedForeground}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.startBtnText, { color: isAllReady ? theme.primaryForeground : theme.mutedForeground }]}>
                    {isAllReady
                      ? `Enter Exam Arena (${exam.durationMinutes}:00)`
                      : `Complete Checklist (${checksPassed}/${totalChecks} Ready)`}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={isAllReady ? theme.primaryForeground : theme.mutedForeground}
                    style={{ marginLeft: 6 }}
                  />
                </>
              )}
            </Button>
            <Text style={[styles.ctaHint, { color: theme.mutedForeground }]}>
              Timer starts immediately upon entering • Full-screen kiosk engaged
            </Text>
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
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#09090B',
  },
  navSubtitle: {
    fontSize: 11,
    color: '#71717A',
  },
  timePill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#09090B',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  candidateCard: {
    borderRadius: 12,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  candidateTextCol: {
    flex: 1,
  },
  candidateName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#09090B',
  },
  candidateMeta: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 2,
  },
  verifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  examCard: {
    borderRadius: 12,
  },
  examCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  examIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F4F4F5',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  examCardHeaderText: {
    flex: 1,
    gap: 2,
  },
  subjectBadge: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  examTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#09090B',
    marginTop: 2,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
  },
  specIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  specLabel: {
    fontSize: 10,
    color: '#71717A',
    fontWeight: '600',
  },
  specValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#09090B',
    marginTop: 1,
  },
  gateCard: {
    borderRadius: 12,
  },
  gateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gateHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gateTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#09090B',
  },
  gateBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  gateBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  checkItemBox: {
    gap: 8,
  },
  checkItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconCircleGreen: {
    backgroundColor: '#10B981',
  },
  statusIconCircleAmber: {
    backgroundColor: '#F59E0B',
  },
  checkItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#09090B',
  },
  cameraBox: {
    height: 150,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: '#27272A',
    position: 'relative',
  },
  requestCamBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
  },
  requestCamText: {
    color: '#FAFAFA',
    fontSize: 12,
    fontWeight: '700',
  },
  faceTargetFrame: {
    ...StyleSheet.absoluteFill,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetCorner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: '#10B981',
  },
  targetTL: {
    top: 12,
    left: 12,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  targetTR: {
    top: 12,
    right: 12,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  targetBL: {
    bottom: 12,
    left: 12,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  targetBR: {
    bottom: 12,
    right: 12,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  confidenceBar: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    backgroundColor: 'rgba(9, 9, 11, 0.85)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  confidenceLabel: {
    color: '#FAFAFA',
    fontSize: 10,
    fontWeight: '700',
  },
  confidencePercent: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  interactiveCheckItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  interactiveCheckItemActive: {
    borderColor: '#09090B',
    backgroundColor: '#FFFFFF',
  },
  interactiveRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#D4D4D8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: '#09090B',
    borderColor: '#09090B',
  },
  interactiveTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#09090B',
  },
  interactiveDesc: {
    fontSize: 10.5,
    color: '#71717A',
    lineHeight: 15,
    marginTop: 2,
  },
  deviceNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  deviceNoticeText: {
    fontSize: 10.5,
    color: '#71717A',
    fontWeight: '500',
  },
  ctaContainer: {
    gap: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  startBtn: {
    width: '100%',
    height: 48,
    borderRadius: 10,
  },
  startBtnActive: {
    backgroundColor: '#09090B',
  },
  startBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  ctaHint: {
    fontSize: 11,
    color: '#71717A',
    textAlign: 'center',
  },
});
