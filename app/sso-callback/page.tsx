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
      className="min-h-screen flex items-center justify-center glass-page"
      style={{
        paddingLeft: 'max(24px, env(safe-area-inset-left))',
        paddingRight: 'max(24px, env(safe-area-inset-right))',
      }}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, #6366f1 100%)',
            boxShadow: 'var(--glass-glow-primary)',
          }}
        >
          <div
            className="w-6 h-6 border-[2.5px] border-white border-t-transparent rounded-full animate-spin"
          />
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Completing sign in...
        </p>
      </div>
    </div>
  );
}
