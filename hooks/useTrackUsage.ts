'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/nextjs';

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

// Credit deduction rate: 1 credit per minute of usage
const CREDITS_PER_MINUTE = 1;
const CREDITS_PER_SECOND = CREDITS_PER_MINUTE / 60;

// Deduct credits every 10 seconds
const DEDUCTION_INTERVAL_SECONDS = 10;

export const useTrackUsage = ({
  isActive,
  onInsufficientCredits,
}: UseTrackUsageOptions): UseTrackUsageReturn => {
  const { user } = useUser();
  const [secondsUsed, setSecondsUsed] = useState(0);
  const [creditsDeducted, setCreditsDeducted] = useState(0);
  const [isTracking, setIsTracking] = useState(false);

  const deductCredits = useMutation(api.users.deductCredits);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDeductionRef = useRef<number>(0);

  // Track seconds and deduct credits periodically
  useEffect(() => {
    if (isActive && user?.id) {
      setIsTracking(true);

      // Start counting seconds
      intervalRef.current = setInterval(() => {
        setSecondsUsed((prev) => {
          const newSeconds = prev + 1;

          // Deduct credits every DEDUCTION_INTERVAL_SECONDS
          if (newSeconds - lastDeductionRef.current >= DEDUCTION_INTERVAL_SECONDS) {
            const secondsSinceLastDeduction = newSeconds - lastDeductionRef.current;
            const creditsToDeduct = secondsSinceLastDeduction * CREDITS_PER_SECOND;

            // Deduct credits from Convex
            deductCredits({
              clerkId: user.id,
              credits: creditsToDeduct,
            })
              .then(() => {
                // Success - mutation returns new balance
                setCreditsDeducted((prev) => prev + creditsToDeduct);
                lastDeductionRef.current = newSeconds;
              })
              .catch((error) => {
                // Error (e.g., insufficient credits)
                console.warn('Error deducting credits, stopping tracking:', error);
                if (onInsufficientCredits) {
                  onInsufficientCredits();
                }
              });
          }

          return newSeconds;
        });
      }, 1000);
    } else {
      // Cleanup when stopped
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Final deduction for remaining seconds
      if (isTracking && user?.id) {
        const remainingSeconds = secondsUsed - lastDeductionRef.current;
        if (remainingSeconds > 0) {
          const finalCredits = remainingSeconds * CREDITS_PER_SECOND;
          deductCredits({
            clerkId: user.id,
            credits: finalCredits,
          })
            .then(() => {
              // Success - mutation returns new balance
              setCreditsDeducted((prev) => prev + finalCredits);
            })
            .catch((error) => {
              console.error('Error deducting final credits:', error);
            });
        }
      }

      setIsTracking(false);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, user, deductCredits, onInsufficientCredits, secondsUsed, isTracking]);

  const reset = useCallback(() => {
    setSecondsUsed(0);
    setCreditsDeducted(0);
    lastDeductionRef.current = 0;
  }, []);

  return {
    secondsUsed,
    creditsDeducted,
    isTracking,
    reset,
  };
};
