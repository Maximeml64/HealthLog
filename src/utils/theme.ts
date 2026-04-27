// src/utils/theme.ts

export const Colors = {
  background: '#FFF8F0',
  surface: '#FFFFFF',
  surfaceAlt: '#FFF0E6',
  border: '#F0E6D8',
  borderStrong: '#DDD0C0',
  text: '#2D2016',
  textSecondary: '#8C7B6B',
  textMuted: '#B8A898',
  primary: '#FF6B6B',
  primaryLight: '#FFE5E5',
  primaryDark: '#E05555',
  accent: '#FF9F43',
  accentLight: '#FFF3E0',
  success: '#1DD1A1',
  successLight: '#E8FFF7',
  warning: '#FECA57',
  warningLight: '#FFFDE7',
  info: '#54A0FF',
  infoLight: '#EBF5FF',
  danger: '#FF6B6B',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
  cardShadow: 'rgba(45, 32, 22, 0.08)',
} as const;

export const Typography = {
  display: {
    fontFamily: undefined, // uses system
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
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
};
