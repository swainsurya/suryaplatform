import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import { ProctoringViolation, ProctoringViolationType } from '../types/exam';

export interface FaceDetectionStatus {
  isModelLoading: boolean;
  isModelReady: boolean;
  facesDetected: number;
  isLookingAway: boolean;
  statusMessage: string;
  statusType: 'normal' | 'warning' | 'violation';
}

export interface FaceProctorOptions {
  videoElement: HTMLVideoElement | null;
  onViolation: (violation: ProctoringViolation) => void;
  onStatusChange?: (status: FaceDetectionStatus) => void;
  maxViolations?: number;
  intervalMs?: number;
}

let loadedModel: blazeface.BlazeFaceModel | null = null;
let modelLoadingPromise: Promise<blazeface.BlazeFaceModel> | null = null;

/**
 * Singleton loader for BlazeFace model to prevent repeated downloads
 */
export async function getBlazeFaceModel(): Promise<blazeface.BlazeFaceModel> {
  if (loadedModel) return loadedModel;
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    await tf.ready();
    const model = await blazeface.load();
    loadedModel = model;
    return model;
  })();

  return modelLoadingPromise;
}

/**
 * Capture a lightweight base64 thumbnail (320x240 @ 50% JPEG) from video
 */
export function captureVideoSnapshot(video: HTMLVideoElement): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(video, 0, 0, 320, 240);
    return canvas.toDataURL('image/jpeg', 0.5);
  } catch (err) {
    console.error('Failed to capture proctor snapshot:', err);
    return '';
  }
}

/**
 * Hook or Controller for Face & Posture Proctoring
 */
export class FaceProctorController {
  private video: HTMLVideoElement;
  private onViolation: (violation: ProctoringViolation) => void;
  private onStatusChange?: (status: FaceDetectionStatus) => void;
  private intervalMs: number;
  private timerId: number | null = null;
  private isDestroyed = false;

  // Anomaly tracking counters
  private noFaceConsecutiveTicks = 0;
  private lookingAwayConsecutiveTicks = 0;
  private multipleFacesConsecutiveTicks = 0;

  // Minimum consecutive ticks required to fire violation
  // At 1500ms interval: 3 ticks = 4.5s; 4 ticks = 6.0s
  private readonly NO_FACE_THRESHOLD = 3; // > 3 ticks (~4.5s)
  private readonly LOOKING_AWAY_THRESHOLD = 4; // > 5 seconds
  private readonly MULTIPLE_FACES_THRESHOLD = 2; // ~3.0s confirmation to prevent transient blips

  constructor(options: FaceProctorOptions) {
    if (!options.videoElement) {
      throw new Error('Video element required for FaceProctorController');
    }
    this.video = options.videoElement;
    this.onViolation = options.onViolation;
    this.onStatusChange = options.onStatusChange;
    this.intervalMs = options.intervalMs || 1500;
  }

  public async start() {
    this.notifyStatus({
      isModelLoading: true,
      isModelReady: false,
      facesDetected: 0,
      isLookingAway: false,
      statusMessage: 'Initializing AI Face Monitor...',
      statusType: 'normal',
    });

    try {
      const model = await getBlazeFaceModel();
      if (this.isDestroyed) return;

      this.notifyStatus({
        isModelLoading: false,
        isModelReady: true,
        facesDetected: 1,
        isLookingAway: false,
        statusMessage: 'AI Face & Gaze Tracking Active',
        statusType: 'normal',
      });

      this.runLoop(model);
    } catch (err) {
      console.error('BlazeFace AI failed to initialize:', err);
      if (!this.isDestroyed) {
        this.notifyStatus({
          isModelLoading: false,
          isModelReady: false,
          facesDetected: 0,
          isLookingAway: false,
          statusMessage: 'Failed to initialize AI model',
          statusType: 'warning',
        });
      }
    }
  }

  private runLoop(model: blazeface.BlazeFaceModel) {
    if (this.isDestroyed) return;

    this.timerId = window.setInterval(async () => {
      if (this.isDestroyed || !this.video) return;

      // Ensure video is actively playing and has dimensions
      if (this.video.readyState < 2 || this.video.paused || this.video.ended) {
        return;
      }

      try {
        const returnTensors = false;
        const predictions = await model.estimateFaces(this.video, returnTensors);
        this.evaluatePredictions(predictions as any[]);
      } catch (err) {
        console.warn('Face estimation tick error:', err);
      }
    }, this.intervalMs);
  }

