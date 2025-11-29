// DEPRECATED: Neumorphic shadows replaced with modern shadow system
// This file re-exports from shadows.ts for backward compatibility

export {
  elevated,
  pressed,
  subtle,
  hover,
  button,
  buttonPressed,
  shadows,
  type ShadowStyle as NeumorphicStyle,
} from './shadows';

// Deprecated: createNeumorphicShadow - use shadowScale directly instead
import { shadowScale, type ShadowStyle } from './shadows';

/**
 * @deprecated Use shadowScale from './shadows' instead
 */
export function createNeumorphicShadow(_config?: {
  distance?: number;
  blur?: number;
  lightOpacity?: number;
  darkOpacity?: number;
  inset?: boolean;
}): ShadowStyle {
  // Return modern shadow instead of neumorphic
  return {
    boxShadow: _config?.inset ? shadowScale.inner : shadowScale.sm,
    background: 'var(--color-surface, #FFFFFF)',
  };
}
