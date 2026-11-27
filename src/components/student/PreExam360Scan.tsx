import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  RotateCw,
  Camera,
  CheckCircle2,
  RefreshCw,
  Play,
  AlertTriangle,
  Compass,
} from 'lucide-react';
import { RoomScanAngleSnapshot } from '../../types/exam';
import { captureVideoSnapshot } from '../../services/faceProctorService';

const SCAN_ANGLES = [
  { label: 'Front & Desk (0°)', hint: 'Point camera at your desk, keyboard & workspace' },
  { label: 'Right Side (90°)', hint: 'Slowly pan 90° to your right side' },
  { label: 'Back Area (180°)', hint: 'Show the area behind your seat' },
  { label: 'Left Side (270°)', hint: 'Pan 90° to your left & return to front' },
] as const;

const AUTO_STEP_SECONDS = 3;

interface PreExam360ScanProps {
  videoStream: MediaStream | null;
  snapshots: RoomScanAngleSnapshot[];
  onSnapshotsChange: (snapshots: RoomScanAngleSnapshot[]) => void;
}

/**
 * Compute mean absolute pixel difference (0-255) between two 32x24 grayscale frames
 * to detect whether the user actually panned the camera between angles.
 */
function sampleGrayscaleFrame(video: HTMLVideoElement): Uint8ClampedArray | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 24;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, 32, 24);
    const data = ctx.getImageData(0, 0, 32, 24).data;
    const gray = new Uint8ClampedArray(32 * 24);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      gray[j] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
    return gray;
  } catch {
    return null;
  }
}

function computeFrameDiff(a: Uint8ClampedArray | null, b: Uint8ClampedArray | null): number {
  if (!a || !b || a.length !== b.length) return 255;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.abs(a[i] - b[i]);
  }
  return sum / a.length;
}

export const PreExam360Scan: React.FC<PreExam360ScanProps> = ({
  videoStream,
  snapshots,
  onSnapshotsChange,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastGrayFrameRef = useRef<Uint8ClampedArray | null>(null);
  const snapshotsRef = useRef<RoomScanAngleSnapshot[]>(snapshots);
  snapshotsRef.current = snapshots;

  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_STEP_SECONDS);
  const [stationaryWarning, setStationaryWarning] = useState<string>('');

  const isComplete = snapshots.length >= SCAN_ANGLES.length;
  const currentStepIdx = Math.min(snapshots.length, SCAN_ANGLES.length - 1);

  // Attach live camera stream to scan preview
  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
      videoRef.current.play().catch(() => {});
    }
  }, [videoStream]);

  const captureCurrentAngle = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const currentCount = snapshotsRef.current.length;
    if (currentCount >= SCAN_ANGLES.length) {
      setIsAutoScanning(false);
      return;
    }

    const gray = sampleGrayscaleFrame(video);
    if (currentCount > 0 && lastGrayFrameRef.current) {
      const diff = computeFrameDiff(lastGrayFrameRef.current, gray);
      if (diff < 3.5) {
        setStationaryWarning('Camera barely moved — please pan around your room so all 4 angles are visible.');
      } else {
        setStationaryWarning('');
      }
    }
    lastGrayFrameRef.current = gray;

    const dataUrl = captureVideoSnapshot(video);
    if (!dataUrl) return;

    const nextSnapshot: RoomScanAngleSnapshot = {
      angleLabel: SCAN_ANGLES[currentCount].label,
      capturedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      snapshotDataUrl: dataUrl,
    };

    const updated = [...snapshotsRef.current, nextSnapshot];
    onSnapshotsChange(updated);

    if (updated.length >= SCAN_ANGLES.length) {
      setIsAutoScanning(false);
    }
  }, [onSnapshotsChange]);

  // Guided auto-scan countdown loop
  useEffect(() => {
    if (!isAutoScanning || isComplete) return;

    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          captureCurrentAngle();
          return AUTO_STEP_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isAutoScanning, isComplete, captureCurrentAngle]);

  const handleStartAutoScan = () => {
    setStationaryWarning('');
    lastGrayFrameRef.current = null;
    onSnapshotsChange([]);
    setCountdown(AUTO_STEP_SECONDS);
    setIsAutoScanning(true);
  };

  const handleResetScan = () => {
    setIsAutoScanning(false);
    setStationaryWarning('');
    lastGrayFrameRef.current = null;
    setCountdown(AUTO_STEP_SECONDS);
    onSnapshotsChange([]);
  };

  const progressPct = Math.round((snapshots.length / SCAN_ANGLES.length) * 100);

  return (
    <div className="mt-3 p-3.5 sm:p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/70 space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${
            isComplete
              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
              : 'bg-indigo-100 dark:bg-indigo-900/70 text-indigo-600 dark:text-indigo-400'
          }`}>
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Pre-Exam 360° Room Scan</span>
              <span className="text-red-500 font-black">*</span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Slowly rotate your webcam 360° to verify your desk and testing environment.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isComplete ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>360° Scan Complete</span>
            </span>
          ) : (
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300">
              {snapshots.length} / {SCAN_ANGLES.length} Angles ({progressPct}%)
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${isComplete ? 'bg-emerald-500' : 'bg-indigo-600'}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Active Scan View or Completed Gallery */}
      {!isComplete ? (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-48 h-36 bg-black rounded-xl overflow-hidden shrink-0 border-2 border-indigo-500/60 shadow-inner">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {isAutoScanning && (
              <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 backdrop-blur-xs px-2 py-1 flex items-center justify-between text-[10px] text-white font-bold">
                <span className="flex items-center gap-1 text-indigo-300">
                  <RotateCw className="w-3 h-3 animate-spin" />
                  <span>Capturing in {countdown}s</span>
                </span>
                <span>{snapshots.length + 1}/4</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2.5 text-center sm:text-left">
            <div>
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 mb-1">
                Step {currentStepIdx + 1} of 4: {SCAN_ANGLES[currentStepIdx].label}
              </span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {SCAN_ANGLES[currentStepIdx].hint}
              </p>
            </div>

            {stationaryWarning && (
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                <span>{stationaryWarning}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {!isAutoScanning ? (
                <>
                  <button
                    type="button"
                    onClick={handleStartAutoScan}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Guided 360° Scan (12s)</span>
                  </button>
                  <button
                    type="button"
                    onClick={captureCurrentAngle}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Capture Angle</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleResetScan}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Cancel & Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 text-xs">
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
            All 4 room angles captured and attached to your exam session.
          </p>
          <button
            type="button"
            onClick={handleResetScan}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 text-[11px] font-semibold cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retake Scan</span>
          </button>
        </div>
      )}

      {/* 4-Angle Thumbnail Strip */}
      {snapshots.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {SCAN_ANGLES.map((angle, idx) => {
            const snap = snapshots[idx];
            return (
              <div
                key={angle.label}
                className={`rounded-lg overflow-hidden border text-[10px] ${
                  snap
                    ? 'border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900'
                    : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-800/40'
                }`}
              >
                <div className="aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
                  {snap ? (
                    <img
                      src={snap.snapshotDataUrl}
                      alt={snap.angleLabel}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-slate-500 text-[10px]">Pending</span>
                  )}
                </div>
                <div className="px-1.5 py-1 flex items-center justify-between gap-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                    {angle.label}
                  </span>
                  {snap && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
