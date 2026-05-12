// src/components/EventCard.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { HealthEvent, Profile, EVENT_TYPE_ICONS, EVENT_TYPE_LABELS, INTENSITY_LABELS } from '../types';
import { Colors, Typography, Spacing, Radius } from '../utils/theme';
import { INTENSITY_COLORS } from '../constants/healthColors';
import { formatDate } from '../utils/helpers';
import { Avatar } from './UI';
import { safeParseMeta } from '../utils/safeParse';

interface EventCardProps {
  event: HealthEvent;
  profile?: Profile;
  onPress?: () => void;
  onLongPress?: () => void;
  showProfile?: boolean;
  compact?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  profile,
  onPress,
  onLongPress,
  showProfile = false,
  compact = false,
}) => {
  const icon = EVENT_TYPE_ICONS[event.event_type] ?? '📝';
  const label = EVENT_TYPE_LABELS[event.event_type] ?? event.event_type;

  const renderValue = () => {
    if (event.event_type === 'temperature' && event.numeric_value !== null) {
      return (
        <View style={styles.valueBadge}>
          <Text style={styles.valueText}>{event.numeric_value.toFixed(1).replace('.', ',')}°C</Text>
        </View>
      );
    }
    if (event.event_type === 'weight' && event.numeric_value !== null) {
      return (
        <View style={[styles.valueBadge, { backgroundColor: Colors.infoLight }]}>
          <Text style={[styles.valueText, { color: Colors.info }]}>{String(event.numeric_value).replace('.', ',')} {event.unit ?? 'kg'}</Text>
        </View>
      );
    }
    if (event.event_type === 'height' && event.numeric_value !== null) {
      return (
        <View style={[styles.valueBadge, { backgroundColor: Colors.accentLight }]}>
          <Text style={[styles.valueText, { color: Colors.accent }]}>{String(event.numeric_value).replace('.', ',')} {event.unit ?? 'cm'}</Text>
        </View>
      );
    }
    if (event.intensity !== null) {
      const c = INTENSITY_COLORS[(event.intensity ?? 1) - 1];
      return (
        <View style={[styles.valueBadge, { backgroundColor: c + '20' }]}>
          <Text style={[styles.valueText, { color: c }]}>{INTENSITY_LABELS[event.intensity ?? 1]}</Text>
        </View>
      );
    }
    return null;
  };

  const parsedMeta = safeParseMeta(event.metadata_json);

  const buildA11yLabel = () => {
    let typeInfo = label;
    if (event.numeric_value !== null) {
      const val = event.numeric_value.toFixed(1).replace('.', ',');
      typeInfo += event.event_type === 'temperature'
        ? ` ${val}°C`
        : ` ${val}${event.unit ? ' ' + event.unit : ''}`;
    }
    if (event.intensity !== null) {
      typeInfo += `, intensité ${event.intensity} sur 5`;
    }
    const parts = [typeInfo, event.title];
    if (profile) parts.push(profile.display_name);
    parts.push(formatDate(event.occurred_at));
    return parts.join(', ');
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={buildA11yLabel()}
      accessibilityHint="Appuyez pour voir les détails"
      style={[styles.card, compact && styles.cardCompact]}
    >
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
          {renderValue()}
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.type}>{label}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.date}>{formatDate(event.occurred_at)}</Text>
        </View>
        {event.event_type === 'medication' && parsedMeta?.medication_name && (
          <Text style={styles.subInfo} numberOfLines={1}>
            💊 {parsedMeta.medication_name}{parsedMeta.dosage_text ? ` — ${parsedMeta.dosage_text}` : ''}
          </Text>
        )}
        {event.event_type === 'appointment' && parsedMeta?.practitioner && (
          <Text style={styles.subInfo} numberOfLines={1}>🏥 {parsedMeta.practitioner}</Text>
        )}
        {event.note && !compact && (
          <Text style={styles.note} numberOfLines={2}>{event.note}</Text>
        )}
        {showProfile && profile && (
          <View style={styles.profileRow}>
            <Avatar name={profile.display_name} color={profile.color} size={18} />
            <Text style={[styles.profileName, { color: profile.color }]}>{profile.display_name}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  cardCompact: {
    padding: Spacing.md,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  title: {
    ...Typography.h3,
    flex: 1,
  },
  valueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  valueText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  type: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  dot: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  date: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  subInfo: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  note: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  profileName: {
    fontSize: 11,
    fontWeight: '600',
  },
});
