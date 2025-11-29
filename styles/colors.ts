// TolKI Enterprise Color System
// Professional palette with dark mode support

export const colors = {
  // Primary - Deep professional blue
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  primaryAlpha: (opacity: number) => `rgba(37, 99, 235, ${opacity})`,

  // Accent - Muted blue-gray (kept from original for compatibility)
  accent: '#62929e',
  blueMunsell: '#62929e',
  blueAlpha: (opacity: number) => `rgba(98, 146, 158, ${opacity})`,

  // Semantic status colors - Muted, professional
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  info: '#0891B2',

  // Recording states - Unified professional palette
  listening: '#059669',      // Muted emerald
  thinking: '#D97706',       // Deep amber
  translating: '#2563EB',    // Primary blue
  connecting: '#2563EB',     // Primary blue
  recordingRed: '#DC2626',   // For stop/error states
  connectingBlue: '#2563EB', // Alias for primary

  // Neutral scale - For dark mode support
  neutral: {
    0: '#FFFFFF',
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },

  // Legacy semantic colors (for backward compatibility)
  background: '#FFFFFF',
  foreground: '#0F172A',
  surface: '#F8FAFC',
  surfaceElevated: '#FFFFFF',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  // Text colors
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',

  // Legacy colors (kept for compatibility, mapped to new values)
  onyx: '#0F172A',           // Mapped to neutral.900
  white: '#FFFFFF',          // Mapped to neutral.0
  silver: '#94A3B8',         // Mapped to neutral.400
  secondary: '#94A3B8',
  muted: '#94A3B8',

  // Alpha variants
  onyxAlpha: (opacity: number) => `rgba(15, 23, 42, ${opacity})`,
  whiteAlpha: (opacity: number) => `rgba(255, 255, 255, ${opacity})`,
  silverAlpha: (opacity: number) => `rgba(148, 163, 184, ${opacity})`,
  neutralAlpha: (opacity: number) => `rgba(15, 23, 42, ${opacity})`,
} as const;

// Dark mode color mappings
export const darkColors = {
  background: colors.neutral[950],
  foreground: colors.neutral[50],
  surface: colors.neutral[900],
  surfaceElevated: colors.neutral[800],
  border: colors.neutral[700],
  borderStrong: colors.neutral[600],
  textPrimary: colors.neutral[50],
  textSecondary: colors.neutral[400],
  textTertiary: colors.neutral[500],
} as const;

// Semantic "on-color" text (for text on colored backgrounds)
// These reference CSS variables for theme awareness
export const semanticColors = {
  onPrimary: 'var(--color-on-primary)',
  onError: 'var(--color-on-error)',
  onWarning: 'var(--color-on-warning)',
  onSuccess: 'var(--color-on-success)',
  onInfo: 'var(--color-on-info)',
  primaryAlpha: 'var(--color-primary-alpha)',
  listeningPulse: 'var(--color-listening-pulse)',
  thinkingPulse: 'var(--color-thinking-pulse)',
  translatingPulse: 'var(--color-translating-pulse)',
  connectingPulse: 'var(--color-connecting-pulse)',
} as const;

export type Colors = typeof colors;
export type DarkColors = typeof darkColors;
export type SemanticColors = typeof semanticColors;
