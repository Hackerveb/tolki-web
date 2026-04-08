"use client";

export default function OfflinePage() {
  return (
    <main
      className="flex min-h-[100dvh] flex-col items-center justify-center glass-page text-center"
      style={{
        paddingLeft: 'max(24px, env(safe-area-inset-left))',
        paddingRight: 'max(24px, env(safe-area-inset-right))',
        paddingTop: 'max(40px, env(safe-area-inset-top))',
        paddingBottom: 'max(40px, env(safe-area-inset-bottom))',
      }}
    >
      <div
        className="w-full max-w-sm glass"
        style={{
          padding: '40px 28px',
          borderRadius: '24px',
        }}
      >
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div
            className="flex h-20 w-20 items-center justify-center"
            style={{
              borderRadius: '22px',
              background: 'linear-gradient(135deg, var(--color-primary) 0%, #6366f1 100%)',
              boxShadow: 'var(--glass-glow-primary)',
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <circle cx="12" cy="20" r="1" fill="white" stroke="none" />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1
          className="mb-3 text-2xl font-bold text-center"
          style={{ color: 'var(--color-text-primary)' }}
        >
          You&apos;re offline
        </h1>

        {/* Body */}
        <p
          className="mb-8 text-sm text-center"
          style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}
        >
          TolKI needs an internet connection for real-time translation. Please
          check your connection and try again.
        </p>

        {/* Retry button */}
        <button
          onClick={() => window.location.reload()}
          className="w-full font-semibold transition-all active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, #6366f1 100%)',
            color: 'white',
            minHeight: '48px',
            borderRadius: '14px',
            fontSize: '16px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: 'var(--glass-glow-primary)',
          }}
        >
          Try again
        </button>
      </div>
    </main>
  );
}
