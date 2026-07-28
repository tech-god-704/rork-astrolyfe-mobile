export type ThemeName = 'dark' | 'light';
export type ColorPalette = typeof DARK_COLORS;

/**
 * Dark palette — sampled from the AstroLyfe galaxy-eye artwork. This is the app's
 * default and, until now, its only theme.
 */
const DARK_COLORS = {
  black: '#010102',
  blackViolet: '#050311',
  deepViolet: '#150C33',
  ultraviolet: '#6138A3',
  violetBright: '#9662C6',
  lavender: '#C09AEB',
  lavenderIce: '#EDE4FD',
  electricBlue: '#6FB2FA',
  nebulaMagenta: '#D994F2',

  bg: '#010102',
  bgElevated: '#050311',
  bgCard: 'rgba(218,200,242,0.055)',
  bgCardSolid: '#09051B',
  bgCardBorder: 'rgba(218,200,242,0.14)',
  bgCardHover: 'rgba(218,200,242,0.10)',
  bgInput: 'rgba(218,200,242,0.07)',
  bgInputBorder: 'rgba(218,200,242,0.16)',
  bgInputFocused: 'rgba(97,56,163,0.16)',
  bgInputFocusedBorder: 'rgba(192,154,235,0.68)',
  paper: '#100927',
  paperInk: '#FEFCFF',

  // GlassCard's base fills — the most-used surface in the app, previously hardcoded
  // directly in components/GlassCard.tsx rather than sourced from this palette at all,
  // which meant every card in the app would have rendered as a near-black box on a
  // light background.
  glassCard: 'rgba(9,5,27,0.76)',
  glassCardElevated: 'rgba(21,12,51,0.88)',

  // Bottom tab bar chrome — previously hardcoded in app/(app)/_layout.tsx and never
  // sourced from this palette, so it stayed a solid near-black strip in light mode
  // while every screen above it turned white.
  tabBarBg: 'rgba(1,1,2,0.94)',
  tabBarBorder: 'rgba(218,200,242,0.15)',
  tabBarActive: '#FFFFFF',
  tabBarInactive: 'rgba(218,200,242,0.54)',

  purple: '#6138A3',
  purpleLight: '#B993E1',
  purpleSoft: '#DAC8F2',
  purpleDim: 'rgba(97,56,163,0.19)',
  purpleGlow: 'rgba(150,98,198,0.48)',
  purpleDeep: '#3B2171',

  indigo: '#3B51C4',
  indigoLight: '#6FB2FA',

  accent: '#D994F2',
  accentLight: '#EDC6FB',
  accentDim: 'rgba(217,148,242,0.14)',
  accentGlow: 'rgba(217,148,242,0.32)',

  // Legacy aliases retained for compatibility with category components.
  // They intentionally resolve to violet — there is no yellow/gold UI accent.
  gold: '#9662C6',
  goldLight: '#C09AEB',
  goldDim: 'rgba(150,98,198,0.15)',
  teal: '#6FB2FA',
  tealDim: 'rgba(111,178,250,0.14)',
  success: '#61D1B7',
  successDim: 'rgba(97,209,183,0.14)',
  danger: '#FF647C',
  dangerDim: 'rgba(255,100,124,0.12)',
  blue: '#6FB2FA',
  blueDim: 'rgba(111,178,250,0.14)',

  textPrimary: '#FEFCFF',
  textSecondary: 'rgba(237,228,253,0.76)',
  textMuted: 'rgba(218,200,242,0.50)',
  textFaint: 'rgba(218,200,242,0.27)',
  textInverse: '#05020C',

  gradientStart: '#150C33',
  gradientMid: '#09051B',
  gradientEnd: '#010102',

  shadowPurple: 'rgba(121,76,185,0.30)',
  shadowDark: 'rgba(0,0,0,0.62)',
  overlay: 'rgba(1,1,2,0.82)',
  overlayLight: 'rgba(1,1,2,0.42)',
};

/**
 * Light palette. Same purple/violet/magenta family as dark — only the surfaces (bg,
 * card, input) and text roles flip. Every key here mirrors DARK_COLORS exactly; a
 * missing key would silently render `undefined` wherever it's read.
 */
