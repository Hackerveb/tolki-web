'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';

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
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
        />
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Completing sign in...
        </p>
      </div>
    </div>
  );
}
