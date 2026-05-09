// src/components/UI.tsx

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from '../utils/theme';
import { INTENSITY_COLORS } from '../constants/healthColors';

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padding?: number;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress, padding = Spacing.lg }) => {
  const content = (
    <View style={[styles.card, { padding }, style]}>
      {children}
    </View>
  );
  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.75}>{content}</TouchableOpacity>;
  }
  return content;
};

// ─── Button ───────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  style?: ViewStyle;
  fullWidth?: boolean;
  accessibilityHint?: string;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  icon,
  style,
  fullWidth,
  accessibilityHint,
}) => {
  const sizeStyle = buttonSizes[size];
  const variantStyle = buttonVariants[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!(disabled || loading) }}
      accessibilityHint={accessibilityHint}
      style={[
        styles.btn,
        sizeStyle.container,
        variantStyle.container,
        disabled && styles.btnDisabled,
        fullWidth && { width: '100%' },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variantStyle.textColor} />
      ) : (
        <>
          {icon && <Text style={[sizeStyle.icon]}>{icon}</Text>}
          <Text style={[styles.btnText, sizeStyle.text, { color: variantStyle.textColor }]}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const buttonVariants: Record<ButtonVariant, { container: ViewStyle; textColor: string }> = {
  primary: { container: { backgroundColor: Colors.primary }, textColor: Colors.white },
  secondary: { container: { backgroundColor: Colors.primaryMuted, borderWidth: 0 }, textColor: Colors.primary },
  ghost: { container: { backgroundColor: 'transparent' }, textColor: Colors.textSecondary },
  danger: { container: { backgroundColor: Colors.danger }, textColor: Colors.white },
};

const buttonSizes: Record<ButtonSize, { container: ViewStyle; text: TextStyle; icon: TextStyle }> = {
  sm: { container: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.sm }, text: { fontSize: 13 }, icon: { fontSize: 13, marginRight: 4 } },
  md: { container: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.md }, text: { fontSize: 15 }, icon: { fontSize: 15, marginRight: 6 } },
  lg: { container: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: Radius.lg }, text: { fontSize: 16 }, icon: { fontSize: 16, marginRight: 8 } },
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

interface AvatarProps {
  name: string;
  color: string;
  size?: number;
  emoji?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, color, size = 44, emoji }) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Avatar de ${name}`}
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color + '22',
          borderColor: color + '55',
        },
      ]}
    >
      <Text style={{ fontSize: size * 0.38, color }}>{emoji ?? initials}</Text>
    </View>
  );
};

// ─── Badge ────────────────────────────────────────────────────────────────────

interface BadgeProps {
  label: string;
  color?: string;
  bg?: string;
}

export const Badge: React.FC<BadgeProps> = ({ label, color = Colors.primary, bg }) => (
  <View style={[styles.badge, { backgroundColor: bg ?? color + '20' }]}>
    <Text style={[styles.badgeText, { color }]}>{label}</Text>
  </View>
);

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  emoji: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ emoji, title, subtitle, action }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyEmoji}>{emoji}</Text>
    <Text style={styles.emptyTitle}>{title}</Text>
    {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    {action && (
      <Button label={action.label} onPress={action.onPress} variant="secondary" style={{ marginTop: Spacing.lg }} />
    )}
  </View>
);

// ─── Divider ──────────────────────────────────────────────────────────────────

export const Divider: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.divider, style]} />
);

// ─── SectionHeader ────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  count?: number;
  action?: { label: string; onPress: () => void };
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, count, action }) => (
  <View style={styles.sectionHeader}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {count !== undefined && (
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{count}</Text>
        </View>
      )}
    </View>
    {action && (
      <TouchableOpacity onPress={action.onPress}>
        <Text style={styles.sectionAction}>{action.label}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── IntensityPicker ──────────────────────────────────────────────────────────

interface IntensityPickerProps {
  value: number | null;
  onChange: (v: number) => void;
}


export const IntensityPicker: React.FC<IntensityPickerProps> = ({ value, onChange }) => (
  <View style={styles.intensityRow}>
    {[1, 2, 3, 4, 5].map((n) => (
      <TouchableOpacity
        key={n}
        onPress={() => onChange(n)}
        style={[
          styles.intensityBtn,
          { backgroundColor: value === n ? INTENSITY_COLORS[n - 1] : Colors.border },
        ]}
      >
        <Text style={[styles.intensityLabel, { color: value === n ? Colors.white : Colors.textMuted }]}>
          {n}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.h3,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    textAlign: 'center',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  countBadge: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  intensityRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  intensityBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intensityLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
