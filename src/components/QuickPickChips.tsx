// src/components/QuickPickChips.tsx
//
// Generic chip picker shared by symptom / mood / sleep event types.
// Tap a chip to pre-fill the event title + persist a stable code in
// HealthEvent.subtype. Tap the same chip again to deselect (the typed
// title is preserved so the user can switch to free-text without
// losing what they already wrote).

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing } from '../utils/theme';

export interface ChipOption {
  /** Stable, language-independent identifier persisted in subtype. */
  code: string;
  /** French display label. */
  label: string;
  /** Emoji icon. */
  icon: string;
}

interface QuickPickChipsProps {
  /** Uppercase label shown above the chip grid (e.g. "SYMPTÔME COURANT"). */
  label: string;
  options: ChipOption[];
  selectedCode: string | null;
  onPick: (option: ChipOption) => void;
  onDeselect: () => void;
  /** Override the default hint copy if you want screen-specific phrasing. */
  hintWhenSelected?: string;
  hintWhenEmpty?: string;
}

export const QuickPickChips: React.FC<QuickPickChipsProps> = ({
  label,
  options,
  selectedCode,
  onPick,
  onDeselect,
  hintWhenSelected = 'Touche à nouveau pour saisir un autre choix.',
  hintWhenEmpty = 'Choisis une option ou saisis-la librement ci-dessous.',
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.row}>
      {options.map((opt) => {
        const selected = selectedCode === opt.code;
        return (
          <TouchableOpacity
            key={opt.code}
            onPress={() => (selected ? onDeselect() : onPick(opt))}
            style={[styles.chip, selected && styles.chipSelected]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={opt.label}
          >
            <Text style={styles.chipIcon}>{opt.icon}</Text>
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
    <Text style={styles.hint}>{selectedCode ? hintWhenSelected : hintWhenEmpty}</Text>
  </View>
);

const styles = StyleSheet.create({
  field: { marginBottom: Spacing.lg },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  chipIcon: { fontSize: 14 },
  chipText: { fontSize: 13, color: Colors.textSecondary },
  chipTextSelected: { color: Colors.primary, fontWeight: '600' },
  hint: {
    marginTop: Spacing.sm,
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 14,
  },
});
