// TolKI Design Tokens
// Centralized design system values for consistency

/**
 * Typography Scale
 * Based on 1.25 ratio (Major Third)
 */
export const typography = {
  // Headings
  h1: {
    size: '1.5rem',      // 24px
    weight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  },
  h2: {
    size: '1.25rem',     // 20px
    weight: 600,
    lineHeight: 1.4,
    letterSpacing: '-0.01em',
  },
  h3: {
    size: '1.125rem',    // 18px
    weight: 600,
    lineHeight: 1.4,
  },

  // Body text
  body: {
    size: '1rem',        // 16px
    weight: 400,
    lineHeight: 1.6,
  },
  bodySmall: {
    size: '0.875rem',    // 14px
    weight: 400,
    lineHeight: 1.5,
  },

  // UI elements
  label: {
    size: '0.875rem',    // 14px
    weight: 500,
    lineHeight: 1.4,
  },
  caption: {
    size: '0.75rem',     // 12px
    weight: 400,
    lineHeight: 1.4,
  },
  overline: {
    size: '0.6875rem',   // 11px
    weight: 600,
    lineHeight: 1.4,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  },

  // Button text
  button: {
    size: '0.875rem',    // 14px
    weight: 500,
    lineHeight: 1,
    letterSpacing: '0.02em',
  },
} as const;

/**
 * Spacing Scale
 * Based on 4px/8px grid
 */
export const spacing = {
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
} as const;

/**
 * Border Radius Scale
 */
export const radius = {
  none: '0',
  sm: '4px',
  DEFAULT: '8px',
  md: '10px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '9999px',
} as const;

/**
 * Transition presets
 */
export const transitions = {
  fast: '0.1s ease-out',
  default: '0.15s ease-out',
  slow: '0.3s ease-out',
  spring: '0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

/**
 * Z-index scale
 */
export const zIndex = {
  hide: -1,
  base: 0,
  raised: 1,
  dropdown: 10,
  sticky: 100,
  overlay: 200,
  modal: 300,
  popover: 400,
  toast: 500,
  tooltip: 600,
} as const;

/**
 * Container max-widths
 */
export const containers = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1200px',
  '2xl': '1440px',
} as const;

/**
 * Component-specific spacing guidelines
 */
export const componentSpacing = {
  // Buttons
  buttonPaddingX: spacing[4],    // 16px
  buttonPaddingY: spacing[3],    // 12px
  buttonGap: spacing[2],         // 8px

  // Cards
  cardPadding: spacing[6],       // 24px
  cardGap: spacing[4],           // 16px

  // Form elements
  inputPaddingX: spacing[4],     // 16px
  inputPaddingY: spacing[3],     // 12px
  formGap: spacing[4],           // 16px
  labelGap: spacing[2],          // 8px

  // Layout
  sectionGap: spacing[12],       // 48px
  pageMargin: spacing[6],        // 24px
} as const;

// Export all tokens
export const tokens = {
  typography,
  spacing,
  radius,
  transitions,
  zIndex,
  containers,
  componentSpacing,
} as const;

export default tokens;
