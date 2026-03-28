import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--glass-page-bg)' }}
    >
      <p className="text-6xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
        404
      </p>
      <p className="text-lg mb-8" style={{ color: 'var(--color-text-secondary)' }}>
        Page not found
      </p>
      <Link
        href="/"
        className="rounded-xl px-6 py-3 text-sm font-medium text-white transition-opacity active:opacity-80"
        style={{ background: 'var(--color-primary)' }}
      >
        Go home
      </Link>
    </div>
  );
}
