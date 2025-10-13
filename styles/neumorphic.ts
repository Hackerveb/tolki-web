import { colors } from './colors';

/**
 * Neumorphic shadow system - converts React Native shadows to CSS box-shadow
 *
 * Neumorphic design uses dual shadows:
 * - Light shadow (top-left): creates highlight effect
 * - Dark shadow (bottom-right): creates depth effect
 */

export interface NeumorphicStyle {
  boxShadow: string;
  background?: string;
}

/**
 * Elevated neumorphic shadow - for buttons and cards that appear raised
 */
export const elevated: NeumorphicStyle = {
  boxShadow: `
    -6px -6px 12px ${colors.whiteAlpha(0.8)},
    6px 6px 12px ${colors.silverAlpha(0.4)}
  `.replace(/\s+/g, ' ').trim(),
  background: colors.background,
};

/**
 * Pressed/inset neumorphic shadow - for active/pressed states
 */
export const pressed: NeumorphicStyle = {
  boxShadow: `
    inset 2px 2px 4px ${colors.silverAlpha(0.3)},
    inset -2px -2px 4px ${colors.whiteAlpha(0.5)}
  `.replace(/\s+/g, ' ').trim(),
  background: colors.background,
};

/**
 * Subtle shadow for cards and containers
 */
export const subtle: NeumorphicStyle = {
  boxShadow: `
    -4px -4px 8px ${colors.whiteAlpha(0.6)},
    4px 4px 8px ${colors.silverAlpha(0.2)}
  `.replace(/\s+/g, ' ').trim(),
  background: colors.background,
};

/**
 * Hover shadow - enhanced elevation on hover
 */
export const hover: NeumorphicStyle = {
  boxShadow: `
    -8px -8px 16px ${colors.whiteAlpha(0.9)},
    8px 8px 16px ${colors.silverAlpha(0.5)}
  `.replace(/\s+/g, ' ').trim(),
  background: colors.background,
};

/**
 * Button shadow - default button elevation
 */
export const button: NeumorphicStyle = {
  boxShadow: `
    -6px -6px 12px ${colors.whiteAlpha(0.8)},
    6px 6px 12px ${colors.silverAlpha(0.4)}
  `.replace(/\s+/g, ' ').trim(),
  background: colors.background,
};

/**
 * Button pressed shadow - active button state
 */
export const buttonPressed: NeumorphicStyle = {
  boxShadow: `
    inset 2px 2px 4px ${colors.silverAlpha(0.4)},
    inset -2px -2px 4px ${colors.whiteAlpha(0.6)}
  `.replace(/\s+/g, ' ').trim(),
  background: colors.background,
};

/**
 * Neumorphic style presets
 */
export const shadows = {
  elevated,
  pressed,
  subtle,
  hover,
  button,
  buttonPressed,
} as const;

/**
 * Generate custom neumorphic shadow
 */
export function createNeumorphicShadow(config: {
  distance?: number;
  blur?: number;
  lightOpacity?: number;
  darkOpacity?: number;
  inset?: boolean;
}): NeumorphicStyle {
  const {
    distance = 6,
    blur = 12,
    lightOpacity = 0.8,
    darkOpacity = 0.4,
    inset = false,
  } = config;

  const insetPrefix = inset ? 'inset ' : '';

  return {
    boxShadow: `
      ${insetPrefix}-${distance}px -${distance}px ${blur}px ${colors.whiteAlpha(lightOpacity)},
      ${insetPrefix}${distance}px ${distance}px ${blur}px ${colors.silverAlpha(darkOpacity)}
    `.replace(/\s+/g, ' ').trim(),
    background: colors.background,
  };
}
