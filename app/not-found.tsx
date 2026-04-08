import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      className="flex min-h-[100dvh] flex-col items-center justify-center text-center"
      style={{
        background: 'var(--glass-page-bg)',
        paddingLeft: 'max(24px, env(safe-area-inset-left))',
        paddingRight: 'max(24px, env(safe-area-inset-right))',
        paddingTop: 'max(40px, env(safe-area-inset-top))',
        paddingBottom: 'max(40px, env(safe-area-inset-bottom))',
      }}
    >
      <p className="text-6xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
        404
      </p>
      <p className="text-lg mb-8" style={{ color: 'var(--color-text-secondary)' }}>
        Page not found
      </p>
      <Link
        href="/"
        className="rounded-xl px-6 text-sm font-medium text-white transition-opacity active:opacity-80 inline-flex items-center justify-center"
        style={{ background: 'var(--color-primary)', minHeight: '48px' }}
      >
        Go home
      </Link>
    </main>
  );
}
