// src/components/EventForm.tsx

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { EventType, Profile, HealthEvent, EVENT_TYPE_ICONS, EVENT_TYPE_LABELS, TEMPERATURE_METHOD_LABELS } from '../types';
import { Colors, Typography, Spacing, Radius } from '../utils/theme';
import { Button, Avatar, IntensityPicker } from './UI';
import { DateTimeField } from './DateTimeField';
import { generateId } from '../utils/helpers';
import { PhotoPicker } from './PhotoPicker';
import { CharCounter } from './CharCounter';
import { safeParseMeta } from '../utils/safeParse';
import * as DraftService from '../services/DraftService';
import type { EventDraft } from '../services/DraftService';
import { LIMITS } from '../constants/limits';
import { COMMON_SYMPTOMS } from '../constants/symptomCatalog';
import { COMMON_MOODS } from '../constants/moodCatalog';
import { COMMON_SLEEP } from '../constants/sleepCatalog';
import { COMMON_DIGESTION } from '../constants/digestionCatalog';
import { COMMON_APPETITE } from '../constants/appetiteCatalog';
import { QuickPickChips, type ChipOption } from './QuickPickChips';
import { haptic } from '../utils/haptics';

interface EventFormProps {
  profile: Profile;
  eventType: EventType;
  initialValues: HealthEvent | null;
  onSave: (event: HealthEvent) => void;
  onCancel?: () => void;
  /**
   * When true (typical for the "new event" flow), the form persists its
   * current state as a draft on every change so an accidental modal close
   * doesn't lose user input. Set false when editing an existing event so
   * we don't pollute the draft slot.
   */
  enableDraft?: boolean;
  /**
   * Optional pre-loaded draft to seed the form fields with. When provided
   * (and there are no `initialValues`), the form uses these values
   * instead of the type-based defaults.
   */
  draftSeed?: EventDraft | null;
}

function getDefaultUnit(type: EventType): string | null {
  if (type === 'temperature') return '°C';
  if (type === 'weight') return 'kg';
  if (type === 'height') return 'cm';
  return null;
}

function parseMeta(metaJson: string | null): Record<string, string> {
  return safeParseMeta<Record<string, string>>(metaJson) ?? {};
}

const TEMP_METHODS = ['oral', 'axillary', 'rectal', 'ear', 'forehead'] as const;
const HAS_NUMERIC: EventType[] = ['temperature', 'weight', 'height'];
const HAS_INTENSITY: EventType[] = ['symptom', 'mood', 'appetite', 'sleep', 'digestion'];

// Event types that benefit from a quick-pick chip catalogue above the
// title field. Each entry yields the chip label + the catalogue itself.
const QUICK_PICK_CATALOG: Partial<Record<EventType, { label: string; options: ChipOption[] }>> = {
  symptom:   { label: 'Symptôme courant', options: COMMON_SYMPTOMS },
  mood:      { label: 'Humeur du moment', options: COMMON_MOODS },
  sleep:     { label: 'Type de nuit',     options: COMMON_SLEEP },
  digestion: { label: 'État digestif',    options: COMMON_DIGESTION },
  appetite:  { label: 'Niveau d\'appétit', options: COMMON_APPETITE },
};

