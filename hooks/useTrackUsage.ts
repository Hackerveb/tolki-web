'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/nextjs';
import { CREDIT_DEDUCTION_INTERVAL_SEC } from '@/constants/billing';

interface UseTrackUsageOptions {
  isActive: boolean; // Whether to track usage (e.g., when recording)
  onInsufficientCredits?: () => void;
}

interface UseTrackUsageReturn {
  secondsUsed: number;
  creditsDeducted: number;
  isTracking: boolean;
  reset: () => void;
}

export const useTrackUsage = ({
  isActive,
  onInsufficientCredits,
}: UseTrackUsageOptions): UseTrackUsageReturn => {
  const { user } = useUser();
  const [secondsUsed, setSecondsUsed] = useState(0);
  const [creditsDeducted, setCreditsDeducted] = useState(0);
  const [isTracking, setIsTracking] = useState(false);

  const updateFractionalCredits = useMutation(api.usageSessions.updateFractionalCredits);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDeductionRef = useRef<number>(0);
  // Use refs to avoid stale closures and prevent effect re-runs
  const secondsUsedRef = useRef(0);
  const isTrackingRef = useRef(false);
  const onInsufficientCreditsRef = useRef(onInsufficientCredits);

  // Keep callback ref updated
  useEffect(() => {
    onInsufficientCreditsRef.current = onInsufficientCredits;
  }, [onInsufficientCredits]);

  // Track seconds and deduct credits periodically
  useEffect(() => {
    if (isActive && user?.id) {
      isTrackingRef.current = true;
      setIsTracking(true);

      // Start counting seconds
      intervalRef.current = setInterval(() => {
        secondsUsedRef.current += 1;
        const newSeconds = secondsUsedRef.current;
        setSecondsUsed(newSeconds);

        // Deduct credits every DEDUCTION_INTERVAL_SECONDS
        if (newSeconds - lastDeductionRef.current >= CREDIT_DEDUCTION_INTERVAL_SEC) {
          const secondsSinceLastDeduction = newSeconds - lastDeductionRef.current;

          updateFractionalCredits({
            clerkId: user.id,
            secondsToAdd: secondsSinceLastDeduction,
          })
            .then((result) => {
              setCreditsDeducted((prev) => prev + (result?.sessionCreditsUsed ?? 0) - prev);
              lastDeductionRef.current = newSeconds;
            })
            .catch((error) => {
              // Error (e.g., insufficient credits) — stop the interval to prevent spam
              console.warn('Error deducting credits, stopping tracking:', error);
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              if (onInsufficientCreditsRef.current) {
                onInsufficientCreditsRef.current();
              }
            });
        }
      }, 1000);
    } else {
      // Cleanup when stopped
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Final deduction for remaining seconds
      if (isTrackingRef.current && user?.id) {
        const remainingSeconds = secondsUsedRef.current - lastDeductionRef.current;
        if (remainingSeconds > 0) {
          updateFractionalCredits({
            clerkId: user.id,
            secondsToAdd: remainingSeconds,
          })
            .then((result) => {
              setCreditsDeducted(result?.sessionCreditsUsed ?? 0);
            })
            .catch((error) => {
              console.error('Error deducting final credits:', error);
            });
        }
      }

      isTrackingRef.current = false;
      setIsTracking(false);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, user?.id, updateFractionalCredits]);

  const reset = useCallback(() => {
    setSecondsUsed(0);
    setCreditsDeducted(0);
    secondsUsedRef.current = 0;
    lastDeductionRef.current = 0;
  }, []);

  return {
    secondsUsed,
    creditsDeducted,
    isTracking,
    reset,
  };
};
