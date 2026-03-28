"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--color-background)] px-6 text-center">
      {/* Icon */}
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[20px] bg-[var(--color-primary)]">
        {/* Wifi-off icon */}
        <svg
          width="48"
          height="48"
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

      {/* Heading */}
      <h1 className="mb-3 text-2xl font-semibold text-[var(--color-text-primary)]">
        You&apos;re offline
      </h1>

      {/* Body */}
      <p className="mb-8 max-w-xs text-[var(--color-text-secondary)]">
        TolKI needs an internet connection for real-time translation. Please
        check your connection and try again.
      </p>

      {/* Retry button — triggers a page reload */}
      <button
        onClick={() => window.location.reload()}
        className="rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-medium text-white transition-opacity active:opacity-80"
      >
        Try again
      </button>
    </div>
  );
}
