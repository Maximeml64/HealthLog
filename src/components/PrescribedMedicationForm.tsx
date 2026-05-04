// src/components/PrescribedMedicationForm.tsx

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  PrescribedMedication,
  MEDICATION_UNITS,
  MEDICATION_UNIT_LABELS,
} from '../types';
import { Colors, Typography, Spacing, Radius } from '../utils/theme';
import { Button } from './UI';
import { DateTimeField } from './DateTimeField';
import { generateId } from '../utils/helpers';

// ─── Props ────────────────────────────────────────────────────────────────────

interface PrescribedMedicationFormProps {
  value: PrescribedMedication;
  onChange: (med: PrescribedMedication) => void;
  onSubmit: (med: PrescribedMedication) => void;
  onCancel?: () => void;
  prescriptionId?: string | null;
  profileId: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isValidTime(t: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(t)) return false;
  const [h, m] = t.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

function sortTimes(times: string[]): string[] {
  return [...times].sort();
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PrescribedMedicationForm: React.FC<PrescribedMedicationFormProps> = ({
  value,
  onChange,
  onSubmit,
  onCancel,
  prescriptionId,
  profileId,
}) => {
  const [error, setError] = useState<string | null>(null);
  const hasEndDate = value.end_date !== null;

  // Stable updater — merges a partial patch with the current value
  const update = useCallback(
    (patch: Partial<PrescribedMedication>) => {
      onChange({ ...value, ...patch });
    },
    [value, onChange]
  );

  // ── intake_times handlers ──

  const handleAddTime = () => {
    update({ intake_times: sortTimes([...value.intake_times, '08:00']) });
  };

  const handleRemoveTime = (idx: number) => {
    if (value.intake_times.length <= 1) return;
    const next = [...value.intake_times];
    next.splice(idx, 1);
    update({ intake_times: next });
  };

  // DateTimeField (mode='time') calls onChange only with a valid HH:MM string
  const handleChangeTime = (idx: number, t: string) => {
    const next = [...value.intake_times];
    next[idx] = t;
    update({ intake_times: sortTimes(next) });
  };

  const handleToggleEndDate = (on: boolean) => {
    // Default end_date to start_date when toggled on
    update({ end_date: on ? value.start_date : null });
  };

  // ── Validation + submit ──

  const handleSubmit = () => {
    setError(null);

    if (!value.name.trim()) {
      setError('Le nom du médicament est obligatoire.');
      return;
    }
    if (!value.dose || value.dose <= 0) {
      setError('La dose doit être supérieure à 0.');
      return;
    }
    if (value.intake_times.length < 1) {
      setError('Ajoutez au moins une heure de prise.');
      return;
    }
    const badTime = value.intake_times.find((t) => !isValidTime(t));
    if (badTime) {
      setError(`Heure invalide : "${badTime}". Format attendu HH:MM (ex. 08:00).`);
      return;
    }
    if (value.end_date && value.end_date < value.start_date) {
      setError('La date de fin doit être postérieure ou égale à la date de début.');
      return;
    }

    const isNew = !value.id;
    const now = new Date().toISOString();
    const finalMed: PrescribedMedication = {
      ...value,
      id: isNew ? generateId() : value.id,
      profile_id: profileId,
      prescription_id: prescriptionId ?? null,
      name: value.name.trim(),
      created_at: isNew ? now : value.created_at,
      updated_at: now,
    };

    onSubmit(finalMed);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <KeyboardAwareScrollView
      style={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      enableOnAndroid
      enableAutomaticScroll
      extraScrollHeight={Platform.OS === 'ios' ? 100 : 0}
    >
      {/* ── Bandeau d'erreur ── */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      ) : null}

      {/* ── Nom du médicament ── */}
      <View style={styles.field}>
        <Text style={styles.label}>Nom du médicament *</Text>
        <TextInput
          style={styles.input}
          value={value.name}
          onChangeText={(t) => update({ name: t })}
          placeholder="Doliprane, Levothyrox, ..."
          placeholderTextColor={Colors.textMuted}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="next"
        />
      </View>

      {/* ── Dose ── */}
      <View style={styles.field}>
        <Text style={styles.label}>Dose *</Text>
        <TextInput
          style={[styles.input, styles.doseInput]}
          value={value.dose > 0 ? String(value.dose) : ''}
          onChangeText={(t) => {
            const n = parseFloat(t.replace(',', '.'));
            update({ dose: isNaN(n) ? 0 : n });
          }}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={Colors.textMuted}
          accessibilityLabel="Dose"
        />
      </View>

      {/* ── Unité (chips, même pattern que temperature method dans EventForm) ── */}
      <View style={styles.field}>
        <Text style={styles.label}>Unité</Text>
        <View style={styles.chipRow}>
          {MEDICATION_UNITS.map((u) => (
            <TouchableOpacity
              key={u}
              onPress={() => update({ unit: u })}
              style={[styles.chip, value.unit === u && styles.chipSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected: value.unit === u }}
              accessibilityLabel={MEDICATION_UNIT_LABELS[u]}
            >
              <Text style={[styles.chipText, value.unit === u && styles.chipTextSelected]}>
                {MEDICATION_UNIT_LABELS[u]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Heures de prise ── */}
      <View style={styles.field}>
        <Text style={styles.label}>Heures de prise *</Text>
        {value.intake_times.map((t, idx) => (
          <View key={idx} style={styles.timeRow}>
            {/*
              DateTimeField mode='time' :
              - value = HH:MM string
              - onChange appelé uniquement sur saisie complète valide
              - label = "Prise N" pour chaque entrée (évite le label vide qui décale le layout)
            */}
            <View style={styles.timeFieldWrap}>
              <DateTimeField
                label={`Prise ${idx + 1}`}
                mode="time"
                value={t}
                onChange={(v) => handleChangeTime(idx, v)}
              />
            </View>
            <TouchableOpacity
              onPress={() => handleRemoveTime(idx)}
              disabled={value.intake_times.length <= 1}
              style={[
                styles.removeBtn,
                value.intake_times.length <= 1 && styles.removeBtnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Supprimer la prise ${idx + 1}`}
              accessibilityState={{ disabled: value.intake_times.length <= 1 }}
            >
              <Text style={styles.removeBtnText}>−</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity
          onPress={handleAddTime}
          style={styles.addTimeBtn}
          accessibilityRole="button"
          accessibilityLabel="Ajouter une heure de prise"
        >
          <Text style={styles.addTimeBtnText}>+ Ajouter une heure</Text>
        </TouchableOpacity>
      </View>

      {/* ── Date de début ── */}
      <DateTimeField
        label="Date de début *"
        mode="date"
        value={value.start_date}
        onChange={(d) => update({ start_date: d })}
      />

      {/* ── Date de fin (optionnelle) ── */}
      <View style={styles.field}>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Définir une date de fin</Text>
          <Switch
            value={hasEndDate}
            onValueChange={handleToggleEndDate}
            trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
            thumbColor={hasEndDate ? Colors.primary : Colors.textMuted}
          />
        </View>
        {hasEndDate && (
          <View style={styles.endDateField}>
            <DateTimeField
              label="Date de fin"
              mode="date"
              value={value.end_date}
              onChange={(d) => update({ end_date: d })}
            />
          </View>
        )}
      </View>

      {/* ── Switch actif / inactif ── */}
      <View style={[styles.field, styles.switchRow]}>
        <View style={styles.switchLabels}>
          <Text style={styles.switchTitle}>Médicament actif</Text>
          <Text style={styles.switchSub}>Rappels programmés</Text>
        </View>
        <Switch
          value={value.active}
          onValueChange={(v) => update({ active: v })}
          trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
          thumbColor={value.active ? Colors.primary : Colors.textMuted}
          accessibilityLabel="Médicament actif"
          accessibilityHint="Désactiver met les rappels en pause sans supprimer le médicament"
        />
      </View>

      {/* ── Boutons ── */}
      <Button
        label="Enregistrer"
        onPress={handleSubmit}
        fullWidth
        style={{ marginTop: Spacing.md, marginBottom: Spacing.sm }}
      />
      {onCancel && (
        <Button
          label="Annuler"
          onPress={onCancel}
          variant="ghost"
          fullWidth
        />
      )}
    </KeyboardAwareScrollView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },

  errorBanner: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.danger + '55',
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },

  field: { marginBottom: Spacing.lg },
  label: {
    ...Typography.label,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
    color: Colors.text,
    minHeight: 48,
  },
  doseInput: {
    width: 120,
  },

  // Unit chips — same pattern as temperature chips in EventForm
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  chipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },

  // Intake times list
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end', // aligns remove button with the bottom of the DateTimeField input
    gap: Spacing.sm,
  },
  timeFieldWrap: {
    flex: 1,
  },
  removeBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    // Offset by DateTimeField's wrapper marginBottom so the button sits at the input level
    marginBottom: Spacing.lg,
  },
  removeBtnDisabled: {
    opacity: 0.3,
  },
  removeBtnText: {
    fontSize: 22,
    lineHeight: 24,
    color: Colors.danger,
    fontWeight: '600',
  },
  addTimeBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  addTimeBtnText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },

  // End date
  endDateField: {
    marginTop: Spacing.md,
  },

  // Switches
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabels: {
    flex: 1,
    marginRight: Spacing.md,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  switchSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
