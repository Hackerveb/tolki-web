export default function SettingsLoading() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      {/* Header Skeleton */}
      <header
        className="flex items-center"
        style={{
          gap: '15px',
          paddingTop: 'max(20px, env(safe-area-inset-top))',
          paddingBottom: '20px',
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div
          className="w-10 h-10 rounded-full animate-pulse"
          style={{
            backgroundColor: 'var(--color-surface)',
            boxShadow: 'var(--shadow-sm)',
          }}
        />
        <div
          className="h-6 flex-1 rounded-lg animate-pulse"
          style={{
            backgroundColor: 'var(--color-neutral-200)',
            maxWidth: '150px',
          }}
        />
      </header>

      {/* Content Skeleton */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        }}
      >
        {/* Profile Card Skeleton */}
        <div
          className="flex flex-col items-center animate-pulse"
          style={{
            padding: '20px',
            backgroundColor: 'var(--color-surface)',
            boxShadow: 'var(--shadow-sm)',
            borderRadius: '12px',
            marginTop: '20px',
            marginBottom: '20px',
            border: '1px solid var(--color-border)',
          }}
        >
          <div
            className="rounded-full"
            style={{
              width: '80px',
              height: '80px',
              backgroundColor: 'var(--color-neutral-200)',
              marginBottom: '15px',
            }}
          />
          <div
            className="h-5 rounded-lg"
            style={{
              width: '120px',
              backgroundColor: 'var(--color-neutral-200)',
              marginBottom: '8px',
            }}
          />
          <div
            className="h-4 rounded-lg"
            style={{
              width: '160px',
              backgroundColor: 'var(--color-neutral-200)',
              marginBottom: '20px',
            }}
          />
        </div>

        {/* Settings Sections Skeleton */}
        <div
          className="animate-pulse"
          style={{
            padding: '20px',
            backgroundColor: 'var(--color-surface)',
            boxShadow: 'var(--shadow-sm)',
            borderRadius: '12px',
            marginBottom: '20px',
            border: '1px solid var(--color-border)',
          }}
        >
          <div
            className="h-5 rounded-lg"
            style={{
              width: '100px',
              backgroundColor: 'var(--color-neutral-200)',
              marginBottom: '20px',
            }}
          />
          <div
            className="h-12 rounded-xl"
            style={{
              backgroundColor: 'var(--color-neutral-200)',
              marginBottom: '12px',
            }}
          />
          <div
            className="h-12 rounded-xl"
            style={{
              backgroundColor: 'var(--color-neutral-200)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
