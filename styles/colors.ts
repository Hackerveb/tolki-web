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

// Dark mode color mappings — Apple HIG iOS dark color system
export const darkColors = {
  // Backgrounds — Apple HIG material layers
  background: '#000000',           // OLED true black (systemBackground)
  surface: '#1C1C1E',              // secondarySystemBackground
  surfaceElevated: '#2C2C2E',      // tertiarySystemBackground

  // Foreground
  foreground: '#FFFFFF',

  // Borders — iOS separator
  border: 'rgba(84, 84, 88, 0.65)',
  borderStrong: 'rgba(84, 84, 88, 0.85)',

  // Text — Apple HIG label hierarchy
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.60)',  // ~7:1 on black, WCAG AA ✓
  textTertiary: 'rgba(235, 235, 245, 0.50)',   // WCAG AA 4.5:1 on black

  // System colors — iOS dark mode adaptive variants
  primary: '#0A84FF',              // systemBlue (dark)
  primaryHover: '#409CFF',
  success: '#30D158',              // systemGreen (dark)
  warning: '#FF9F0A',              // systemOrange (dark)
  error: '#FF453A',                // systemRed (dark)
  info: '#64D2FF',                 // systemTeal (dark)
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
