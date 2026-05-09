// src/utils/theme.ts

export const Colors = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  background: '#FFFFFF',
  backgroundSecondary: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F9FF',

  // ── Borders ───────────────────────────────────────────────────────────────
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  // ── Text ──────────────────────────────────────────────────────────────────
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',

  // ── Primary — bleu marine (blue-900) ─────────────────────────────────────
  primary: '#1E3A8A',
  primaryLight: '#1E3A8A',
  primaryDark: '#172554',
  primaryMuted: '#1E3A8A14',

  // ── Accent — alias primary (bleu marine, clés conservées pour compatibilité)
  accent: '#1E3A8A',
  accentLight: '#1E3A8A',
  accentDark: '#172554',
  accentMuted: '#1E3A8A14',

  // ── Status ────────────────────────────────────────────────────────────────
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  danger: '#EF4444',
  info: '#0EA5E9',
  infoLight: '#F0F9FF',

  // ── Utilities ─────────────────────────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
  cardShadow: 'rgba(15, 23, 42, 0.08)',
} as const;

export const Typography = {
  display: {
    fontFamily: undefined,
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    color: Colors.text,
  },
  h1: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 30,
    color: Colors.text,
  },
  h2: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 26,
    color: Colors.text,
  },
  h3: {
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
    color: Colors.text,
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
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
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
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const Shadow = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 8,
  },
  primary: {
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
};
