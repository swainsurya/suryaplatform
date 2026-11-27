import { ProctoringViolation } from '../types/exam';

export interface AudioProctorOptions {
  stream: MediaStream;
  onViolation: (violation: ProctoringViolation) => void;
  onAudioLevel?: (level: number, isSpeaking: boolean) => void;
}

/**
 * Lightweight Web Audio API voice/noise activity detector.
 * Monitors microphone RMS energy locally without recording or uploading audio.
 */
export class AudioProctorController {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private timerId: number | null = null;
  private isDestroyed = false;

  private onViolation: (violation: ProctoringViolation) => void;
  private onAudioLevel?: (level: number, isSpeaking: boolean) => void;

  private loudTicks = 0;
  private lastViolationAt = 0;

  // 500ms interval -> 7 consecutive ticks (~3.5s) of sustained speech/noise
  private readonly INTERVAL_MS = 500;
  private readonly SPEECH_RMS_THRESHOLD = 0.045;
  private readonly SUSTAINED_TICKS_REQUIRED = 7;
  private readonly COOLDOWN_MS = 12000;

  constructor(options: AudioProctorOptions) {
    this.onViolation = options.onViolation;
    this.onAudioLevel = options.onAudioLevel;
    this.init(options.stream);
  }

  private init(stream: MediaStream) {
    try {
      const audioTracks = stream.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0) return;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.4;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      this.audioCtx = ctx;
      this.analyser = analyser;
      this.source = source;

      const buffer = new Float32Array(analyser.fftSize);

      this.timerId = window.setInterval(() => {
        if (this.isDestroyed || !this.analyser) return;

        if (this.audioCtx?.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }

        this.analyser.getFloatTimeDomainData(buffer);
        let sumSquares = 0;
        for (let i = 0; i < buffer.length; i++) {
          sumSquares += buffer[i] * buffer[i];
        }
        const rms = Math.sqrt(sumSquares / buffer.length);
        const isSpeaking = rms >= this.SPEECH_RMS_THRESHOLD;

        this.onAudioLevel?.(rms, isSpeaking);

        if (isSpeaking) {
          this.loudTicks += 1;
          const now = Date.now();
          if (
            this.loudTicks >= this.SUSTAINED_TICKS_REQUIRED &&
            now - this.lastViolationAt > this.COOLDOWN_MS
          ) {
            this.loudTicks = 0;
            this.lastViolationAt = now;
            this.onViolation({
              id: `v-${now}-${Math.random().toString(36).substring(2, 6)}`,
              type: 'AUDIO_DETECTED',
              message: 'Sustained voice or background noise detected by microphone.',
              timestamp: new Date().toLocaleTimeString(),
            });
          }
        } else {
          this.loudTicks = Math.max(0, this.loudTicks - 1);
        }
      }, this.INTERVAL_MS);
    } catch (err) {
      console.warn('Audio proctor initialization skipped:', err);
    }
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    try {
      this.source?.disconnect();
      this.analyser?.disconnect();
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        this.audioCtx.close().catch(() => {});
      }
    } catch {
      // Ignore cleanup errors
    }
    this.source = null;
    this.analyser = null;
    this.audioCtx = null;
  }
}
