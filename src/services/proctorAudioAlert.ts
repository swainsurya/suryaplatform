/**
 * Native Web Audio API alert sound synthesizer for SuryaPlatform proctoring.
 * Generates clean synthesized chimes and beeps without requiring any external audio files.
 */

let lastGazeChimeTime = 0;
let lastViolationBeepTime = 0;

/**
 * Returns an AudioContext if supported, handling browser autoplay policies
 */
function getAudioContext(): AudioContext | null {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    return new AudioCtx();
  } catch (err) {
    console.warn('AudioContext not available:', err);
    return null;
  }
}

/**
 * Plays a gentle, descending 2-tone chime when candidate looks away from the screen.
 * Throttled to at most once every 3 seconds to avoid irritating sound loops.
 */
export function playGazeWarningChime(): void {
  const now = Date.now();
  if (now - lastGazeChimeTime < 3000) return; // Throttle
  lastGazeChimeTime = now;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;

    // Tone 1: 640 Hz
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(640, t);
    gain1.gain.setValueAtTime(0.12, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.18);

    // Tone 2: 480 Hz (plays 120ms later)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(480, t + 0.12);
    gain2.gain.setValueAtTime(0.12, t + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t + 0.12);
    osc2.stop(t + 0.35);
  } catch (err) {
    console.warn('Failed to play gaze warning chime:', err);
  }
}

/**
 * Plays a sharper, urgent 2-pip alert tone when a strike or violation is officially logged.
 */
export function playViolationBeep(): void {
  const now = Date.now();
  if (now - lastViolationBeepTime < 2000) return;
  lastViolationBeepTime = now;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;

    // Pip 1 (800 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(800, t);
    gain1.gain.setValueAtTime(0.18, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.12);

    // Pip 2 (800 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(800, t + 0.15);
    gain2.gain.setValueAtTime(0.18, t + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t + 0.15);
    osc2.stop(t + 0.28);
  } catch (err) {
    console.warn('Failed to play violation beep:', err);
  }
}
