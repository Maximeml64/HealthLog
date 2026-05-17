// src/utils/theme.ts
// Design tokens — "Calm Medical": sage green primary, terra rosé accent,
// cream background. Distinct from the bleu-marine + coral seas of other
// health apps; aims for a clinical-but-warm tone.

export const Colors = {
  // ── Backgrounds ─────────────────────────────────────────────────────────
  // Cream-tinted white feels less clinical than #FFFFFF without being beige.
  background: '#FBF8F3',
  backgroundSecondary: '#F4EFE7',
  surface: '#FFFFFF',
  surfaceAlt: '#F4EFE7',

  // ── Borders ──────────────────────────────────────────────────────────────
  border: '#E8E2D5',
  borderStrong: '#D4CCBC',

  // ── Text ─────────────────────────────────────────────────────────────────
  text: '#1A2421',          // gris-vert très sombre, pas un noir froid
  textSecondary: '#5E6A66',
  textMuted: '#9CA59F',

  // ── Primary — sauge profond, calme et distinctif ────────────────────────
  primary: '#3A6E5F',
  primaryLight: '#E8EFEB',  // 8% tint sur cream
  primaryDark: '#2A5045',
  primaryMuted: '#3A6E5F1A',

  // ── Accent — terra rosé pour les CTA chauds ─────────────────────────────
  accent: '#C97A6A',
  accentLight: '#F4E4DF',
  accentDark: '#A35E50',
  accentMuted: '#C97A6A1A',

  // ── Status — versions "calm" : pas de rouge alarme hôpital ─────────────
  success: '#5B8A72',
  successLight: '#E0EBE5',
  warning: '#D08545',
  warningLight: '#F8EAD8',
  error: '#B5544A',
  danger: '#B5544A',
  info: '#5C7A99',
  infoLight: '#E4EAF1',

  // ── Utilities ────────────────────────────────────────────────────────────
  white: '#FFFFFF',
  black: '#1A2421',
  overlay: 'rgba(26, 36, 33, 0.55)',
  cardShadow: 'rgba(26, 36, 33, 0.06)',
} as const;

export const Typography = {
  display: {
    fontSize: 30,
    fontWeight: '700' as const,
    lineHeight: 36,
    color: Colors.text,
    letterSpacing: -0.4,
  },
  h1: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 30,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 26,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  h3: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
    color: Colors.text,
    letterSpacing: -0.1,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
    color: Colors.text,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 16,
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },
  label: {
    fontSize: 11,
    fontWeight: '700' as const,
    lineHeight: 16,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
};

// Shadows kept subtle on purpose: a calm interface doesn't shout for attention.
export const Shadow = {
  sm: {
    shadowColor: '#1A2421',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#1A2421',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#1A2421',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  primary: {
    shadowColor: '#3A6E5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },
};
