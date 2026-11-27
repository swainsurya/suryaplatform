import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  VideoOff, 
  Eye, 
  Users, 
  AlertTriangle,
  GripHorizontal,
  RotateCcw,
  Mic
} from 'lucide-react';
import { 
  FaceProctorController, 
  FaceDetectionStatus 
} from '../../services/faceProctorService';
import { AudioProctorController } from '../../services/audioProctorService';
import { ProctoringViolation } from '../../types/exam';

interface AiProctorBadgeProps {
  onViolation: (violation: ProctoringViolation) => void;
  maxViolationsAllowed?: number;
  totalViolations: number;
  isExamTerminated?: boolean;
  onGazeShiftChange?: (isLookingAway: boolean) => void;
}

export const AiProctorBadge: React.FC<AiProctorBadgeProps> = ({
  onViolation,
  maxViolationsAllowed = 3,
  totalViolations,
  isExamTerminated = false,
  onGazeShiftChange,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controllerRef = useRef<FaceProctorController | null>(null);
  const audioControllerRef = useRef<AudioProctorController | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [status, setStatus] = useState<FaceDetectionStatus>({
    isModelLoading: true,
    isModelReady: false,
    facesDetected: 0,
    isLookingAway: false,
    statusMessage: 'Starting AI Camera...',
    statusType: 'normal',
  });

  // Movable badge state
  const badgeRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragCleanupRef = useRef<(() => void) | null>(null);

  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem('surya_ai_proctor_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          const maxX = Math.max(8, window.innerWidth - 240);
          const maxY = Math.max(8, window.innerHeight - 200);
          return {
            x: Math.max(8, Math.min(parsed.x, maxX)),
            y: Math.max(8, Math.min(parsed.y, maxY)),
          };
        }
      }
    } catch {}
    return null;
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Keep badge within screen on viewport resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null;
        const width = badgeRef.current?.offsetWidth || 240;
        const height = badgeRef.current?.offsetHeight || 200;
        const maxX = Math.max(8, window.innerWidth - width - 8);
        const maxY = Math.max(8, window.innerHeight - height - 8);
        const clamped = {
          x: Math.max(8, Math.min(prev.x, maxX)),
          y: Math.max(8, Math.min(prev.y, maxY)),
        };
        try {
          localStorage.setItem('surya_ai_proctor_pos', JSON.stringify(clamped));
        } catch {}
        return clamped;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (dragCleanupRef.current) {
        dragCleanupRef.current();
      }
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary button or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    // Don't drag if interactive button or input was clicked
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) {
      return;
    }

    if (!badgeRef.current) return;
    const rect = badgeRef.current.getBoundingClientRect();

    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    // If initial position was null, set it to current rendered rect so inline styles take over smoothly
    if (!position) {
      setPosition({ x: rect.left, y: rect.top });
    }
    setIsDragging(true);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!badgeRef.current) return;
      const badgeWidth = badgeRef.current.offsetWidth || rect.width;
      const badgeHeight = badgeRef.current.offsetHeight || rect.height;

      const minX = 8;
      const maxX = Math.max(8, window.innerWidth - badgeWidth - 8);
      const minY = 8;
      const maxY = Math.max(8, window.innerHeight - badgeHeight - 8);

      const rawX = moveEvent.clientX - dragOffsetRef.current.x;
      const rawY = moveEvent.clientY - dragOffsetRef.current.y;

      const clampedX = Math.max(minX, Math.min(rawX, maxX));
      const clampedY = Math.max(minY, Math.min(rawY, maxY));

      setPosition({ x: clampedX, y: clampedY });
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (dragCleanupRef.current) {
        dragCleanupRef.current();
      }
      if (badgeRef.current) {
        const badgeWidth = badgeRef.current.offsetWidth || rect.width;
        const badgeHeight = badgeRef.current.offsetHeight || rect.height;
        const maxX = Math.max(8, window.innerWidth - badgeWidth - 8);
        const maxY = Math.max(8, window.innerHeight - badgeHeight - 8);
        const finalX = Math.max(8, Math.min(upEvent.clientX - dragOffsetRef.current.x, maxX));
        const finalY = Math.max(8, Math.min(upEvent.clientY - dragOffsetRef.current.y, maxY));
        try {
          localStorage.setItem('surya_ai_proctor_pos', JSON.stringify({ x: finalX, y: finalY }));
        } catch {}
      }
    };

    const cleanup = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      dragCleanupRef.current = null;
    };

    dragCleanupRef.current = cleanup;
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const handleResetPosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPosition(null);
    try {
      localStorage.removeItem('surya_ai_proctor_pos');
    } catch {}
  };

  const handleStatusChange = useCallback((newStatus: FaceDetectionStatus) => {
    setStatus(newStatus);
    onGazeShiftChange?.(newStatus.isLookingAway);
  }, [onGazeShiftChange]);

  const initCamera = useCallback(async () => {
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: 'user',
          },
          audio: true,
        });
      } catch {
        // Fallback to video-only if microphone is unavailable or denied
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: 'user',
          },
          audio: false,
        });
      }

      streamRef.current = stream;
      setHasPermission(true);
      setErrorMessage('');

      // Initialize Microphone Voice Activity Proctor if audio track is present
      if (stream.getAudioTracks().length > 0 && !audioControllerRef.current) {
        setIsMicActive(true);
        audioControllerRef.current = new AudioProctorController({
          stream,
          onViolation,
          onAudioLevel: (_level, speaking) => setIsSpeaking(speaking),
        });
      } else {
        setIsMicActive(false);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // Initialize Face Proctor Controller
      if (videoRef.current && !controllerRef.current) {
        const controller = new FaceProctorController({
          videoElement: videoRef.current,
          onViolation,
          onStatusChange: handleStatusChange,
          intervalMs: 1500, // 1.5s interval
        });
        controllerRef.current = controller;
        controller.start();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setHasPermission(false);
      setErrorMessage(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission was denied. Please click the lock or camera icon in your address bar to enable.'
          : err.message || 'Camera permission denied or camera unavailable'
      );
    }
  }, [onViolation, handleStatusChange]);

  useEffect(() => {
    initCamera();

    return () => {
      if (controllerRef.current) {
        controllerRef.current.destroy();
        controllerRef.current = null;
      }
      if (audioControllerRef.current) {
        audioControllerRef.current.destroy();
        audioControllerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [initCamera]);

  const violationsRemaining = Math.max(0, maxViolationsAllowed - totalViolations);

  return (
    <div
      ref={badgeRef}
      onPointerDown={handlePointerDown}
      style={
        position
          ? {
              left: `${position.x}px`,
              top: `${position.y}px`,
              bottom: 'auto',
              right: 'auto',
            }
          : undefined
      }
      className={`fixed ${
        position ? '' : 'bottom-16 sm:bottom-6 right-3 sm:right-6'
      } z-40 w-48 sm:w-60 select-none touch-none ${
        isDragging
          ? 'cursor-grabbing transition-none scale-[1.02]'
          : 'cursor-grab transition-shadow duration-200'
      }`}
    >
      <div className={`rounded-2xl overflow-hidden shadow-2xl border transition-all ${
        isDragging ? 'ring-2 ring-indigo-400 shadow-indigo-500/30' : ''
      } ${
        status.statusType === 'violation' || totalViolations >= maxViolationsAllowed
          ? 'border-red-500 bg-red-950/90 shadow-red-500/20'
          : status.statusType === 'warning'
          ? 'border-amber-500 bg-amber-950/80 shadow-amber-500/20'
          : 'border-indigo-500/50 dark:border-indigo-400/30 bg-slate-900/90 backdrop-blur-md'
      }`}>
        {/* Header Bar - Drag Handle */}
        <div
          onDoubleClick={handleResetPosition}
          className="flex items-center justify-between px-2.5 py-1.5 bg-slate-950/80 border-b border-slate-800 text-white text-[11px] select-none"
          title="Click & drag to move • Double-click to reset position"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <GripHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0 opacity-70 group-hover:opacity-100" />
            <span className={`w-2 h-2 shrink-0 rounded-full animate-pulse ${
              status.statusType === 'violation' ? 'bg-red-500' :
              status.statusType === 'warning' ? 'bg-amber-400' : 'bg-emerald-400'
            }`} />
            <span className="font-semibold tracking-wide truncate">AI Proctor</span>
            {isMicActive && (
              <Mic
                className={`w-3 h-3 shrink-0 ${isSpeaking ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}
                aria-label="Microphone voice monitoring active"
              />
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              totalViolations > 0 ? 'bg-red-500/30 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              {totalViolations}/{maxViolationsAllowed} <span className="hidden sm:inline">Violations</span>
            </span>
            {position && (
              <button
                type="button"
                onClick={handleResetPosition}
                title="Reset badge position"
                className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>

        {/* Video Frame */}
        <div className="relative bg-black aspect-[4/3] flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover -scale-x-100" // Mirrored for natural user view
          />

          {/* Camera Permission Denied or Loading */}
          {hasPermission === false && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-slate-950/95 text-red-400 text-xs gap-1.5 z-10">
              <VideoOff className="w-5 h-5 text-red-400" />
              <p className="font-bold text-[11px]">Camera Inactive</p>
              <p className="text-[10px] text-slate-300 leading-tight">
                {errorMessage || 'Camera access is required for proctoring.'}
              </p>
              <button
                type="button"
                onClick={initCamera}
                className="mt-1 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] transition-colors cursor-pointer"
              >
                Allow Camera
              </button>
            </div>
          )}

          {/* Overlaid AI Tracking Crosshairs / Reticle */}
          {hasPermission && (
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-1.5">
              <div className="flex justify-between items-start">
                <div className={`p-1 rounded-md backdrop-blur-xs text-[9px] font-semibold flex items-center gap-1 ${
                  status.facesDetected === 1 ? 'bg-emerald-500/40 text-emerald-100' :
                  status.facesDetected > 1 ? 'bg-red-500/60 text-white animate-bounce' :
                  'bg-amber-500/50 text-white'
                }`}>
                  {status.facesDetected > 1 ? (
                    <>
                      <Users className="w-2.5 h-2.5" />
                      <span>{status.facesDetected} Faces</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-2.5 h-2.5" />
                      <span>{status.facesDetected === 1 ? '1 Face' : 'Searching'}</span>
                    </>
                  )}
                </div>

                {status.isLookingAway && (
                  <span className="bg-amber-500 text-slate-950 font-extrabold px-1 py-0.5 rounded text-[9px] animate-pulse">
                    Gaze Shift!
                  </span>
                )}
              </div>

              {/* Full-width facial targeting detection frame with increased height */}
              <div
                className={`w-full flex-1 my-1 border-2 border-dashed rounded-xl transition-all duration-300 flex items-center justify-center ${
                  status.statusType === 'violation'
                    ? 'border-red-400/90 bg-red-500/10'
                    : status.statusType === 'warning'
                    ? 'border-amber-400/90 bg-amber-500/10'
                    : status.facesDetected === 1
                    ? 'border-emerald-400/90 bg-emerald-500/10'
                    : 'border-indigo-400/80 bg-indigo-500/5'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full border border-current opacity-30 pointer-events-none" />
              </div>

              {/* Bottom status alert line */}
              <div className="bg-slate-950/80 backdrop-blur-xs rounded px-1.5 py-0.5 text-[9px] text-center text-slate-200 truncate">
                {status.statusMessage}
              </div>
            </div>
          )}
        </div>

        {/* Warning Footer when violations occur */}
        {totalViolations > 0 && !isExamTerminated && (
          <div className="px-2 py-1 bg-red-950/80 border-t border-red-800/80 text-[10px] text-red-200 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
              <span>{violationsRemaining} strike{violationsRemaining === 1 ? '' : 's'} left before auto-termination</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
