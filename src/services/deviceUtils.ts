/**
 * Detects whether the candidate is accessing from a mobile device or tablet.
 * Mobile devices do not enforce full-screen mode to prevent native OS navigation issues,
 * virtual keyboard interruptions, and browser incompatibilities (such as iOS Safari).
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isSmallTouchScreen = 
    (window.innerWidth <= 820 || window.innerHeight <= 820) && 
    ('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));
  return Boolean(isMobileUA || isSmallTouchScreen);
}
