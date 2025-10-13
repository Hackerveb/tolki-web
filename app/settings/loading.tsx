import { colors } from '@/styles/colors';
import { shadows } from '@/styles/neumorphic';

export default function SettingsLoading() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: colors.background }}
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
          borderBottom: `1px solid ${colors.silverAlpha(0.2)}`,
        }}
      >
        <div
          className="w-10 h-10 rounded-full animate-pulse"
          style={{
            backgroundColor: colors.background,
            boxShadow: shadows.subtle.boxShadow,
          }}
        />
        <div
          className="h-6 flex-1 rounded-lg animate-pulse"
          style={{
            backgroundColor: colors.silverAlpha(0.1),
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
            backgroundColor: colors.background,
            boxShadow: shadows.subtle.boxShadow,
            borderRadius: '20px',
            marginTop: '20px',
            marginBottom: '20px',
          }}
        >
          <div
            className="rounded-full"
            style={{
              width: '80px',
              height: '80px',
              backgroundColor: colors.silverAlpha(0.1),
              marginBottom: '15px',
            }}
          />
          <div
            className="h-5 rounded-lg"
            style={{
              width: '120px',
              backgroundColor: colors.silverAlpha(0.1),
              marginBottom: '8px',
            }}
          />
          <div
            className="h-4 rounded-lg"
            style={{
              width: '160px',
              backgroundColor: colors.silverAlpha(0.1),
              marginBottom: '20px',
            }}
          />
        </div>

        {/* Settings Sections Skeleton */}
        <div
          className="animate-pulse"
          style={{
            padding: '20px',
            backgroundColor: colors.background,
            boxShadow: shadows.subtle.boxShadow,
            borderRadius: '20px',
            marginBottom: '20px',
          }}
        >
          <div
            className="h-5 rounded-lg"
            style={{
              width: '100px',
              backgroundColor: colors.silverAlpha(0.1),
              marginBottom: '20px',
            }}
          />
          <div
            className="h-12 rounded-2xl"
            style={{
              backgroundColor: colors.silverAlpha(0.1),
              marginBottom: '12px',
            }}
          />
          <div
            className="h-12 rounded-2xl"
            style={{
              backgroundColor: colors.silverAlpha(0.1),
            }}
          />
        </div>
      </div>
    </div>
  );
}