const LIGHT_COLORS: ColorPalette = {
  black: '#FDFCFF',
  blackViolet: '#F6F3FC',
  deepViolet: '#EDE7F9',
  ultraviolet: '#6138A3',
  violetBright: '#7C4DC4',
  lavender: '#8358C2',
  lavenderIce: '#3B2171',
  electricBlue: '#2F6FD6',
  nebulaMagenta: '#A83FC7',

  bg: '#FDFCFF',
  bgElevated: '#F6F3FC',
  bgCard: 'rgba(97,56,163,0.045)',
  bgCardSolid: '#FFFFFF',
  bgCardBorder: 'rgba(97,56,163,0.14)',
  bgCardHover: 'rgba(97,56,163,0.08)',
  bgInput: 'rgba(97,56,163,0.055)',
  bgInputBorder: 'rgba(97,56,163,0.18)',
  bgInputFocused: 'rgba(97,56,163,0.10)',
  bgInputFocusedBorder: 'rgba(97,56,163,0.55)',
  paper: '#FFFFFF',
  paperInk: '#1A1024',

  glassCard: 'rgba(255,255,255,0.82)',
  glassCardElevated: 'rgba(255,255,255,0.94)',

  tabBarBg: 'rgba(253,252,255,0.94)',
  tabBarBorder: 'rgba(97,56,163,0.14)',
  tabBarActive: '#6138A3',
  tabBarInactive: 'rgba(97,56,163,0.42)',

  purple: '#6138A3',
  purpleLight: '#7C4DC4',
  purpleSoft: '#5A3591',
  purpleDim: 'rgba(97,56,163,0.10)',
  purpleGlow: 'rgba(97,56,163,0.22)',
  purpleDeep: '#3B2171',

  indigo: '#3B51C4',
  indigoLight: '#2F6FD6',

  accent: '#A83FC7',
  accentLight: '#8E2FAE',
  accentDim: 'rgba(168,63,199,0.10)',
  accentGlow: 'rgba(168,63,199,0.22)',

  gold: '#7C4DC4',
  goldLight: '#5A3591',
  goldDim: 'rgba(124,77,196,0.12)',
  teal: '#2F6FD6',
  tealDim: 'rgba(47,111,214,0.12)',
  success: '#1C9A7C',
  successDim: 'rgba(28,154,124,0.12)',
  danger: '#DC2F4E',
  dangerDim: 'rgba(220,47,78,0.10)',
  blue: '#2F6FD6',
  blueDim: 'rgba(47,111,214,0.12)',

  textPrimary: '#1A1024',
  textSecondary: 'rgba(26,16,36,0.72)',
  textMuted: 'rgba(26,16,36,0.50)',
  textFaint: 'rgba(26,16,36,0.30)',
  textInverse: '#FEFCFF',

  gradientStart: '#F3EEFB',
  gradientMid: '#FBF9FE',
  gradientEnd: '#FFFFFF',

  shadowPurple: 'rgba(97,56,163,0.16)',
  shadowDark: 'rgba(26,16,36,0.14)',
  overlay: 'rgba(255,255,255,0.86)',
  overlayLight: 'rgba(255,255,255,0.46)',
};

const PALETTES: Record<ThemeName, ColorPalette> = { dark: DARK_COLORS, light: LIGHT_COLORS };

/**
 * Resolve a palette by name without going through the mutable Colors singleton.
 * ErrorBoundary (a class component) needs this: it reads its resolved theme via
 * static contextType rather than the useThemedStyles hook, so it needs the actual
 * palette values to build its own styles per-render instead of relying on Colors.xxx
 * being current at render time.
 */
export function getPalette(theme: ThemeName): ColorPalette {
  return PALETTES[theme];
}

/**
 * A live, mutable singleton — every screen already does `import Colors from
 * '@/constants/colors'` and reads `Colors.purple` etc. at render time. Rather than
 * migrate every one of those call sites to a context hook, applyTheme() mutates this
 * same object's properties in place: every existing import keeps working unchanged,
 * and ThemeProvider forces a full re-render (see providers/ThemeProvider.tsx) so
 * already-mounted screens re-read the new values on the next render pass.
 */
const Colors: ColorPalette = { ...DARK_COLORS };

export function applyTheme(theme: ThemeName): void {
  Object.assign(Colors, PALETTES[theme]);
}

export default Colors;