export const EventForm: React.FC<EventFormProps> = ({
  profile,
  eventType,
  initialValues,
  onSave,
  enableDraft = false,
  draftSeed = null,
}) => {
  // Seed precedence: explicit initialValues (edit) > draftSeed (resumed) > defaults.
  const seed = initialValues ?? draftSeed ?? null;
  const isDraftSeed = !initialValues && !!draftSeed;

  const [title, setTitle] = useState(seed?.title ?? EVENT_TYPE_LABELS[eventType]);
  const [note, setNote] = useState(seed?.note ?? '');
  const [numericValue, setNumericValue] = useState(() => {
    if (isDraftSeed && draftSeed) return draftSeed.numeric_value;
    if (initialValues?.numeric_value != null) {
      return String(initialValues.numeric_value).replace('.', ',');
    }
    return '';
  });
  const [intensity, setIntensity] = useState<number | null>(seed?.intensity ?? null);
  const [meta, setMeta] = useState<Record<string, string>>(() => {
    if (isDraftSeed && draftSeed) return draftSeed.meta;
    return parseMeta(initialValues?.metadata_json ?? null);
  });
  const [occurredAt, setOccurredAt] = useState(
    seed?.occurred_at ?? new Date().toISOString()
  );
  const [photos, setPhotos] = useState<string[]>(seed?.photos ?? []);
  // `subtype` carries the canonical symptom code (e.g. "headache") when
  // the user picks a chip on a symptom event. Preserved across edits so
  // tapping save doesn't blank a previously-categorised event.
  const [subtype, setSubtype] = useState<string | null>(initialValues?.subtype ?? null);

  // ── Draft auto-save ────────────────────────────────────────────────────
  // Skipped on the first render so a freshly-loaded draft doesn't re-save
  // itself immediately. Debounced via setTimeout to bunch up keystrokes.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (!enableDraft) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const handle = setTimeout(() => {
      void DraftService.saveDraft({
        profile_id: profile.id,
        event_type: eventType,
        title,
        occurred_at: occurredAt,
        note,
        numeric_value: numericValue,
        intensity,
        meta,
        photos,
        saved_at: new Date().toISOString(),
      });
    }, LIMITS.DRAFT_AUTOSAVE_MS);
    return () => clearTimeout(handle);
  }, [enableDraft, profile.id, eventType, title, occurredAt, note, numericValue, intensity, meta, photos]);

  const handleSave = () => {
    if (!title.trim()) {
      haptic.error();
      Alert.alert('Titre requis', "Merci d'ajouter un titre court.");
      return;
    }

    // Parse defensively: garbage like "abc" or "3,4,5" should NOT persist NaN,
    // which propagates silently into Math.min/max and chart rendering.
    let parsedNumeric: number | null = null;
    if (numericValue.trim()) {
      const v = parseFloat(numericValue.replace(',', '.'));
      if (!Number.isFinite(v)) {
        haptic.error();
        Alert.alert('Valeur invalide', 'Merci de saisir un nombre valide.');
        return;
      }
      parsedNumeric = v;
    }

    const now = new Date().toISOString();
    const event: HealthEvent = initialValues
      ? {
          ...initialValues,
          title: title.trim(),
          occurred_at: occurredAt,
          note: note.trim(),
          numeric_value: parsedNumeric,
          intensity,
          subtype,
          metadata_json: Object.keys(meta).length > 0 ? JSON.stringify(meta) : null,
          photos,
          updated_at: now,
        }
      : {
          id: generateId(),
          profile_id: profile.id,
          event_type: eventType,
          title: title.trim(),
          occurred_at: occurredAt,
          note: note.trim(),
          numeric_value: parsedNumeric,
          unit: getDefaultUnit(eventType),
          intensity,
          subtype,
          metadata_json: Object.keys(meta).length > 0 ? JSON.stringify(meta) : null,
          attachment_uris: [],
          photos,
          created_at: now,
          updated_at: now,
        };

    haptic.success();
    onSave(event);
    if (enableDraft) {
      void DraftService.clearDraft();
    }
  };

  return (
    <KeyboardAwareScrollView
      style={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100 }}
      enableOnAndroid
      enableAutomaticScroll
      extraScrollHeight={Platform.OS === 'ios' ? 100 : 0}
    >
      {/* Profile + type context */}
      <View style={styles.formHeader}>
        <Avatar name={profile.display_name} color={profile.color} size={28} />
        <Text style={styles.formHeaderText}>{profile.display_name}</Text>
        <Text style={styles.formHeaderType}>
          {EVENT_TYPE_ICONS[eventType]} {EVENT_TYPE_LABELS[eventType]}
        </Text>
      </View>

      {/* Date & heure */}
      <DateTimeField
        label="Date et heure"
        mode="datetime"
        value={occurredAt}
        onChange={setOccurredAt}
      />

      {/* Quick-pick chips for symptom / mood / sleep — pre-fills title + subtype */}
      {QUICK_PICK_CATALOG[eventType] && (
        <QuickPickChips
          label={QUICK_PICK_CATALOG[eventType]!.label}
          options={QUICK_PICK_CATALOG[eventType]!.options}
          selectedCode={subtype}
          onPick={(opt) => {
            setSubtype(opt.code);
            setTitle(opt.label);
            haptic.tap();
          }}
          onDeselect={() => setSubtype(null)}
        />
      )}

      {/* Titre */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>
          {QUICK_PICK_CATALOG[eventType] ? 'Titre (modifiable)' : 'Titre'}
        </Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            // Free-typing diverging from the chip → drop the canonical code
            // so the event counts as "Autre" in future stats. We resolve
            // against the active catalogue (symptoms / moods / sleep).
            if (subtype) {
              const catalogue = QUICK_PICK_CATALOG[eventType]?.options ?? [];
              const picked = catalogue.find((o) => o.code === subtype);
              if (!picked || picked.label !== v) setSubtype(null);
            }
          }}
          placeholder={EVENT_TYPE_LABELS[eventType]}
          placeholderTextColor={Colors.textMuted}
          returnKeyType="next"
          autoCapitalize="sentences"
          maxLength={120}
        />
      </View>

      {/* Valeur numérique */}
      {HAS_NUMERIC.includes(eventType) && (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            Valeur {eventType === 'temperature' ? '(°C)' : eventType === 'weight' ? '(kg)' : '(cm)'}
          </Text>
          <TextInput
            style={styles.input}
            value={numericValue}
            onChangeText={setNumericValue}
            keyboardType="decimal-pad"
            placeholder={eventType === 'temperature' ? '37.0' : ''}
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      )}

      {/* Méthode de température */}
      {eventType === 'temperature' && (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Méthode</Text>
          <View style={styles.chipRow}>
            {TEMP_METHODS.map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMeta({ ...meta, method: m })}
                style={[styles.chip, meta.method === m && styles.chipSelected]}
              >
                <Text style={[styles.chipText, meta.method === m && styles.chipTextSelected]}>
                  {TEMPERATURE_METHOD_LABELS[m]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Médicament */}
      {eventType === 'medication' && (
        <>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Médicament</Text>
            <TextInput
              style={styles.input}
              value={meta.medication_name ?? ''}
              onChangeText={(v) => setMeta({ ...meta, medication_name: v })}
              placeholder="Doliprane, Advil…"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="next"
              autoCapitalize="words"
              maxLength={80}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Dosage</Text>
            <TextInput
              style={styles.input}
              value={meta.dosage_text ?? ''}
              onChangeText={(v) => setMeta({ ...meta, dosage_text: v })}
              placeholder="500mg, 1 comprimé…"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="next"
              autoCapitalize="none"
              maxLength={80}
            />
          </View>
        </>
      )}

      {/* Rendez-vous */}
      {eventType === 'appointment' && (
        <>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Praticien</Text>
            <TextInput
              style={styles.input}
              value={meta.practitioner ?? ''}
              onChangeText={(v) => setMeta({ ...meta, practitioner: v })}
              placeholder="Dr Martin, Dentiste…"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="next"
              autoCapitalize="words"
              maxLength={80}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Lieu</Text>
            <TextInput
              style={styles.input}
              value={meta.location ?? ''}
              onChangeText={(v) => setMeta({ ...meta, location: v })}
              placeholder="Adresse, cabinet…"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="next"
              autoCapitalize="words"
              maxLength={120}
            />
          </View>
        </>
      )}

      {/* Intensité */}
      {HAS_INTENSITY.includes(eventType) && (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Intensité</Text>
          <IntensityPicker value={intensity} onChange={setIntensity} />
        </View>
      )}

      {/* Note */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Note (optionnel)</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={note}
          onChangeText={setNote}
          placeholder="Observations, contexte…"
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={3}
          scrollEnabled={false}
          textAlignVertical="top"
          autoCapitalize="sentences"
          maxLength={LIMITS.MAX_NOTE_CHARS}
        />
        <CharCounter value={note} />
      </View>

      {/* Photos */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Photos</Text>
        <PhotoPicker photos={photos} onChange={setPhotos} />
      </View>

      <Button label="Enregistrer" onPress={handleSave} fullWidth style={{ marginBottom: Spacing.xl }} />
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
  },
  formHeaderText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  formHeaderType: { fontSize: 13, color: Colors.textSecondary, marginLeft: 'auto' },
  field: { marginBottom: Spacing.lg },
  fieldLabel: { ...Typography.label, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
    color: Colors.text,
  },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  // Temperature method chips — pure text, distinct from QuickPickChips which
  // are icon-led. Kept inline here to avoid a generic chip component yet.
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  chipText: { fontSize: 13, color: Colors.textSecondary },
  chipTextSelected: { color: Colors.primary, fontWeight: '600' },
});
