// TolKI Enterprise Shadow System
// Modern, professional shadows replacing neumorphic design

export interface ShadowStyle {
  boxShadow: string;
  background?: string;
}

/**
 * Shadow scale - Modern elevation system
 * Clean single-direction shadows for professional appearance
 */
export const shadowScale = {
  none: 'none',
  xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 8px 10px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px rgba(0, 0, 0, 0.15)',
  inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
} as const;

/**
 * Dark mode shadows - slightly more visible
 */
export const shadowScaleDark = {
  none: 'none',
  xs: '0 1px 2px rgba(0, 0, 0, 0.2)',
  sm: '0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',
  md: '0 4px 6px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.3), 0 4px 6px rgba(0, 0, 0, 0.2)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.3), 0 8px 10px rgba(0, 0, 0, 0.15)',
  '2xl': '0 25px 50px rgba(0, 0, 0, 0.4)',
  inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.15)',
} as const;

// ============================================
// Backward compatible exports (same names as neumorphic.ts)
// ============================================

/**
 * Elevated shadow - for buttons and cards that appear raised
 * Replaces neumorphic dual-shadow with clean single shadow
 */
export const elevated: ShadowStyle = {
  boxShadow: shadowScale.sm,
  background: 'var(--color-surface, #FFFFFF)',
};

/**
 * Pressed/inset shadow - for active/pressed states
 */
export const pressed: ShadowStyle = {
  boxShadow: shadowScale.inner,
  background: 'var(--color-surface, #FFFFFF)',
};

/**
 * Subtle shadow for cards and containers
 */
export const subtle: ShadowStyle = {
  boxShadow: shadowScale.xs,
  background: 'var(--color-surface, #FFFFFF)',
};

/**
 * Hover shadow - enhanced elevation on hover
 */
export const hover: ShadowStyle = {
  boxShadow: shadowScale.md,
  background: 'var(--color-surface, #FFFFFF)',
};

/**
 * Button shadow - default button elevation
 */
export const button: ShadowStyle = {
  boxShadow: shadowScale.sm,
  background: 'var(--color-surface, #FFFFFF)',
};

/**
 * Button pressed shadow - active button state
 */
export const buttonPressed: ShadowStyle = {
  boxShadow: shadowScale.inner,
  background: 'var(--color-surface, #FFFFFF)',
};

/**
 * Shadow presets - backward compatible with neumorphic.ts
 */
export const shadows = {
  elevated,
  pressed,
  subtle,
  hover,
  button,
  buttonPressed,
  // New scale-based shadows
  scale: shadowScale,
  scaleDark: shadowScaleDark,
} as const;

/**
 * Border utilities for subtle separation (enterprise pattern)
 * Often better than shadows for light elevation
 */
export const borders = {
  subtle: '1px solid var(--color-border, #E2E8F0)',
  default: '1px solid var(--color-border-strong, #CBD5E1)',
  strong: '1px solid var(--color-border-strong, #94A3B8)',
  focus: '2px solid var(--color-primary, #2563EB)',
} as const;

// Re-export for backward compatibility
export type NeumorphicStyle = ShadowStyle;
