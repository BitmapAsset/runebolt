"use client";

import { useState, useRef, useCallback, useEffect } from 'react';

interface SwipeOptions {
  threshold?: number;
  timeout?: number;
  preventDefault?: boolean;
}

interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
  deltaX: number;
  deltaY: number;
  isSwiping: boolean;
  direction: 'left' | 'right' | 'up' | 'down' | null;
}

export function useSwipe(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  options: SwipeOptions = {}
) {
  const { threshold = 50, timeout = 500, preventDefault = true } = options;
  const [swipeState, setSwipeState] = useState<SwipeState | null>(null);
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent | TouchEvent) => {
      const touch = e.touches[0];
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      setSwipeState({
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        deltaX: 0,
        deltaY: 0,
        isSwiping: true,
        direction: null,
      });
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent | TouchEvent) => {
      if (!touchStart.current || !swipeState) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStart.current.x;
      const deltaY = touch.clientY - touchStart.current.y;
      const elapsed = Date.now() - touchStart.current.time;

      if (elapsed > timeout) {
        touchStart.current = null;
        setSwipeState(null);
        return;
      }

      // Determine direction
      let direction: SwipeState['direction'] = null;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      setSwipeState({
        ...swipeState,
        deltaX,
        deltaY,
        direction,
      });

      if (preventDefault && Math.abs(deltaX) > 10) {
        e.preventDefault();
      }
    },
    [swipeState, timeout, preventDefault]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent | TouchEvent) => {
      if (!touchStart.current || !swipeState) return;

      const elapsed = Date.now() - touchStart.current.time;
      const absDeltaX = Math.abs(swipeState.deltaX);
      const absDeltaY = Math.abs(swipeState.deltaY);

      if (elapsed <= timeout) {
        // Horizontal swipe
        if (absDeltaX > threshold && absDeltaX > absDeltaY) {
          if (swipeState.deltaX > 0) {
            onSwipeRight?.();
          } else {
            onSwipeLeft?.();
          }
        }
        // Vertical swipe
        else if (absDeltaY > threshold && absDeltaY > absDeltaX) {
          if (swipeState.deltaY > 0) {
            onSwipeDown?.();
          } else {
            onSwipeUp?.();
          }
        }
      }

      touchStart.current = null;
      setSwipeState(null);
    },
    [swipeState, threshold, timeout, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]
  );

  return {
    swipeProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    swipeState,
  };
}

// Pull to refresh hook
interface PullToRefreshOptions {
  threshold?: number;
  maxPull?: number;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

export function usePullToRefresh(options: PullToRefreshOptions) {
  const { threshold = 80, maxPull = 120, onRefresh, disabled = false } = options;
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);

  useEffect(() => {
    if (disabled) return;

    const element = document.documentElement;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if at top of page
      if (window.scrollY > 10) return;
      
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff > 0 && window.scrollY <= 0) {
        // Apply resistance
        const pull = Math.min(diff * 0.6, maxPull);
        setPullDistance(pull);
        
        if (pull > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling.current) return;
      
      isPulling.current = false;

      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(threshold);
        
        try {
          await onRefresh();
        } finally {
          setPullDistance(0);
          setIsRefreshing(false);
        }
      } else {
        setPullDistance(0);
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, isRefreshing, threshold, maxPull, onRefresh, disabled]);

  return { pullDistance, isRefreshing };
}

// Long press hook
interface LongPressOptions {
  threshold?: number;
  onLongPress: () => void;
  onPress?: () => void;
}

export function useLongPress(options: LongPressOptions) {
  const { threshold = 500, onLongPress, onPress } = options;
  const timer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      isLongPress.current = false;
      timer.current = setTimeout(() => {
        isLongPress.current = true;
        onLongPress();
      }, threshold);
    },
    [threshold, onLongPress]
  );

  const end = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      
      if (!isLongPress.current) {
        onPress?.();
      }
    },
    [onPress]
  );

  const cancel = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    isLongPress.current = false;
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: end,
    onTouchMove: cancel,
    onMouseDown: start,
    onMouseUp: end,
    onMouseLeave: cancel,
  };
}

// Double tap hook
export function useDoubleTap(
  onDoubleTap: () => void,
  onSingleTap?: () => void,
  delay = 300
) {
  const lastTap = useRef(0);
  const timer = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      const now = Date.now();
      const timeDiff = now - lastTap.current;

      if (timeDiff < delay) {
        // Double tap
        if (timer.current) {
          clearTimeout(timer.current);
          timer.current = null;
        }
        lastTap.current = 0;
        onDoubleTap();
      } else {
        // Wait to see if it's a double tap
        lastTap.current = now;
        timer.current = setTimeout(() => {
          timer.current = null;
          lastTap.current = 0;
          onSingleTap?.();
        }, delay);
      }
    },
    [onDoubleTap, onSingleTap, delay]
  );
}

// Haptic feedback hook
export function useHaptic() {
  const vibrate = useCallback(
    (pattern: number | number[] = 50) => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    },
    []
  );

  const light = useCallback(() => vibrate(10), [vibrate]);
  const medium = useCallback(() => vibrate(50), [vibrate]);
  const heavy = useCallback(() => vibrate(100), [vibrate]);
  const success = useCallback(() => vibrate([50, 100, 50]), [vibrate]);
  const error = useCallback(() => vibrate([100, 50, 100]), [vibrate]);

  return { vibrate, light, medium, heavy, success, error };
}

// Prevent bounce scroll on iOS
export function usePreventBounce() {
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (e.target === document.documentElement) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => document.removeEventListener('touchmove', handleTouchMove);
  }, []);
}