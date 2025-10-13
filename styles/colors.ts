export const colors = {
  // Core Colors from theme_1.css
  onyx: '#393d3f',
  white: '#fdfdff',
  silver: '#c6c5b9',
  blueMunsell: '#62929e',

  // Semantic Colors
  background: '#fdfdff',
  foreground: '#393d3f',
  primary: '#007AFF',  // Changed to more vibrant blue for better visibility
  secondary: '#c6c5b9',
  accent: '#62929e',
  muted: '#c6c5b9',

  // Alpha variants for shadows and overlays
  onyxAlpha: (opacity: number) => `rgba(57, 61, 63, ${opacity})`,
  whiteAlpha: (opacity: number) => `rgba(253, 253, 255, ${opacity})`,
  silverAlpha: (opacity: number) => `rgba(198, 197, 185, ${opacity})`,
  blueAlpha: (opacity: number) => `rgba(98, 146, 158, ${opacity})`,
  primaryAlpha: (opacity: number) => `rgba(0, 122, 255, ${opacity})`,

  // Recording states
  recordingRed: '#FF3B30',
  connectingBlue: '#007AFF',

  // Status colors
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#5AC8FA',
} as const;

export type Colors = typeof colors;
