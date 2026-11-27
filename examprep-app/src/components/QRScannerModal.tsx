import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { CameraView, BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { defaultMockExams } from '../services/storage';
import { normalizeExamCode } from '../services/firebase';
import {
  checkCameraPermission,
  requestCameraPermission,
  openDeviceSettings,
} from '../services/permissions';
import { Exam } from '../types/exam';
import { Card, CardHeader, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useTheme } from '../theme';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
  availableExams?: Exam[];
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  visible,
  onClose,
  onScanned,
  availableExams,
}) => {
  const { theme } = useTheme();
  const [hasCameraGranted, setHasCameraGranted] = useState<boolean>(false);
  const [needsSettings, setNeedsSettings] = useState<boolean>(false);
  const [scanned, setScanned] = useState<boolean>(false);
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [scanLineAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) return;
    let isCancelled = false;

    checkCameraPermission().then((res) => {
      if (!isCancelled) {
        setScanned(false);
        setHasCameraGranted(res.granted);
        setNeedsSettings(res.needsSettings);
      }
    });

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 200,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();

    return () => {
      isCancelled = true;
      loop.stop();
    };
  }, [visible, scanLineAnim]);

  const handleRequestPermission = async () => {
    const res = await requestCameraPermission();
    setHasCameraGranted(res.granted);
    setNeedsSettings(res.needsSettings);
  };

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (scanned) return;
    const rawData = (result.data || '').trim();
    if (!rawData) return;

    setScanned(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const normalized = normalizeExamCode(rawData);
    onScanned(normalized || rawData.toUpperCase());
    onClose();
  };

  const handleSelectPredefined = (code: string) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    onScanned(code);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Card style={styles.card}>
          {/* Header */}
          <CardHeader style={{ paddingBottom: 12 }}>
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View style={[styles.headerIcon, { backgroundColor: theme.secondary, borderColor: theme.border }]}>
                  <Ionicons name="qr-code-outline" size={18} color={theme.foreground} />
                </View>
                <View>
                  <Text style={[styles.title, { color: theme.foreground }]}>Scan Invigilator QR</Text>
                  <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>Hold camera over desk slip or master board</Text>
                </View>
              </View>
              <Button variant="ghost" size="icon" onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color={theme.foreground} />
              </Button>
            </View>
          </CardHeader>

          <CardContent style={{ paddingTop: 0, gap: 14 }}>
            {/* Camera Viewfinder */}
            <View style={styles.viewfinderContainer}>
              {hasCameraGranted ? (
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  enableTorch={torchEnabled}
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                />
              ) : (
                <View style={styles.permissionBox}>
                  <Ionicons name="camera-reverse-outline" size={38} color="#A1A1AA" />
                  <Text style={styles.permissionTitle}>
                    {needsSettings ? 'Camera Permission Blocked' : 'Camera Access Required'}
                  </Text>
                  <Text style={styles.permissionSub}>
                    {needsSettings
                      ? 'Camera permission has been turned off in device settings. Please open Settings to allow Camera access for ExamPrep.'
                      : 'To scan student desk QR codes directly, allow camera permission.'}
                  </Text>
                  {needsSettings ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onPress={openDeviceSettings}
                      style={styles.permissionBtn}
                    >
                      <Ionicons name="settings-outline" size={15} color="#FAFAFA" style={{ marginRight: 6 }} />
                      <Text style={styles.permissionBtnText}>Open Settings</Text>
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onPress={handleRequestPermission}
                      style={styles.permissionBtn}
                    >
                      <Ionicons name="lock-open-outline" size={15} color={theme.primaryForeground} style={{ marginRight: 6 }} />
                      <Text style={[styles.permissionBtnText, { color: theme.primaryForeground }]}>Enable Camera</Text>
                    </Button>
                  )}
                </View>
              )}

              {/* Targeting HUD Overlay */}
              <View style={styles.targetingBox} pointerEvents="none">
                <View style={[styles.corner, styles.tl]} />
                <View style={[styles.corner, styles.tr]} />
                <View style={[styles.corner, styles.bl]} />
                <View style={[styles.corner, styles.br]} />

                {/* Animated Laser Scan Line */}
                <Animated.View
                  style={[
                    styles.laserLine,
                    {
                      transform: [{ translateY: scanLineAnim }],
                    },
                  ]}
                />

                <Badge variant="outline" style={styles.statusPill} textStyle={styles.statusText}>
                  <View style={styles.statusDot} />
                  {scanned ? 'Code Captured' : 'Align QR Within Frame'}
                </Badge>
              </View>

              {/* Flashlight button */}
              {hasCameraGranted && (
                <TouchableOpacity
                  style={[styles.torchBtn, torchEnabled && styles.torchBtnActive]}
                  onPress={() => setTorchEnabled(!torchEnabled)}
                >
                  <Ionicons
                    name={torchEnabled ? 'flash' : 'flash-off'}
                    size={16}
                    color={torchEnabled ? '#FAFAFA' : '#E4E4E7'}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Scheduled Exam Code Selector Chips */}
            <View style={styles.quickSection}>
              <View style={styles.quickHeader}>
                <Ionicons name="flash-outline" size={13} color={theme.foreground} />
                <Text style={[styles.quickLabel, { color: theme.mutedForeground }]}>Quick Pick Scheduled Exam:</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {(availableExams && availableExams.length > 0 ? availableExams : defaultMockExams).map((ex) => (
                  <TouchableOpacity
                    key={ex.code}
                    style={[styles.examChip, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                    activeOpacity={0.7}
                    onPress={() => handleSelectPredefined(ex.code)}
                  >
                    <Badge variant="default" style={styles.examChipCodeBadge} textStyle={{ fontSize: 10 }}>
                      {ex.code}
                    </Badge>
                    <Text style={[styles.examChipSubject, { color: theme.foreground }]} numberOfLines={1}>{ex.subject || ex.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </CardContent>
        </Card>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 11, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F4F4F5',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#09090B',
  },
  subtitle: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  viewfinderContainer: {
    height: 230,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#09090B',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  permissionBox: {
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 6,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FAFAFA',
  },
  permissionSub: {
    fontSize: 11,
    color: '#A1A1AA',
    textAlign: 'center',
  },
  permissionBtn: {
    marginTop: 6,
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  permissionBtnText: {
    color: '#FAFAFA',
    fontSize: 12,
    fontWeight: '700',
  },
  targetingBox: {
    width: 170,
    height: 170,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#10B981',
  },
  tl: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  tr: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  laserLine: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  statusPill: {
    position: 'absolute',
    bottom: -24,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(9, 9, 11, 0.8)',
    borderColor: '#3F3F46',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#FAFAFA',
    fontWeight: '700',
  },
  torchBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(24, 24, 27, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  torchBtnActive: {
    backgroundColor: '#09090B',
    borderColor: '#FAFAFA',
  },
  quickSection: {
    gap: 6,
  },
  quickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717A',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  examChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  examChipCodeBadge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  examChipSubject: {
    fontSize: 11,
    fontWeight: '600',
    color: '#09090B',
    maxWidth: 120,
  },
});
