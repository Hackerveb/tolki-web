'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import { colors } from '@/styles/colors';

export default function SSOCallback() {
  const router = useRouter();
  const { handleRedirectCallback } = useClerk();

  useEffect(() => {
    async function handleCallback() {
      await handleRedirectCallback({}, async (url) => {
        await router.push(url || '/');
      });
    }
    handleCallback();
  }, [handleRedirectCallback, router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: colors.background }}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: colors.primary, borderTopColor: 'transparent' }}
        />
        <p className="text-sm" style={{ color: colors.muted }}>
          Completing sign in...
        </p>
      </div>
    </div>
  );
}
