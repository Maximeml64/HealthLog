// src/components/EventForm.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { EventType, Profile, HealthEvent, EVENT_TYPE_ICONS, EVENT_TYPE_LABELS, TEMPERATURE_METHOD_LABELS } from '../types';
import { Colors, Typography, Spacing, Radius } from '../utils/theme';
import { Button, Avatar, IntensityPicker } from './UI';
import { DateTimeField } from './DateTimeField';
import { generateId } from '../utils/helpers';
import { PhotoPicker } from './PhotoPicker';

interface EventFormProps {
  profile: Profile;
  eventType: EventType;
  initialValues: HealthEvent | null;
  onSave: (event: HealthEvent) => void;
  onCancel: () => void;
}

function getDefaultUnit(type: EventType): string | null {
  if (type === 'temperature') return '°C';
  if (type === 'weight') return 'kg';
  if (type === 'height') return 'cm';
  return null;
}

function parseMeta(metaJson: string | null): Record<string, string> {
  if (!metaJson) return {};
  try { return JSON.parse(metaJson); } catch { return {}; }
}

const TEMP_METHODS = ['oral', 'axillary', 'rectal', 'ear', 'forehead'] as const;
const HAS_NUMERIC: EventType[] = ['temperature', 'weight', 'height'];
const HAS_INTENSITY: EventType[] = ['symptom', 'mood', 'appetite', 'sleep', 'digestion'];

export const EventForm: React.FC<EventFormProps> = ({
  profile,
  eventType,
  initialValues,
  onSave,
}) => {
  const [title, setTitle] = useState(initialValues?.title ?? EVENT_TYPE_LABELS[eventType]);
  const [note, setNote] = useState(initialValues?.note ?? '');
  const [numericValue, setNumericValue] = useState(
    initialValues?.numeric_value != null ? String(initialValues.numeric_value).replace('.', ',') : ''
  );
  const [intensity, setIntensity] = useState<number | null>(initialValues?.intensity ?? null);
  const [meta, setMeta] = useState<Record<string, string>>(parseMeta(initialValues?.metadata_json ?? null));
  const [occurredAt, setOccurredAt] = useState(
    initialValues?.occurred_at ?? new Date().toISOString()
  );
  const [photos, setPhotos] = useState<string[]>(initialValues?.photos ?? []);

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Titre requis', "Merci d'ajouter un titre court.");
      return;
    }
    const now = new Date().toISOString();
    const event: HealthEvent = initialValues
      ? {
          ...initialValues,
          title: title.trim(),
          occurred_at: occurredAt,
          note: note.trim(),
          numeric_value: numericValue ? parseFloat(numericValue.replace(',', '.')) : null,
          intensity,
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
          numeric_value: numericValue ? parseFloat(numericValue.replace(',', '.')) : null,
          unit: getDefaultUnit(eventType),
          intensity,
          subtype: null,
          metadata_json: Object.keys(meta).length > 0 ? JSON.stringify(meta) : null,
          attachment_uris: [],
          photos,
          created_at: now,
          updated_at: now,
        };

    onSave(event);
  };

  return (
    <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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

      {/* Titre */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Titre</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder={EVENT_TYPE_LABELS[eventType]}
          placeholderTextColor={Colors.textMuted}
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
        />
      </View>

      {/* Photos */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Photos</Text>
        <PhotoPicker photos={photos} onChange={setPhotos} />
      </View>

      <Button label="Enregistrer" onPress={handleSave} fullWidth style={{ marginBottom: Spacing.xl }} />
      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, padding: Spacing.lg },
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipText: { fontSize: 13, color: Colors.textSecondary },
  chipTextSelected: { color: Colors.primary, fontWeight: '600' },
});