  private evaluatePredictions(predictions: any[]) {
    const faceCount = predictions.length;

    // --- CASE 1: ZERO FACES DETECTED ---
    if (faceCount === 0) {
      this.noFaceConsecutiveTicks++;
      this.lookingAwayConsecutiveTicks = 0;
      this.multipleFacesConsecutiveTicks = 0;

      if (this.noFaceConsecutiveTicks >= this.NO_FACE_THRESHOLD) {
        this.triggerViolation(
          'NO_FACE',
          'Face not visible. Please face the screen.'
        );
        this.notifyStatus({
          isModelLoading: false,
          isModelReady: true,
          facesDetected: 0,
          isLookingAway: false,
          statusMessage: 'Face Not Detected! Keep face centered.',
          statusType: 'violation',
        });
        // Throttle repeated triggers
        this.noFaceConsecutiveTicks = 0;
      } else {
        this.notifyStatus({
          isModelLoading: false,
          isModelReady: true,
          facesDetected: 0,
          isLookingAway: false,
          statusMessage: 'Face not detected (warning)...',
          statusType: 'warning',
        });
      }
      return;
    }

    // Reset no-face counter since face is present
    this.noFaceConsecutiveTicks = 0;

    // --- CASE 2: MULTIPLE FACES DETECTED ---
    if (faceCount > 1) {
      this.multipleFacesConsecutiveTicks++;
      this.lookingAwayConsecutiveTicks = 0;

      if (this.multipleFacesConsecutiveTicks >= this.MULTIPLE_FACES_THRESHOLD) {
        this.triggerViolation(
          'MULTIPLE_FACES',
          `Multiple people detected in camera feed (${faceCount} faces).`
        );
        this.notifyStatus({
          isModelLoading: false,
          isModelReady: true,
          facesDetected: faceCount,
          isLookingAway: false,
          statusMessage: `Multiple faces detected (${faceCount})!`,
          statusType: 'violation',
        });
        this.multipleFacesConsecutiveTicks = 0;
      } else {
        this.notifyStatus({
          isModelLoading: false,
          isModelReady: true,
          facesDetected: faceCount,
          isLookingAway: false,
          statusMessage: 'Multiple faces in view...',
          statusType: 'warning',
        });
      }
      return;
    }

    // Reset multiple-faces counter since exactly 1 face is present
    this.multipleFacesConsecutiveTicks = 0;

    // --- CASE 3: SINGLE FACE - GAZE & POSTURE ESTIMATION ---
    const face = predictions[0];
    const landmarks = face.landmarks as number[][]; // [rightEye, leftEye, nose, mouth, rightEar, leftEar]

    if (landmarks && landmarks.length >= 3) {
      const rightEye = landmarks[0];
      const leftEye = landmarks[1];
      const nose = landmarks[2];

      const eyeDistanceX = Math.abs(leftEye[0] - rightEye[0]);
      const midEyeX = (leftEye[0] + rightEye[0]) / 2;
      const noseX = nose[0];

      // Gaze horizontal ratio
      // 0.0 is dead-center. Values > 0.35 mean nose has shifted significantly to the left or right eye.
      const offsetRatio = (noseX - midEyeX) / (eyeDistanceX || 1);
      const isShifted = Math.abs(offsetRatio) > 0.35;

      if (isShifted) {
        this.lookingAwayConsecutiveTicks++;

        if (this.lookingAwayConsecutiveTicks >= this.LOOKING_AWAY_THRESHOLD) {
          const direction = offsetRatio > 0 ? 'right' : 'left';
          this.triggerViolation(
            'LOOKING_AWAY',
            `Looking away (${direction}) detected. Maintain continuous focus on the exam screen.`
          );
          this.notifyStatus({
            isModelLoading: false,
            isModelReady: true,
            facesDetected: 1,
            isLookingAway: true,
            statusMessage: 'Looking away detected! Focus on screen.',
            statusType: 'violation',
          });
          this.lookingAwayConsecutiveTicks = 0;
        } else {
          this.notifyStatus({
            isModelLoading: false,
            isModelReady: true,
            facesDetected: 1,
            isLookingAway: true,
            statusMessage: 'Head turned sideways...',
            statusType: 'warning',
          });
        }
        return;
      }
    }

    // Normal single face centered
    this.lookingAwayConsecutiveTicks = 0;
    this.notifyStatus({
      isModelLoading: false,
      isModelReady: true,
      facesDetected: 1,
      isLookingAway: false,
      statusMessage: 'Face Centered & Verified',
      statusType: 'normal',
    });
  }

  private triggerViolation(type: ProctoringViolationType, message: string) {
    const snapshotDataUrl = captureVideoSnapshot(this.video);
    const violation: ProctoringViolation = {
      id: `viol-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      snapshotDataUrl: snapshotDataUrl || undefined,
    };
    this.onViolation(violation);
  }

  private notifyStatus(status: FaceDetectionStatus) {
    if (this.onStatusChange && !this.isDestroyed) {
      this.onStatusChange(status);
    }
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
