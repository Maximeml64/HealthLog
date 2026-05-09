// src/screens/AppointmentEditScreen.tsx

import React, { useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMenstrualStore } from '../stores/useMenstrualStore';
import type { PregnancyData } from '../types';
import { DateTimeField } from '../components/DateTimeField';
import { Colors, Radius, Spacing, Typography } from '../utils/theme';
import { generateId } from '../utils/helpers';

// ─── Constants ────────────────────────────────────────────────────────────────

type ApptType = PregnancyData['appointments'][number]['type'];

const APPT_TYPES: Array<{ type: ApptType; label: string; icon: string }> = [
  { type: 'echo_1',        label: 'Écho 1er trim.',  icon: '🔊' },
  { type: 'echo_2',        label: 'Écho 2e trim.',   icon: '🔊' },
  { type: 'echo_3',        label: 'Écho 3e trim.',   icon: '🔊' },
  { type: 'consultation',  label: 'Consultation',    icon: '🩺' },
  { type: 'analysis',      label: 'Analyses',        icon: '🧪' },
  { type: 'other',         label: 'Autre',           icon: '📋' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AppointmentEditScreen() {
  const navigation = useNavigation<any>();
  const { profileId, pregnancyId, appointmentId, prefillType } = useRoute<any>().params as {
    profileId: string; pregnancyId: string; appointmentId?: string; prefillType?: string;
  };

  const { pregnancies, addAppointment, updateAppointment, removeAppointment } = useMenstrualStore();

  const pregnancy = pregnancies.find((p) => p.id === pregnancyId);
  const existing = useMemo(
    () => (appointmentId ? pregnancy?.appointments.find((a) => a.id === appointmentId) : undefined),
    [pregnancy, appointmentId]
  );

  const [apptType, setApptType] = useState<ApptType>(
    (existing?.type ?? prefillType ?? 'consultation') as ApptType
  );
  const [date, setDate] = useState(existing?.date?.slice(0, 10) ?? '');
  const [label, setLabel] = useState(existing?.label ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [errors, setErrors] = useState<{ date?: string }>({});
  const [saving, setSaving] = useState(false);

  const validate = (): boolean => {
    if (!date) { setErrors({ date: 'Date requise' }); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const appt = {
        id: existing?.id ?? generateId(),
        date: `${date}T00:00:00`,
        type: apptType,
        label: label || undefined,
        notes: notes || undefined,
      };
      if (existing) {
        await updateAppointment(pregnancyId, existing.id, appt);
      } else {
        await addAppointment(pregnancyId, appt);
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!existing) return;
    Alert.alert('Supprimer ce rendez-vous ?', 'Action irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        await removeAppointment(pregnancyId, existing.id);
        navigation.goBack();
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
          <Text style={styles.cancel}>Annuler</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{existing ? 'Modifier' : 'Rendez-vous'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} accessibilityRole="button">
          <Text style={[styles.save, saving && { opacity: 0.5 }]}>{saving ? '…' : 'Enregistrer'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={Platform.OS === 'ios' ? 80 : 0}
        showsVerticalScrollIndicator={false}
      >
        {/* Type */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>TYPE</Text>
          <View style={styles.chipGrid}>
            {APPT_TYPES.map(({ type, label: lbl, icon }) => {
              const isActive = type === apptType;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => setApptType(type)}
                >
                  <Text style={styles.chipIcon}>{icon}</Text>
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{lbl}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Date */}
        <DateTimeField
          label="DATE *"
          mode="date"
          value={date || null}
          onChange={(v) => { setDate(v); setErrors({}); }}
        />
        {errors.date && <Text style={styles.fieldError}>{errors.date}</Text>}

        {/* Label */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>LIBELLÉ (optionnel)</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="Ex : Dr Martin, Clinique St-Luc…"
            placeholderTextColor={Colors.textMuted}
            returnKeyType="next"
          />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>NOTES (optionnel)</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes…"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
            maxLength={400}
            textAlignVertical="top"
          />
        </View>

        {/* Delete */}
        {existing && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteBtnText}>🗑️ Supprimer ce rendez-vous</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  cancel: { fontSize: 15, color: Colors.textSecondary },
  title: { ...Typography.h3 },
  save: { fontSize: 15, color: Colors.primary, fontWeight: '700' },
  content: { padding: Spacing.lg },
  section: { marginBottom: Spacing.lg },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, marginBottom: Spacing.xs },
  fieldError: { fontSize: 11, color: Colors.danger, marginTop: 4, marginBottom: Spacing.sm },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.md, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  chipIcon: { fontSize: 14 },
  chipText: { fontSize: 13, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary, fontWeight: '600' },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontSize: 15, color: Colors.text, minHeight: 48,
  },
  notesInput: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md, fontSize: 15, color: Colors.text,
    minHeight: 90, textAlignVertical: 'top',
  },
  deleteBtn: { backgroundColor: Colors.danger, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.xl },
  deleteBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
